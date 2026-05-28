import { Prisma } from "@prisma/client";
import { Router } from "express";

import { rangeToDate, type ChartRange } from "../lib/chartRange.js";
import { prisma } from "../lib/prisma.js";

export const chartsRouter = Router();

function mapTopSongItem(
  r: {
    id: string;
    uploaderId: string;
    publishedPlaylistId: string;
    title: string;
    audioUrl: string;
    artworkUrl: string | null;
    durationSeconds: number | null;
    recordingType: string;
    visibility: string;
    status: string;
    explicit: boolean;
    playCount: number;
    createdAt: Date;
    updatedAt: Date;
    uploader: { id: string; username: string; displayName: string; avatarUrl: string | null; role: string };
    publishedPlaylist: { id: string; title: string; slug: string };
  },
  rank: number,
  playCount: number,
) {
  return {
    rank,
    recordingId: r.id,
    uploaderId: r.uploaderId,
    publishedPlaylistId: r.publishedPlaylistId,
    title: r.title,
    audioUrl: r.audioUrl,
    artworkUrl: r.artworkUrl ?? null,
    durationSeconds: r.durationSeconds ?? null,
    recordingType: r.recordingType,
    visibility: r.visibility,
    status: r.status,
    explicit: r.explicit,
    playCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    uploader: r.uploader,
    playlist: r.publishedPlaylist,
  };
}

chartsRouter.get("/top-songs", async (req, res, next) => {
  try {
    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const since = rangeToDate(range);

    if (range === "all") {
      const recordings = await prisma.recording.findMany({
        where: { visibility: "PUBLIC", status: "PUBLISHED" },
        orderBy: { playCount: "desc" },
        take: limit,
        include: {
          uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
          publishedPlaylist: { select: { id: true, title: true, slug: true } },
        },
      });
      return res.json({
        range,
        data: recordings.map((r, i) => mapTopSongItem(r, i + 1, r.playCount)),
      });
    }

    const grouped = await prisma.playbackEvent.groupBy({
      by: ["recordingId"],
      where: { createdAt: { gte: since! } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const recordingIds = grouped.map((g) => g.recordingId);
    const recordings = await prisma.recording.findMany({
      where: { id: { in: recordingIds }, visibility: "PUBLIC", status: "PUBLISHED" },
      include: {
        uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
        publishedPlaylist: { select: { id: true, title: true, slug: true } },
      },
    });

    const recMap = new Map(recordings.map((r) => [r.id, r]));
    const data = grouped
      .filter((g) => recMap.has(g.recordingId))
      .map((g, i) => {
        const r = recMap.get(g.recordingId)!;
        return mapTopSongItem(r, i + 1, g._count.id);
      });

    return res.json({ range, data });
  } catch (error) {
    return next(error);
  }
});

chartsRouter.get("/top-playlists", async (req, res, next) => {
  try {
    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const since = rangeToDate(range);

    const grouped = await prisma.playbackEvent.groupBy({
      by: ["playlistId"],
      where: {
        playlistId: { not: null },
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const playlistIds = grouped.map((g) => g.playlistId!);
    const playlists = await prisma.playlist.findMany({
      where: { id: { in: playlistIds }, visibility: "PUBLIC", status: "PUBLISHED" },
      include: {
        owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
      },
    });

    const playlistMap = new Map(playlists.map((p) => [p.id, p]));
    const data = grouped
      .filter((g) => g.playlistId && playlistMap.has(g.playlistId))
      .map((g, i) => {
        const p = playlistMap.get(g.playlistId!)!;
        return {
          rank: i + 1,
          playlistId: p.id,
          title: p.title,
          slug: p.slug,
          coverArtUrl: p.coverArtUrl ?? null,
          type: p.type,
          itemCount: p.itemCount,
          totalDurationSeconds: p.totalDurationSeconds,
          playCount: g._count.id,
          owner: p.owner,
        };
      });

    return res.json({ range, data });
  } catch (error) {
    return next(error);
  }
});

chartsRouter.get("/top-artists", async (req, res, next) => {
  try {
    const range = ((req.query.range as string) ?? "30d") as ChartRange;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const since = rangeToDate(range);

    // Single GROUP BY JOIN — avoids loading all events into JS heap
    const rows = await prisma.$queryRaw<{ uploaderId: string; playCount: bigint }[]>(
      since
        ? Prisma.sql`
            SELECT r.uploaderId, COUNT(pe.id) AS playCount
            FROM PlaybackEvent pe
            INNER JOIN Recording r ON r.id = pe.recordingId
            WHERE pe.createdAt >= ${since}
            GROUP BY r.uploaderId
            ORDER BY playCount DESC
            LIMIT ${limit}`
        : Prisma.sql`
            SELECT r.uploaderId, COUNT(pe.id) AS playCount
            FROM PlaybackEvent pe
            INNER JOIN Recording r ON r.id = pe.recordingId
            GROUP BY r.uploaderId
            ORDER BY playCount DESC
            LIMIT ${limit}`,
    );

    const artistIds = rows.map((r) => r.uploaderId);
    const users = await prisma.user.findMany({
      where: { id: { in: artistIds } },
      select: { id: true, username: true, displayName: true, avatarUrl: true, heroImageUrl: true, role: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    const data = rows
      .filter((r) => userMap.has(r.uploaderId))
      .map((r, i) => {
        const u = userMap.get(r.uploaderId)!;
        return {
          rank: i + 1,
          userId: u.id,
          username: u.username,
          displayName: u.displayName,
          avatarUrl: u.avatarUrl ?? null,
          heroImageUrl: u.heroImageUrl ?? null,
          role: u.role,
          playCount: Number(r.playCount),
        };
      });

    return res.json({ range, data });
  } catch (error) {
    return next(error);
  }
});
