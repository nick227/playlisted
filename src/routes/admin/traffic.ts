import { Prisma } from "@prisma/client";
import { Router } from "express";

import { rangeToDate, type ChartRange } from "../../lib/chartRange.js";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin } from "../../lib/requireAdmin.js";

export const adminTrafficRouter = Router();

function createdAtRange(since: Date | null) {
  return since ? { createdAt: { gte: since } } : {};
}

function createdAtSql(since: Date | null, tableAlias = "") {
  if (!since) return Prisma.empty;
  const prefix = tableAlias ? Prisma.raw(`${tableAlias}.`) : Prisma.empty;
  return Prisma.sql`WHERE ${prefix}createdAt >= ${since}`;
}

function rate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

function percentile(values: number[], pct: number) {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * pct) - 1));
  return values[index] ?? 0;
}

function trafficCreatedAtSql(since: Date | null) {
  return since ? Prisma.sql`AND createdAt >= ${since}` : Prisma.empty;
}

function isMissingTrafficEventTable(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return true;
  }
  return error instanceof Error && /TrafficEvent|trafficevent|does not exist/i.test(error.message);
}

async function getTrafficEventStats(since: Date | null, realtimeSince: Date) {
  const trafficWhere = { eventType: "REQUEST", ...createdAtRange(since) };
  const humanTrafficWhere = { ...trafficWhere, isBot: false };

  try {
    const [
      requestCount,
      humanRequestCount,
      botRequestCount,
      errorRequestCount,
      uniqueVisitors,
      activeVisitors,
      trafficLatency,
      trafficBytes,
      topRoutes,
    ] = await Promise.all([
      prisma.trafficEvent.count({ where: trafficWhere }),
      prisma.trafficEvent.count({ where: humanTrafficWhere }),
      prisma.trafficEvent.count({ where: { ...trafficWhere, isBot: true } }),
      prisma.trafficEvent.count({ where: { ...humanTrafficWhere, status: { gte: 400 } } }),
      prisma.trafficEvent
        .findMany({
          where: { ...humanTrafficWhere, visitorId: { not: null } },
          distinct: ["visitorId"],
          select: { visitorId: true },
        })
        .then((rows) => rows.length),
      prisma.trafficEvent
        .findMany({
          where: {
            eventType: "REQUEST",
            isBot: false,
            visitorId: { not: null },
            createdAt: { gte: realtimeSince },
          },
          distinct: ["visitorId"],
          select: { visitorId: true },
        })
        .then((rows) => rows.length),
      prisma.trafficEvent.findMany({
        where: { ...humanTrafficWhere, latencyMs: { not: null } },
        select: { latencyMs: true },
        orderBy: { latencyMs: "asc" },
        take: 5000,
      }),
      prisma.trafficEvent.aggregate({
        where: humanTrafficWhere,
        _sum: { bytesSent: true },
      }),
      prisma.$queryRaw<
        {
          path: string;
          method: string | null;
          requests: bigint;
          avgLatencyMs: number | null;
          errors: bigint;
        }[]
      >(
        Prisma.sql`
          SELECT
            path,
            method,
            COUNT(*) AS requests,
            AVG(latencyMs) AS avgLatencyMs,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
          FROM TrafficEvent
          WHERE eventType = 'REQUEST'
          AND isBot = FALSE
          ${trafficCreatedAtSql(since)}
          GROUP BY path, method
          ORDER BY requests DESC
          LIMIT 10`,
      ),
    ]);

    const latencyValues = trafficLatency
      .map((row) => row.latencyMs)
      .filter((value): value is number => typeof value === "number");
    const avgLatencyMs = latencyValues.length
      ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
      : 0;

    return {
      requestCount,
      humanRequestCount,
      botRequestCount,
      errorRequestCount,
      uniqueVisitors,
      activeVisitors,
      avgLatencyMs,
      p95LatencyMs: percentile(latencyValues, 0.95),
      bandwidthBytes: Number(trafficBytes._sum.bytesSent ?? 0n),
      topRoutes,
      instrumentationReady: true,
    };
  } catch (error) {
    if (!isMissingTrafficEventTable(error)) {
      throw error;
    }

    return {
      requestCount: 0,
      humanRequestCount: 0,
      botRequestCount: 0,
      errorRequestCount: 0,
      uniqueVisitors: 0,
      activeVisitors: 0,
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      bandwidthBytes: 0,
      topRoutes: [],
      instrumentationReady: false,
    };
  }
}

