import { Prisma } from "@prisma/client";
import { Router } from "express";

import { rangeToDate, type ChartRange } from "../lib/chartRange.js";
import { effectiveGenreSelect, effectiveGenreWhere, pickDisplayGenre } from "../lib/effectiveGenres.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { BROWSABLE_RECORDING } from "../lib/publicRecordingFilter.js";
import { PUBLIC_PUBLISHED_PLAYLIST } from "../lib/publicPlaylistFilter.js";
import { ACTIVE_USER } from "../lib/publicUserFilter.js";
import { prisma } from "../lib/prisma.js";
import { sendCachedPublicJson } from "../lib/publicJsonCache.js";
import { mapSubtitleSummary, subtitleInclude } from "../lib/subtitles/summary.js";

export const chartsRouter = Router();

const CHART_MAX_LIMIT = 50;

function parseChartLimit(raw: unknown): number {
  return Math.min(CHART_MAX_LIMIT, Math.max(1, Number(raw ?? 20)));
}

/** Extra ranked rows so visibility/status filters can still fill the requested limit. */
function chartCandidateTake(limit: number): number {
  return Math.min(CHART_MAX_LIMIT, Math.max(limit * 4, limit + 10));
}

type GenreRef = { id: string; name: string; slug: string };

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
    publishedPlaylist: {
      id: string;
      title: string;
      slug: string;
      coverArtUrl: string | null;
      owner: { id: string; username: string; displayName: string; avatarUrl: string | null; role: string };
      tags: { tag: { id: string; name: string; slug: string } }[];
    };
    tags?: { tag: { id: string; name: string; slug: string } }[];
    subtitles?: {
      status: "QUEUED" | "PROCESSING" | "READY" | "FAILED";
      language: string | null;
      generatedAt: Date | null;
    }[];
  },
  rank: number,
  playCount: number,
  genreSlug?: string,
) {
  const genre = pickDisplayGenre(r.tags, r.publishedPlaylist.tags, genreSlug);
  const { tags: _playlistTags, ...playlist } = r.publishedPlaylist;
  return {
    rank,
    recordingId: r.id,
    uploaderId: r.uploaderId,
    publishedPlaylistId: r.publishedPlaylistId,
    title: r.title,
    audioUrl: r.audioUrl,
    artworkUrl: resolveRecordingArtworkUrl(r, r.publishedPlaylist),
    durationSeconds: r.durationSeconds ?? null,
    recordingType: r.recordingType,
    visibility: r.visibility,
    status: r.status,
    explicit: r.explicit,
    playCount,
    subtitle: mapSubtitleSummary(r.subtitles),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    uploader: r.uploader,
    playlist,
    genre: genre as GenreRef | null,
  };
}

chartsRouter.get("/top-songs", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "chart-top-songs",
      ttlSeconds: 60,
      staleWhileRevalidateSeconds: 180,
      maxEntries: 100,
    }, async () => {
      const range = ((req.query.range as string) ?? "30d") as ChartRange;
      const limit = parseChartLimit(req.query.limit);
      const genre = req.query.genre as string | undefined;
      const since = rangeToDate(range);

      const where = genre
        ? {
            ...BROWSABLE_RECORDING,
            ...effectiveGenreWhere(genre),
          }
        : BROWSABLE_RECORDING;

      const songTagInclude = {
        tags: effectiveGenreSelect.tags,
      };

      if (range === "all") {
        const recordings = await prisma.recording.findMany({
          where,
          orderBy: { playCount: "desc" },
          take: limit,
          include: {
            uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
            publishedPlaylist: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverArtUrl: true,
                owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
                tags: effectiveGenreSelect.publishedPlaylist.select.tags,
              },
            },
            ...songTagInclude,
            subtitles: subtitleInclude(),
          },
        });
        return {
          range,
          data: recordings.map((r, i) => mapTopSongItem(r, i + 1, r.playCount, genre)),
        };
      }

      const grouped = await prisma.playbackEvent.groupBy({
        by: ["recordingId"],
        where: { createdAt: { gte: since! } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: chartCandidateTake(limit),
      });

      const recordingIds = grouped.map((g) => g.recordingId);
      const recordings = await prisma.recording.findMany({
        where: { id: { in: recordingIds }, ...where },
        include: {
          uploader: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
          publishedPlaylist: {
            select: {
              id: true,
              title: true,
              slug: true,
              coverArtUrl: true,
              owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
              tags: effectiveGenreSelect.publishedPlaylist.select.tags,
            },
          },
          ...songTagInclude,
          subtitles: subtitleInclude(),
        },
      });

      const recMap = new Map(recordings.map((r) => [r.id, r]));
      const data = grouped
        .filter((g) => recMap.has(g.recordingId))
        .slice(0, limit)
        .map((g, i) => {
          const r = recMap.get(g.recordingId)!;
          return mapTopSongItem(r, i + 1, g._count.id, genre);
        });

      return { range, data };
    });
  } catch (error) {
    return next(error);
  }
});

