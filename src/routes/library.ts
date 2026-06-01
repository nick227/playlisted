import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import {
  BROWSABLE_RECORDING,
  PUBLIC_PUBLISHED_RECORDING,
  PUBLIC_RECORDING_TAG_COUNT_SELECT,
} from "../lib/publicRecordingFilter.js";

export const libraryRouter = Router();

libraryRouter.get("/genres", async (_req, res, next) => {
  try {
    const genres = await prisma.tag.findMany({
      where: {
        kind: "GENRE",
        recordingTags: {
          some: {
            recording: PUBLIC_PUBLISHED_RECORDING,
          },
        },
      },
      include: { _count: { select: PUBLIC_RECORDING_TAG_COUNT_SELECT } },
      orderBy: { name: "asc" },
    });

    return res.json({
      data: genres.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        songCount: g._count.recordingTags,
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
          publishedPlaylist: { select: { id: true, slug: true, title: true } },
          tags: {
            where: { tag: { kind: "GENRE" } },
            include: { tag: { select: { id: true, name: true, slug: true } } },
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
        artworkUrl: r.artworkUrl ?? null,
        recordingType: r.recordingType,
        visibility: r.visibility,
        status: r.status,
        trackNumber: r.trackNumber ?? null,
        episodeNumber: r.episodeNumber ?? null,
        explicit: r.explicit,
        releaseDate: r.releaseDate?.toISOString() ?? null,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        playCount: r.playCount,
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