adminTrafficRouter.get("/", async (req, res, next) => {
  try {
    if (!(await requireAdmin(req, res))) return;

    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const since = rangeToDate(range);
    const now = new Date();
    const activeSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const realtimeSince = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      profileViews,
      knownUniqueProfileViewers,
      anonymousProfileViews,
      plays,
      anonymousPlays,
      playSeconds,
      playlistSaves,
      recordingSaves,
      follows,
      activeSessions,
      totalUsers,
      sessionRows,
      trafficStats,
    ] = await Promise.all([
      prisma.profileViewEvent.count({ where: createdAtRange(since) }),
      prisma.profileViewEvent
        .findMany({
          where: { viewerId: { not: null }, ...createdAtRange(since) },
          distinct: ["viewerId"],
          select: { viewerId: true },
        })
        .then((rows) => rows.length),
      prisma.profileViewEvent.count({ where: { viewerId: null, ...createdAtRange(since) } }),
      prisma.playbackEvent.count({ where: createdAtRange(since) }),
      prisma.playbackEvent.count({ where: { userId: null, ...createdAtRange(since) } }),
      prisma.playbackEvent.aggregate({ where: createdAtRange(since), _sum: { playedSeconds: true } }),
      prisma.playlistSave.count({ where: createdAtRange(since) }),
      prisma.recordingSave.count({ where: createdAtRange(since) }),
      prisma.userFollow.count({ where: createdAtRange(since) }),
      prisma.session.count({
        where: {
          revokedAt: null,
          expiresAt: { gt: now },
          OR: [{ lastUsedAt: { gte: activeSince } }, { createdAt: { gte: activeSince } }],
        },
      }),
      prisma.user.count(),
      prisma.session.findMany({
        where: { lastUsedAt: { not: null }, ...createdAtRange(since) },
        select: { createdAt: true, lastUsedAt: true },
        take: 500,
        orderBy: { createdAt: "desc" },
      }),
      getTrafficEventStats(since, realtimeSince),
    ]);

    const engagementActions = plays + playlistSaves + recordingSaves + follows;
    const avgSessionSeconds =
      sessionRows.length > 0
        ? Math.round(
            sessionRows.reduce((sum, session) => {
              const lastUsedAt = session.lastUsedAt ?? session.createdAt;
              const elapsedSeconds = Math.max(0, Math.round((lastUsedAt.getTime() - session.createdAt.getTime()) / 1000));
              return sum + Math.min(elapsedSeconds, 30 * 60);
            }, 0) / sessionRows.length,
          )
        : 0;
    const totalPlaySeconds = playSeconds._sum.playedSeconds ?? 0;
    const uniqueViewsEstimate = knownUniqueProfileViewers + anonymousProfileViews;

    const [
      dailyProfileViews,
      dailyPlays,
      topProfiles,
      referrers,
      playsByUser,
      profileViewsByViewer,
      playlistSavesByUser,
      recordingSavesByUser,
      followsByUser,
    ] = await Promise.all([
      prisma.$queryRaw<{ day: string; views: bigint }[]>(
        Prisma.sql`
          SELECT DATE(createdAt) AS day, COUNT(*) AS views
          FROM ProfileViewEvent
          ${createdAtSql(since)}
          GROUP BY day
          ORDER BY day ASC`,
      ),
      prisma.$queryRaw<{ day: string; plays: bigint }[]>(
        Prisma.sql`
          SELECT DATE(createdAt) AS day, COUNT(*) AS plays
          FROM PlaybackEvent
          ${createdAtSql(since)}
          GROUP BY day
          ORDER BY day ASC`,
      ),
      prisma.profileViewEvent.groupBy({
        by: ["profileUserId"],
        where: createdAtRange(since),
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.profileViewEvent.groupBy({
        by: ["referrer"],
        where: createdAtRange(since),
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.playbackEvent.groupBy({
        by: ["userId"],
        where: { userId: { not: null }, ...createdAtRange(since) },
        _count: { id: true },
        _max: { createdAt: true },
      }),
      prisma.profileViewEvent.groupBy({
        by: ["viewerId"],
        where: { viewerId: { not: null }, ...createdAtRange(since) },
        _count: { id: true },
        _max: { createdAt: true },
      }),
      prisma.playlistSave.groupBy({
        by: ["userId"],
        where: createdAtRange(since),
        _count: { id: true },
        _max: { createdAt: true },
      }),
      prisma.recordingSave.groupBy({
        by: ["userId"],
        where: createdAtRange(since),
        _count: { id: true },
        _max: { createdAt: true },
      }),
      prisma.userFollow.groupBy({
        by: ["followerId"],
        where: createdAtRange(since),
        _count: { id: true },
        _max: { createdAt: true },
      }),
    ]);

    const topProfileIds = topProfiles.map((row) => row.profileUserId);
    const topProfileUsers = topProfileIds.length
      ? await prisma.user.findMany({
          where: { id: { in: topProfileIds } },
          select: { id: true, username: true, displayName: true },
        })
      : [];
    const topProfileMap = new Map(topProfileUsers.map((user) => [user.id, user]));
    const consumers = new Map<
      string,
      {
        plays: number;
        profileViews: number;
        saves: number;
        follows: number;
        lastActivityAt: Date | null;
      }
    >();

    function touchConsumer(
      userId: string | null,
      field: "plays" | "profileViews" | "saves" | "follows",
      count: number,
      lastActivityAt: Date | null,
    ) {
      if (!userId) return;
      const current = consumers.get(userId) ?? {
        plays: 0,
        profileViews: 0,
        saves: 0,
        follows: 0,
        lastActivityAt: null,
      };
      current[field] += count;
      if (lastActivityAt && (!current.lastActivityAt || lastActivityAt > current.lastActivityAt)) {
        current.lastActivityAt = lastActivityAt;
      }
      consumers.set(userId, current);
    }

    for (const row of playsByUser) touchConsumer(row.userId, "plays", row._count.id, row._max.createdAt);
    for (const row of profileViewsByViewer) touchConsumer(row.viewerId, "profileViews", row._count.id, row._max.createdAt);
    for (const row of playlistSavesByUser) touchConsumer(row.userId, "saves", row._count.id, row._max.createdAt);
    for (const row of recordingSavesByUser) touchConsumer(row.userId, "saves", row._count.id, row._max.createdAt);
    for (const row of followsByUser) touchConsumer(row.followerId, "follows", row._count.id, row._max.createdAt);

    const topConsumerRows = [...consumers.entries()]
      .map(([userId, stats]) => ({
        userId,
        ...stats,
        totalActions: stats.plays + stats.profileViews + stats.saves + stats.follows,
      }))
      .sort((a, b) => b.totalActions - a.totalActions)
      .slice(0, 10);
    const topConsumerUsers = topConsumerRows.length
      ? await prisma.user.findMany({
          where: { id: { in: topConsumerRows.map((row) => row.userId) } },
          select: { id: true, username: true, displayName: true, role: true },
        })
      : [];
    const topConsumerMap = new Map(topConsumerUsers.map((user) => [user.id, user]));
    return res.json({
      range,
      caveat: totalUsers <= 1
        ? "This site currently has one registered user, so traffic metrics are mostly your own developer activity."
        : "Traffic metrics are based on the events currently captured by the app.",
      totals: {
        profilePageViews: profileViews,
        uniqueProfileViewsEstimate: uniqueViewsEstimate,
        knownUniqueProfileViewers,
        anonymousProfileViews,
        anonymousPlays,
        guestActions: anonymousProfileViews + anonymousPlays,
        plays,
        engagementActions,
        clickthroughRateEstimate: rate(engagementActions, profileViews),
        totalPlaySeconds,
        avgKnownSessionSeconds: avgSessionSeconds,
        activeSessions,
        registeredUsers: totalUsers,
        requests: trafficStats.requestCount,
        humanRequests: trafficStats.humanRequestCount,
        botRequests: trafficStats.botRequestCount,
        uniqueVisitors: trafficStats.uniqueVisitors,
        activeVisitors: trafficStats.activeVisitors,
        errorRequests: trafficStats.errorRequestCount,
        errorRate: rate(trafficStats.errorRequestCount, trafficStats.humanRequestCount),
        avgLatencyMs: trafficStats.avgLatencyMs,
        p95LatencyMs: trafficStats.p95LatencyMs,
        bandwidthBytes: trafficStats.bandwidthBytes,
      },
      dailyProfileViews: dailyProfileViews.map((row) => ({ day: String(row.day), views: Number(row.views) })),
      dailyPlays: dailyPlays.map((row) => ({ day: String(row.day), plays: Number(row.plays) })),
      topProfiles: topProfiles.map((row) => {
        const profile = topProfileMap.get(row.profileUserId);
        return {
          userId: row.profileUserId,
          username: profile?.username ?? "unknown",
          displayName: profile?.displayName ?? "Unknown profile",
          views: row._count.id,
        };
      }),
      referrers: referrers.map((row) => ({
        referrer: row.referrer || "Direct / unknown",
        views: row._count.id,
      })),
      topConsumers: topConsumerRows.map((row) => {
        const user = topConsumerMap.get(row.userId);
        return {
          userId: row.userId,
          username: user?.username ?? "unknown",
          displayName: user?.displayName ?? "Unknown user",
          role: user?.role ?? "LISTENER",
          plays: row.plays,
          profileViews: row.profileViews,
          saves: row.saves,
          follows: row.follows,
          totalActions: row.totalActions,
          lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
        };
      }),
      topRoutes: trafficStats.topRoutes.map((row) => ({
        path: row.path,
        method: row.method ?? "GET",
        requests: Number(row.requests),
        avgLatencyMs: Math.round(row.avgLatencyMs ?? 0),
        errors: Number(row.errors),
        errorRate: rate(Number(row.errors), Number(row.requests)),
      })),
      limitations: [
        trafficStats.instrumentationReady
          ? "New request instrumentation records API, upload, and page requests from this deployment forward."
          : "Request instrumentation is configured but the TrafficEvent table has not been created yet.",
        "Anonymous visitor ids are first-party identifiers, so they improve guest grouping without revealing identity.",
        "Logged-in activity can be grouped by user; guest activity can now be grouped by visitor id.",
        "Time on site is estimated from bounded session reuse and observed playback time, not precise browser presence.",
        "Generic clickthrough is estimated from downstream actions: plays, saves, and follows.",
      ],
    });
  } catch (error) {
    next(error);
  }
});
