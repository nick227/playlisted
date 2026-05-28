import { Router } from "express";

import { mapPlaybackHistoryItem } from "../lib/playbackMaps.js";
import { mapPlaylistSummary } from "../lib/playlistMaps.js";
import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

export const meRouter = Router();

meRouter.get("/playlists", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);

    const where = { ownerId: auth.user.id };

    const [items, total] = await Promise.all([
      prisma.playlist.findMany({
        where,
        include: {
          owner: true,
          tags: { include: { tag: true } },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.playlist.count({ where }),
    ]);

    res.json({
      data: items.map(mapPlaylistSummary),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    next(error);
  }
});

meRouter.get("/recordings", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);

    const where = { uploaderId: auth.user.id };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recording.count({ where }),
    ]);

    res.json({
      data: items.map((recording) => ({
        id: recording.id,
        uploaderId: recording.uploaderId,
        publishedPlaylistId: recording.publishedPlaylistId,
        title: recording.title,
        description: recording.description,
        audioUrl: recording.audioUrl,
        audioMimeType: recording.audioMimeType,
        audioBytes: recording.audioBytes ? Number(recording.audioBytes) : null,
        durationSeconds: recording.durationSeconds,
        artworkUrl: recording.artworkUrl,
        recordingType: recording.recordingType,
        visibility: recording.visibility,
        status: recording.status,
        trackNumber: recording.trackNumber,
        episodeNumber: recording.episodeNumber,
        explicit: recording.explicit,
        releaseDate: recording.releaseDate?.toISOString() ?? null,
        playCount: recording.playCount,
        publishedAt: recording.publishedAt?.toISOString() ?? null,
        createdAt: recording.createdAt.toISOString(),
        updatedAt: recording.updatedAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    next(error);
  }
});

meRouter.post("/playback-events", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const body = req.body as {
      recordingId: string;
      playlistId?: string | null;
      sourceContext?: string | null;
      playedSeconds?: number;
      completed?: boolean;
    };

    const recording = await prisma.recording.findUnique({
      where: { id: body.recordingId },
      select: { id: true },
    });

    if (!recording) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${body.recordingId} was not found.`,
      });
    }

    if (body.playlistId) {
      const playlist = await prisma.playlist.findUnique({
        where: { id: body.playlistId },
        select: { id: true },
      });

      if (!playlist) {
        return res.status(404).json({
          error: "playlist_not_found",
          message: `Playlist ${body.playlistId} was not found.`,
        });
      }
    }

    const event = await prisma.playbackEvent.create({
      data: {
        userId: auth.user.id,
        recordingId: body.recordingId,
        playlistId: body.playlistId ?? null,
        sourceContext: body.sourceContext ?? null,
        playedSeconds: body.playedSeconds ?? null,
        completed: body.completed ?? false,
      },
    });

    if (body.completed || (body.playedSeconds ?? 0) >= 30) {
      await prisma.recording.update({
        where: { id: body.recordingId },
        data: { playCount: { increment: 1 } },
      });
    }

    return res.status(201).json({
      id: event.id.toString(),
      recordingId: event.recordingId,
      playlistId: event.playlistId,
      sourceContext: event.sourceContext,
      playedSeconds: event.playedSeconds,
      completed: event.completed,
      createdAt: event.createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

meRouter.get("/playback-history", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);

    const where = { userId: auth.user.id };

    const [items, total] = await Promise.all([
      prisma.playbackEvent.findMany({
        where,
        include: {
          recording: true,
          playlist: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.playbackEvent.count({ where }),
    ]);

    return res.json({
      data: items.map(mapPlaybackHistoryItem),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});
