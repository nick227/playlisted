import { Router } from "express";

import {
  effectiveGenreSelect,
  effectiveGenreWhere,
  listEffectiveLibraryGenres,
  mergeGenreRefs,
} from "../lib/effectiveGenres.js";
import { prisma } from "../lib/prisma.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { BROWSABLE_RECORDING } from "../lib/publicRecordingFilter.js";
import { PUBLIC_PUBLISHED_PLAYLIST } from "../lib/publicPlaylistFilter.js";

export const libraryRouter = Router();

libraryRouter.get("/genres", async (_req, res, next) => {
  try {
    return res.json({ data: await listEffectiveLibraryGenres() });
  } catch (error) {
    return next(error);
  }
});

libraryRouter.get("/playlist-genres", async (_req, res, next) => {
  try {
    const genres = await prisma.tag.findMany({
      where: {
        kind: "GENRE",
        playlistTags: { some: { playlist: PUBLIC_PUBLISHED_PLAYLIST } },
      },
      include: {
        _count: {
          select: {
            playlistTags: { where: { playlist: PUBLIC_PUBLISHED_PLAYLIST } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      data: genres.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        songCount: g._count.playlistTags,
      })),
    });
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
      ...(genreSlug ? effectiveGenreWhere(genreSlug) : {}),
    };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        include: {
          uploader: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
          },
          tags: effectiveGenreSelect.tags,
          publishedPlaylist: {
            select: {
              id: true,
              slug: true,
              title: true,
              coverArtUrl: true,
              tags: effectiveGenreSelect.publishedPlaylist.select.tags,
            },
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
        playlist: {
          id: r.publishedPlaylist.id,
          slug: r.publishedPlaylist.slug,
          title: r.publishedPlaylist.title,
        },
        genres: mergeGenreRefs(r.tags, r.publishedPlaylist.tags),
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
        ...effectiveGenreSelect,
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
      for (const genre of mergeGenreRefs(r.tags, r.publishedPlaylist.tags)) {
        entry.genres.set(genre.id, genre);
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
