import { Router } from "express";

import { rangeToDate, type ChartRange } from "../lib/chartRange.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";

export const analyticsRouter = Router();

function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function completionRate(plays: number, completions: number): number {
  return plays > 0 ? Math.round((completions / plays) * 1000) / 10 : 0;
}

analyticsRouter.get("/summary", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const since = rangeToDate(range);
    const periodMs = since ? Date.now() - since.getTime() : null;
    const prevSince = periodMs ? new Date(Date.now() - periodMs * 2) : null;

    const myRecordings = await prisma.recording.findMany({
      where: { uploaderId: auth.user.id },
      select: { id: true },
    });
    const myRecordingIds = myRecordings.map((r) => r.id);

    if (myRecordingIds.length === 0) {
      return res.json({
        summary: {
          totalPageViews: { current: 0, previous: 0, changePercent: 0 },
          totalPlays: { current: 0, previous: 0, changePercent: 0 },
          totalPlaySeconds: { current: 0, previous: 0, changePercent: 0 },
          avgCompletionRate: { current: 0, previous: 0, changePercent: 0 },
        },
      });
    }

    const currWhere = {
      recordingId: { in: myRecordingIds },
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    const prevWhere = prevSince
      ? { recordingId: { in: myRecordingIds }, createdAt: { gte: prevSince, lt: since! } }
      : null;

    // All six queries run in parallel; each returns a scalar — no event rows in memory
    const [
      currentViews, previousViews,
      currStats, currCompleted,
      prevStats, prevCompleted,
    ] = await Promise.all([
      prisma.profileViewEvent.count({
        where: { profileUserId: auth.user.id, ...(since ? { createdAt: { gte: since } } : {}) },
      }),
      prevSince
        ? prisma.profileViewEvent.count({
            where: { profileUserId: auth.user.id, createdAt: { gte: prevSince, lt: since! } },
          })
        : Promise.resolve(0),
      prisma.playbackEvent.aggregate({
        where: currWhere,
        _count: { id: true },
        _sum: { playedSeconds: true },
      }),
      prisma.playbackEvent.count({ where: { ...currWhere, completed: true } }),
      prevWhere
        ? prisma.playbackEvent.aggregate({
            where: prevWhere,
            _count: { id: true },
            _sum: { playedSeconds: true },
          })
        : Promise.resolve({ _count: { id: 0 }, _sum: { playedSeconds: null as number | null } }),
      prevWhere
        ? prisma.playbackEvent.count({ where: { ...prevWhere, completed: true } })
        : Promise.resolve(0),
    ]);

    const currPlays = currStats._count.id;
    const currSeconds = currStats._sum.playedSeconds ?? 0;
    const prevPlays = prevStats._count.id;
    const prevSeconds = prevStats._sum.playedSeconds ?? 0;

    return res.json({
      summary: {
        totalPageViews: {
          current: currentViews,
          previous: previousViews,
          changePercent: deltaPercent(currentViews, previousViews),
        },
        totalPlays: {
          current: currPlays,
          previous: prevPlays,
          changePercent: deltaPercent(currPlays, prevPlays),
        },
        totalPlaySeconds: {
          current: currSeconds,
          previous: prevSeconds,
          changePercent: deltaPercent(currSeconds, prevSeconds),
        },
        avgCompletionRate: {
          current: completionRate(currPlays, currCompleted),
          previous: completionRate(prevPlays, prevCompleted),
          changePercent: deltaPercent(
            completionRate(currPlays, currCompleted),
            completionRate(prevPlays, prevCompleted),
          ),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

analyticsRouter.get("/recordings", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const since = rangeToDate(range);
    const sortBy = (req.query.sortBy as string) ?? "plays";
    const order = ((req.query.order as string) ?? "desc") as "asc" | "desc";
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

    const myRecordings = await prisma.recording.findMany({
      where: { uploaderId: auth.user.id },
      select: {
        id: true,
        title: true,
        artworkUrl: true,
        durationSeconds: true,
        playCount: true,
        publishedPlaylist: { select: { coverArtUrl: true } },
      },
    });

    if (myRecordings.length === 0) {
      return res.json({ data: [], meta: { page, pageSize, total: 0 } });
    }

    const baseWhere = {
      recordingId: { in: myRecordings.map((r) => r.id) },
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    // Two parallel groupBy queries — DB does the aggregation, not JS
    const [allGrouped, completedGrouped] = await Promise.all([
      prisma.playbackEvent.groupBy({
        by: ["recordingId"],
        where: baseWhere,
        _count: { id: true },
        _sum: { playedSeconds: true },
      }),
      prisma.playbackEvent.groupBy({
        by: ["recordingId"],
        where: { ...baseWhere, completed: true },
        _count: { id: true },
      }),
    ]);

    const completedMap = new Map(completedGrouped.map((e) => [e.recordingId, e._count.id]));
    const statsMap = new Map(
      allGrouped.map((e) => [
        e.recordingId,
        {
          plays: e._count.id,
          totalSeconds: e._sum.playedSeconds ?? 0,
          completions: completedMap.get(e.recordingId) ?? 0,
        },
      ]),
    );

    const rows = myRecordings.map((rec) => {
      const s = statsMap.get(rec.id);
      const plays = s?.plays ?? 0;
      return {
        recordingId: rec.id,
        title: rec.title,
        artworkUrl: resolveRecordingArtworkUrl(rec, rec.publishedPlaylist),
        durationSeconds: rec.durationSeconds ?? null,
        totalPlays: range === "all" ? rec.playCount : plays,
        totalPlaySeconds: s?.totalSeconds ?? 0,
        completionRate: completionRate(plays, s?.completions ?? 0),
      };
    });

    rows.sort((a, b) => {
      const key = sortBy === "plays" ? "totalPlays" : sortBy === "duration" ? "totalPlaySeconds" : "completionRate";
      return order === "desc" ? b[key] - a[key] : a[key] - b[key];
    });

    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize);

    return res.json({ data: paged, meta: { page, pageSize, total } });
  } catch (error) {
    return next(error);
  }
});
