import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import {
  BROWSABLE_RECORDING,
  PUBLIC_PUBLISHED_RECORDING,
  PUBLIC_RECORDING_TAG_COUNT_SELECT,
} from "../lib/publicRecordingFilter.js";

export const libraryRouter = Router();

libraryRouter.get("/genres", async (_req, res, next) => {
  try {
    const [recordingGenres, playlistsWithGenres] = await Promise.all([
      prisma.tag.findMany({
        where: {
          kind: "GENRE",
          recordingTags: { some: { recording: PUBLIC_PUBLISHED_RECORDING } },
        },
        include: { _count: { select: PUBLIC_RECORDING_TAG_COUNT_SELECT } },
        orderBy: { name: "asc" },
      }),
      // Trickle-down: find public playlists that have genre tags
      prisma.playlist.findMany({
        where: {
          visibility: "PUBLIC",
          status: "PUBLISHED",
          tags: { some: { tag: { kind: "GENRE" } } },
        },
        select: {
          itemCount: true,
          tags: {
            where: { tag: { kind: "GENRE" } },
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
        },
      }),
    ]);

    // Start with recording-level genres (accurate song counts)
    const genreMap = new Map<string, { id: string; name: string; slug: string; songCount: number }>();
    for (const g of recordingGenres) {
      genreMap.set(g.id, { id: g.id, name: g.name, slug: g.slug, songCount: g._count.recordingTags });
    }

    // Build playlist-derived counts per genre (sum across all playlists)
    const playlistGenreCounts = new Map<string, { tag: { id: string; name: string; slug: string }; count: number }>();
    for (const playlist of playlistsWithGenres) {
      for (const { tag } of playlist.tags) {
        const entry = playlistGenreCounts.get(tag.id) ?? { tag, count: 0 };
        entry.count += playlist.itemCount;
        playlistGenreCounts.set(tag.id, entry);
      }
    }

    // Add playlist-only genres (not already covered by recording-level tags)
    for (const [id, { tag, count }] of playlistGenreCounts) {
      if (!genreMap.has(id)) {
        genreMap.set(id, { id: tag.id, name: tag.name, slug: tag.slug, songCount: count });
      }
    }

    const sorted = Array.from(genreMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ data: sorted });
  } catch (error) {
    return next(error);
  }
});

libraryRouter.get("/songs", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 200)));
    const genreSlug = typeof req.query.genre === "string" ? req.query.genre : undefined;

    const where = {
      ...BROWSABLE_RECORDING,
      ...(genreSlug
        ? { tags: { some: { tag: { slug: genreSlug, kind: "GENRE" as const } } } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        include: {
          uploader: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
          },
          publishedPlaylist: { select: { id: true, slug: true, title: true, coverArtUrl: true } },
          tags: {
            where: { tag: { kind: "GENRE" } },
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          _count: {
            select: { saves: { where: { kind: "FAVORITE" } } },
          },
        },
        orderBy: { title: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recording.count({ where }),
    ]);

    return res.json({
      data: items.map((r) => ({
        id: r.id,
        uploaderId: r.uploaderId,
        publishedPlaylistId: r.publishedPlaylistId,
        title: r.title,
        description: r.description ?? null,
        audioUrl: r.audioUrl,
        audioMimeType: r.audioMimeType ?? null,
        audioBytes: r.audioBytes != null ? Number(r.audioBytes) : null,
        durationSeconds: r.durationSeconds ?? null,
        artworkUrl: resolveRecordingArtworkUrl(r, r.publishedPlaylist),
        recordingType: r.recordingType,
        visibility: r.visibility,
        status: r.status,
        trackNumber: r.trackNumber ?? null,
        episodeNumber: r.episodeNumber ?? null,
        explicit: r.explicit,
        releaseDate: r.releaseDate?.toISOString() ?? null,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        playCount: r.playCount,
        favoriteCount: r._count.saves,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        uploader: r.uploader,
        playlist: r.publishedPlaylist,
        genres: r.tags.map((t) => ({ id: t.tag.id, name: t.tag.name, slug: t.tag.slug })),
      })),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

libraryRouter.get("/artists", async (_req, res, next) => {
  try {
    const recordings = await prisma.recording.findMany({
      where: BROWSABLE_RECORDING,
      select: {
        uploaderId: true,
        releaseDate: true,
        publishedAt: true,
        uploader: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        tags: {
          where: { tag: { kind: "GENRE" } },
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    });

    const artistMap = new Map<string, {
      user: { id: string; username: string; displayName: string; avatarUrl: string | null };
      songCount: number;
      genres: Map<string, { id: string; name: string; slug: string }>;
      years: number[];
    }>();

    for (const r of recordings) {
      if (!artistMap.has(r.uploaderId)) {
        artistMap.set(r.uploaderId, {
          user: r.uploader,
          songCount: 0,
          genres: new Map(),
          years: [],
        });
      }
      const entry = artistMap.get(r.uploaderId)!;
      entry.songCount++;
      for (const rt of r.tags) {
        entry.genres.set(rt.tag.id, rt.tag);
      }
      const year = r.releaseDate?.getFullYear() ?? r.publishedAt?.getFullYear();
      if (year) entry.years.push(year);
    }

    const artists = Array.from(artistMap.values())
      .map(({ user, songCount, genres, years }) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        songCount,
        genres: Array.from(genres.values()),
        yearRange: years.length > 0
          ? { earliest: Math.min(...years), latest: Math.max(...years) }
          : { earliest: null, latest: null },
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return res.json({ data: artists });
  } catch (error) {
    return next(error);
  }
});