chartsRouter.get("/top-playlists", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "chart-top-playlists",
      ttlSeconds: 60,
      staleWhileRevalidateSeconds: 180,
      maxEntries: 50,
    }, async () => {
      const range = ((req.query.range as string) ?? "30d") as ChartRange;
      const limit = parseChartLimit(req.query.limit);
      const since = rangeToDate(range);

      const grouped = await prisma.playbackEvent.groupBy({
        by: ["playlistId"],
        where: {
          playlistId: { not: null },
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: chartCandidateTake(limit),
      });

      const playlistIds = grouped.map((g) => g.playlistId!);
      const playlists = await prisma.playlist.findMany({
        where: { id: { in: playlistIds }, ...PUBLIC_PUBLISHED_PLAYLIST },
        include: {
          owner: { select: { id: true, username: true, displayName: true, avatarUrl: true, role: true } },
          tags: {
            take: 1,
            where: { tag: { kind: "GENRE" } },
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
        },
      });

      const playlistMap = new Map(playlists.map((p) => [p.id, p]));
      const data = grouped
        .filter((g) => g.playlistId && playlistMap.has(g.playlistId))
        .slice(0, limit)
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
            genre: (p.tags[0]?.tag ?? null) as GenreRef | null,
          };
        });

      return { range, data };
    });
  } catch (error) {
    return next(error);
  }
});

chartsRouter.get("/top-artists", async (req, res, next) => {
  try {
    return await sendCachedPublicJson(req, res, {
      namespace: "chart-top-artists",
      ttlSeconds: 60,
      staleWhileRevalidateSeconds: 180,
      maxEntries: 50,
    }, async () => {
      const range = ((req.query.range as string) ?? "30d") as ChartRange;
      const limit = parseChartLimit(req.query.limit);
      const since = rangeToDate(range);
      const candidateTake = chartCandidateTake(limit);

      // Single GROUP BY JOIN avoids loading all events into JS heap.
      const rows = await prisma.$queryRaw<{ uploaderId: string; playCount: bigint }[]>(
        since
          ? Prisma.sql`
              SELECT r.uploaderId, COUNT(pe.id) AS playCount
              FROM PlaybackEvent pe
              INNER JOIN Recording r ON r.id = pe.recordingId
              WHERE pe.createdAt >= ${since}
              GROUP BY r.uploaderId
              ORDER BY playCount DESC
              LIMIT ${candidateTake}`
          : Prisma.sql`
              SELECT r.uploaderId, COUNT(pe.id) AS playCount
              FROM PlaybackEvent pe
              INNER JOIN Recording r ON r.id = pe.recordingId
              GROUP BY r.uploaderId
              ORDER BY playCount DESC
              LIMIT ${candidateTake}`,
      );

      const artistIds = rows.map((r) => r.uploaderId);
      const users = await prisma.user.findMany({
        where: { id: { in: artistIds }, ...ACTIVE_USER },
        select: { id: true, username: true, displayName: true, avatarUrl: true, heroImageUrl: true, role: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));
      const data = rows
        .filter((r) => userMap.has(r.uploaderId))
        .slice(0, limit)
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

      return { range, data };
    });
  } catch (error) {
    return next(error);
  }
});
