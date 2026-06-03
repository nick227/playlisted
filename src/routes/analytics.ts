import { Prisma } from "@prisma/client";
import { Router } from "express";

import { rangeToDate, type ChartRange } from "../lib/chartRange.js";
import { normalizeUploadUrl, resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";

export const analyticsRouter = Router();

const COMPLETION_THRESHOLD = 0.9;

function deltaPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function completionRate(plays: number, completions: number): number {
  return plays > 0 ? Math.round((completions / plays) * 1000) / 10 : 0;
}

function completionEligibleWhere<T extends object>(where: T) {
  return {
    ...where,
    OR: [{ completed: true }, { playedSeconds: { gt: 0 } }],
  };
}

function createdAtRange(since: Date | null, before?: Date) {
  return since ? { createdAt: { gte: since, ...(before ? { lt: before } : {}) } } : {};
}

function playbackCreatedAtSql(since: Date | null, before?: Date) {
  if (since && before) return Prisma.sql`AND pe.createdAt >= ${since} AND pe.createdAt < ${before}`;
  if (since) return Prisma.sql`AND pe.createdAt >= ${since}`;
  return Prisma.empty;
}

function generousCompletionSql() {
  return Prisma.sql`
    (
      pe.completed = TRUE
      OR (
        r.durationSeconds IS NOT NULL
        AND r.durationSeconds > 0
        AND pe.playedSeconds IS NOT NULL
        AND pe.playedSeconds >= CEIL(r.durationSeconds * ${COMPLETION_THRESHOLD})
      )
    )`;
}

async function countGenerousCompletions(recordingIds: string[], since: Date | null, before?: Date) {
  if (recordingIds.length === 0) return 0;
  const rows = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(pe.id) AS count
      FROM PlaybackEvent pe
      INNER JOIN Recording r ON r.id = pe.recordingId
      WHERE pe.recordingId IN (${Prisma.join(recordingIds)})
      ${playbackCreatedAtSql(since, before)}
      AND ${generousCompletionSql()}`
  );
  return Number(rows[0]?.count ?? 0);
}

async function groupGenerousCompletionsByRecording(recordingIds: string[], since: Date | null) {
  if (recordingIds.length === 0) return new Map<string, number>();
  const rows = await prisma.$queryRaw<{ recordingId: string; completions: bigint }[]>(
    Prisma.sql`
      SELECT pe.recordingId, COUNT(pe.id) AS completions
      FROM PlaybackEvent pe
      INNER JOIN Recording r ON r.id = pe.recordingId
      WHERE pe.recordingId IN (${Prisma.join(recordingIds)})
      ${playbackCreatedAtSql(since)}
      AND ${generousCompletionSql()}
      GROUP BY pe.recordingId`
  );
  return new Map(rows.map((row) => [row.recordingId, Number(row.completions)]));
}

async function groupGenerousCompletionsByPlaylist(playlistIds: string[], since: Date | null) {
  if (playlistIds.length === 0) return new Map<string, number>();
  const rows = await prisma.$queryRaw<{ playlistId: string; completions: bigint }[]>(
    Prisma.sql`
      SELECT pe.playlistId, COUNT(pe.id) AS completions
      FROM PlaybackEvent pe
      INNER JOIN Recording r ON r.id = pe.recordingId
      WHERE pe.playlistId IN (${Prisma.join(playlistIds)})
      ${playbackCreatedAtSql(since)}
      AND ${generousCompletionSql()}
      GROUP BY pe.playlistId`
  );
  return new Map(rows.map((row) => [row.playlistId, Number(row.completions)]));
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
    const myPlaylists = await prisma.playlist.findMany({
      where: { ownerId: auth.user.id },
      select: { id: true },
    });
    const myPlaylistIds = myPlaylists.map((p) => p.id);

    const currWhere = {
      recordingId: { in: myRecordingIds },
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    const prevWhere = prevSince
      ? { recordingId: { in: myRecordingIds }, createdAt: { gte: prevSince, lt: since! } }
      : null;

    // Scalar aggregates stay in the database; no event rows are loaded into memory.
    const [
      currentViews, previousViews,
      currStats, currCompleted,
      currCompletionBase,
      prevStats, prevCompleted,
      prevCompletionBase,
      currentPlaylistFavoriteSaves,
      currentRecordingFavoriteSaves,
      previousPlaylistFavoriteSaves,
      previousRecordingFavoriteSaves,
      currentPlaylistLibrarySaves,
      currentRecordingPlaylistAdds,
      previousPlaylistLibrarySaves,
      previousRecordingPlaylistAdds,
      currentPlaylistPlays,
      previousPlaylistPlays,
    ] = await Promise.all([
      prisma.profileViewEvent.count({
        where: { profileUserId: auth.user.id, ...createdAtRange(since) },
      }),
      prevSince
        ? prisma.profileViewEvent.count({
            where: { profileUserId: auth.user.id, ...createdAtRange(prevSince, since!) },
          })
        : Promise.resolve(0),
      prisma.playbackEvent.aggregate({
        where: currWhere,
        _count: { id: true },
        _sum: { playedSeconds: true },
      }),
      countGenerousCompletions(myRecordingIds, since),
      prisma.playbackEvent.count({ where: completionEligibleWhere(currWhere) }),
      prevWhere
        ? prisma.playbackEvent.aggregate({
            where: prevWhere,
            _count: { id: true },
            _sum: { playedSeconds: true },
          })
        : Promise.resolve({ _count: { id: 0 }, _sum: { playedSeconds: null as number | null } }),
      prevWhere ? countGenerousCompletions(myRecordingIds, prevSince!, since!) : Promise.resolve(0),
      prevWhere
        ? prisma.playbackEvent.count({ where: completionEligibleWhere(prevWhere) })
        : Promise.resolve(0),
      prisma.playlistSave.count({
        where: { playlistId: { in: myPlaylistIds }, kind: "FAVORITE", ...createdAtRange(since) },
      }),
      prisma.recordingSave.count({
        where: { recordingId: { in: myRecordingIds }, kind: "FAVORITE", ...createdAtRange(since) },
      }),
      prevSince
        ? prisma.playlistSave.count({
            where: { playlistId: { in: myPlaylistIds }, kind: "FAVORITE", ...createdAtRange(prevSince, since!) },
          })
        : Promise.resolve(0),
      prevSince
        ? prisma.recordingSave.count({
            where: { recordingId: { in: myRecordingIds }, kind: "FAVORITE", ...createdAtRange(prevSince, since!) },
          })
        : Promise.resolve(0),
      prisma.playlistSave.count({
        where: { playlistId: { in: myPlaylistIds }, kind: "LIBRARY", ...createdAtRange(since) },
      }),
      prisma.playlistItem.count({
        where: {
          recordingId: { in: myRecordingIds },
          playlist: { ownerId: { not: auth.user.id } },
          ...createdAtRange(since),
        },
      }),
      prevSince
        ? prisma.playlistSave.count({
            where: { playlistId: { in: myPlaylistIds }, kind: "LIBRARY", ...createdAtRange(prevSince, since!) },
          })
        : Promise.resolve(0),
      prevSince
        ? prisma.playlistItem.count({
            where: {
              recordingId: { in: myRecordingIds },
              playlist: { ownerId: { not: auth.user.id } },
              ...createdAtRange(prevSince, since!),
            },
          })
        : Promise.resolve(0),
      prisma.playbackEvent.count({
        where: { playlistId: { in: myPlaylistIds }, ...createdAtRange(since) },
      }),
      prevSince
        ? prisma.playbackEvent.count({
            where: { playlistId: { in: myPlaylistIds }, ...createdAtRange(prevSince, since!) },
          })
        : Promise.resolve(0),
    ]);

    const currPlays = currStats._count.id;
    const currSeconds = currStats._sum.playedSeconds ?? 0;
    const prevPlays = prevStats._count.id;
    const prevSeconds = prevStats._sum.playedSeconds ?? 0;
    const currentLikes = currentPlaylistFavoriteSaves + currentRecordingFavoriteSaves;
    const previousLikes = previousPlaylistFavoriteSaves + previousRecordingFavoriteSaves;
    const currentFollows = currentPlaylistLibrarySaves + currentRecordingPlaylistAdds;
    const previousFollows = previousPlaylistLibrarySaves + previousRecordingPlaylistAdds;

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
          current: completionRate(currCompletionBase, currCompleted),
          previous: completionRate(prevCompletionBase, prevCompleted),
          changePercent: deltaPercent(
            completionRate(currCompletionBase, currCompleted),
            completionRate(prevCompletionBase, prevCompleted),
          ),
        },
        totalLikes: {
          current: currentLikes,
          previous: previousLikes,
          changePercent: deltaPercent(currentLikes, previousLikes),
        },
        totalFollows: {
          current: currentFollows,
          previous: previousFollows,
          changePercent: deltaPercent(currentFollows, previousFollows),
        },
        playlistPlays: {
          current: currentPlaylistPlays,
          previous: previousPlaylistPlays,
          changePercent: deltaPercent(currentPlaylistPlays, previousPlaylistPlays),
        },
        songAdds: {
          current: currentRecordingPlaylistAdds,
          previous: previousRecordingPlaylistAdds,
          changePercent: deltaPercent(currentRecordingPlaylistAdds, previousRecordingPlaylistAdds),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

analyticsRouter.get("/playlists", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const since = rangeToDate(range);
    const sortBy = (req.query.sortBy as string) ?? "plays";
    const order = ((req.query.order as string) ?? "desc") as "asc" | "desc";
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));

    const myPlaylists = await prisma.playlist.findMany({
      where: { ownerId: auth.user.id },
      select: {
        id: true,
        title: true,
        coverArtUrl: true,
        itemCount: true,
      },
    });

    if (myPlaylists.length === 0) {
      return res.json({ data: [], meta: { page, pageSize, total: 0 } });
    }

    const playlistIds = myPlaylists.map((p) => p.id);
    const baseWhere = {
      playlistId: { in: playlistIds },
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    const [allGrouped, completedMap, completionBaseGrouped, favoriteGrouped, libraryGrouped, topTrackGrouped] =
      await Promise.all([
        prisma.playbackEvent.groupBy({
          by: ["playlistId"],
          where: baseWhere,
          _count: { id: true },
          _sum: { playedSeconds: true },
        }),
        groupGenerousCompletionsByPlaylist(playlistIds, since),
        prisma.playbackEvent.groupBy({
          by: ["playlistId"],
          where: completionEligibleWhere(baseWhere),
          _count: { id: true },
        }),
        prisma.playlistSave.groupBy({
          by: ["playlistId"],
          where: { playlistId: { in: playlistIds }, kind: "FAVORITE", ...createdAtRange(since) },
          _count: { id: true },
        }),
        prisma.playlistSave.groupBy({
          by: ["playlistId"],
          where: { playlistId: { in: playlistIds }, kind: "LIBRARY", ...createdAtRange(since) },
          _count: { id: true },
        }),
        prisma.playbackEvent.groupBy({
          by: ["playlistId", "recordingId"],
          where: baseWhere,
          _count: { id: true },
        }),
      ]);

    const completionBaseMap = new Map(
      completionBaseGrouped
        .filter((e): e is typeof e & { playlistId: string } => e.playlistId != null)
        .map((e) => [e.playlistId, e._count.id]),
    );
    const favoriteMap = new Map(favoriteGrouped.map((e) => [e.playlistId, e._count.id]));
    const libraryMap = new Map(libraryGrouped.map((e) => [e.playlistId, e._count.id]));
    const statsMap = new Map(
      allGrouped
        .filter((e): e is typeof e & { playlistId: string } => e.playlistId != null)
        .map((e) => [
          e.playlistId,
          {
            plays: e._count.id,
            totalSeconds: e._sum.playedSeconds ?? 0,
            completions: completedMap.get(e.playlistId) ?? 0,
            completionBase: completionBaseMap.get(e.playlistId) ?? 0,
          },
        ]),
    );
    const topTrackByPlaylist = new Map<string, { recordingId: string; plays: number }>();
    for (const item of topTrackGrouped) {
      if (!item.playlistId) continue;
      const current = topTrackByPlaylist.get(item.playlistId);
      if (!current || item._count.id > current.plays) {
        topTrackByPlaylist.set(item.playlistId, { recordingId: item.recordingId, plays: item._count.id });
      }
    }
    const topRecordingIds = [...new Set([...topTrackByPlaylist.values()].map((item) => item.recordingId))];
    const topRecordings = topRecordingIds.length
      ? await prisma.recording.findMany({
          where: { id: { in: topRecordingIds } },
          select: { id: true, title: true },
        })
      : [];
    const recordingTitleMap = new Map(topRecordings.map((r) => [r.id, r.title]));

    const rows = myPlaylists.map((playlist) => {
      const stats = statsMap.get(playlist.id);
      const plays = stats?.plays ?? 0;
      const topTrack = topTrackByPlaylist.get(playlist.id);

      return {
        playlistId: playlist.id,
        title: playlist.title,
        coverArtUrl: normalizeUploadUrl(playlist.coverArtUrl),
        trackCount: playlist.itemCount,
        totalPlays: plays,
        totalPlaySeconds: stats?.totalSeconds ?? 0,
        completionRate: completionRate(stats?.completionBase ?? 0, stats?.completions ?? 0),
        likes: favoriteMap.get(playlist.id) ?? 0,
        followers: libraryMap.get(playlist.id) ?? 0,
        topRecordingId: topTrack?.recordingId ?? null,
        topRecordingTitle: topTrack ? recordingTitleMap.get(topTrack.recordingId) ?? null : null,
        topRecordingPlays: topTrack?.plays ?? 0,
      };
    });

    rows.sort((a, b) => {
      const key =
        sortBy === "duration"
          ? "totalPlaySeconds"
          : sortBy === "completion"
          ? "completionRate"
          : sortBy === "likes"
          ? "likes"
          : sortBy === "follows"
          ? "followers"
          : "totalPlays";
      return order === "desc" ? b[key] - a[key] : a[key] - b[key];
    });

    const total = rows.length;
    const paged = rows.slice((page - 1) * pageSize, page * pageSize);

    return res.json({ data: paged, meta: { page, pageSize, total } });
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
        publishedPlaylistId: true,
        title: true,
        artworkUrl: true,
        durationSeconds: true,
        playCount: true,
        publishedPlaylist: { select: { title: true, coverArtUrl: true } },
      },
    });

    if (myRecordings.length === 0) {
      return res.json({ data: [], meta: { page, pageSize, total: 0 } });
    }

    const baseWhere = {
      recordingId: { in: myRecordings.map((r) => r.id) },
      ...(since ? { createdAt: { gte: since } } : {}),
    };

    // DB does the aggregation, not JS.
    const [allGrouped, completedMap, completionBaseGrouped, favoriteGrouped] = await Promise.all([
      prisma.playbackEvent.groupBy({
        by: ["recordingId"],
        where: baseWhere,
        _count: { id: true },
        _sum: { playedSeconds: true },
      }),
      groupGenerousCompletionsByRecording(myRecordings.map((r) => r.id), since),
      prisma.playbackEvent.groupBy({
        by: ["recordingId"],
        where: completionEligibleWhere(baseWhere),
        _count: { id: true },
      }),
      prisma.recordingSave.groupBy({
        by: ["recordingId"],
        where: {
          recordingId: { in: myRecordings.map((r) => r.id) },
          kind: "FAVORITE",
          ...createdAtRange(since),
        },
        _count: { id: true },
      }),
    ]);

    const completionBaseMap = new Map(completionBaseGrouped.map((e) => [e.recordingId, e._count.id]));
    const favoriteMap = new Map(favoriteGrouped.map((e) => [e.recordingId, e._count.id]));
    const statsMap = new Map(
      allGrouped.map((e) => [
        e.recordingId,
        {
          plays: e._count.id,
          totalSeconds: e._sum.playedSeconds ?? 0,
          completions: completedMap.get(e.recordingId) ?? 0,
          completionBase: completionBaseMap.get(e.recordingId) ?? 0,
        },
      ]),
    );

    const rows = myRecordings.map((rec) => {
      const s = statsMap.get(rec.id);
      const plays = s?.plays ?? 0;
      return {
        recordingId: rec.id,
        title: rec.title,
        playlistId: rec.publishedPlaylistId,
        playlistTitle: rec.publishedPlaylist.title,
        artworkUrl: resolveRecordingArtworkUrl(rec, rec.publishedPlaylist),
        durationSeconds: rec.durationSeconds ?? null,
        totalPlays: range === "all" ? rec.playCount : plays,
        totalPlaySeconds: s?.totalSeconds ?? 0,
        completionRate: completionRate(s?.completionBase ?? 0, s?.completions ?? 0),
        likes: favoriteMap.get(rec.id) ?? 0,
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
