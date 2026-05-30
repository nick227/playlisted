import { Router } from "express";

import { mapPlaybackHistoryItem } from "../lib/playbackMaps.js";
import { mapPlaylistSummary } from "../lib/playlistMaps.js";
import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;

const UPLOADER_SELECT = {
  id: true, username: true, displayName: true, avatarUrl: true, role: true,
} as const;

const ARTIST_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  heroImageUrl: true,
  role: true,
  status: true,
  isFeaturedArtist: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapRecordingWithUploader(r: {
  id: string;
  uploaderId: string;
  publishedPlaylistId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  audioMimeType: string | null;
  audioBytes: bigint | null;
  durationSeconds: number | null;
  artworkUrl: string | null;
  recordingType: string;
  visibility: string;
  status: string;
  trackNumber: number | null;
  episodeNumber: number | null;
  explicit: boolean;
  releaseDate: Date | null;
  publishedAt: Date | null;
  playCount: number;
  createdAt: Date;
  updatedAt: Date;
  uploader: { id: string; username: string; displayName: string; avatarUrl: string | null; role: string };
  publishedPlaylist: { id: string; slug: string; title: string };
}) {
  return {
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
    playlist: {
      id: r.publishedPlaylist.id,
      slug: r.publishedPlaylist.slug,
      title: r.publishedPlaylist.title,
    },
  };
}

const RECORDING_WITH_UPLOADER_INCLUDE = {
  uploader: { select: UPLOADER_SELECT },
  publishedPlaylist: { select: { id: true, slug: true, title: true } },
} as const;

function mapFavoriteArtist(follow: any) {
  return {
    ...follow.following,
    createdAt: follow.following.createdAt.toISOString(),
    updatedAt: follow.following.updatedAt.toISOString(),
    savedAt: follow.createdAt.toISOString(),
  };
}

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
          playlist: { select: { id: true, title: true, slug: true, owner: { select: { username: true } } } },
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

// ── favorites ─────────────────────────────────────────────────────────────────

meRouter.get("/favorites/recordings", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
    const where = { userId: auth.user.id, kind: "FAVORITE" as const };

    const [saves, total] = await Promise.all([
      prisma.recordingSave.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          recording: {
            include: RECORDING_WITH_UPLOADER_INCLUDE,
          },
        },
      }),
      prisma.recordingSave.count({ where }),
    ]);

    return res.json({
      data: saves.map((s) => ({
        ...mapRecordingWithUploader(s.recording),
        savedAt: s.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

meRouter.post("/favorites/recordings/:recordingId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { recordingId } = req.params;
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      select: { id: true },
    });

    if (!recording) {
      return res.status(404).json({ error: "recording_not_found", message: "Recording not found." });
    }

    const save = await prisma.recordingSave.upsert({
      where: { userId_recordingId_kind: { userId: auth.user.id, recordingId, kind: "FAVORITE" } },
      create: { userId: auth.user.id, recordingId, kind: "FAVORITE" },
      update: {},
    });

    return res.status(201).json({ id: save.id, recordingId: save.recordingId, savedAt: save.createdAt.toISOString() });
  } catch (error) {
    return next(error);
  }
});

meRouter.delete("/favorites/recordings/:recordingId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await prisma.recordingSave.deleteMany({
      where: { userId: auth.user.id, recordingId: req.params.recordingId, kind: "FAVORITE" },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

const PLAYLIST_FAVORITE_INCLUDE = {
  owner: true,
  tags: { include: { tag: true } },
} as const;

meRouter.get("/collections/playlists", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
    const where = { userId: auth.user.id, kind: "LIBRARY" as const };

    const [saves, total] = await Promise.all([
      prisma.playlistSave.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          playlist: { include: PLAYLIST_FAVORITE_INCLUDE },
        },
      }),
      prisma.playlistSave.count({ where }),
    ]);

    return res.json({
      data: saves.map((s) => ({
        ...mapPlaylistSummary(s.playlist),
        savedAt: s.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

meRouter.post("/collections/playlists/:playlistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { playlistId } = req.params;
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true, ownerId: true },
    });

    if (!playlist) {
      return res.status(404).json({ error: "playlist_not_found", message: "Playlist not found." });
    }

    if (playlist.ownerId === auth.user.id) {
      return res.status(200).json({
        id: playlist.id,
        playlistId: playlist.id,
        savedAt: new Date().toISOString(),
      });
    }

    const save = await prisma.playlistSave.upsert({
      where: { userId_playlistId_kind: { userId: auth.user.id, playlistId, kind: "LIBRARY" } },
      create: { userId: auth.user.id, playlistId, kind: "LIBRARY" },
      update: {},
    });

    return res.status(201).json({ id: save.id, playlistId: save.playlistId, savedAt: save.createdAt.toISOString() });
  } catch (error) {
    return next(error);
  }
});

meRouter.delete("/collections/playlists/:playlistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await prisma.playlistSave.deleteMany({
      where: { userId: auth.user.id, playlistId: req.params.playlistId, kind: "LIBRARY" },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

meRouter.get("/favorites/playlists", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
    const where = { userId: auth.user.id, kind: "FAVORITE" as const };

    const [saves, total] = await Promise.all([
      prisma.playlistSave.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          playlist: { include: PLAYLIST_FAVORITE_INCLUDE },
        },
      }),
      prisma.playlistSave.count({ where }),
    ]);

    return res.json({
      data: saves.map((s) => ({
        ...mapPlaylistSummary(s.playlist),
        savedAt: s.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

meRouter.post("/favorites/playlists/:playlistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { playlistId } = req.params;
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      select: { id: true },
    });

    if (!playlist) {
      return res.status(404).json({ error: "playlist_not_found", message: "Playlist not found." });
    }

    const save = await prisma.playlistSave.upsert({
      where: { userId_playlistId_kind: { userId: auth.user.id, playlistId, kind: "FAVORITE" } },
      create: { userId: auth.user.id, playlistId, kind: "FAVORITE" },
      update: {},
    });

    return res.status(201).json({ id: save.id, playlistId: save.playlistId, savedAt: save.createdAt.toISOString() });
  } catch (error) {
    return next(error);
  }
});

meRouter.delete("/favorites/playlists/:playlistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await prisma.playlistSave.deleteMany({
      where: { userId: auth.user.id, playlistId: req.params.playlistId, kind: "FAVORITE" },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

meRouter.get("/favorites/artists", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const page = Number(req.query.page ?? DEFAULT_PAGE);
    const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);
    const where = { followerId: auth.user.id };

    const [follows, total] = await Promise.all([
      prisma.userFollow.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          following: { select: ARTIST_SELECT },
        },
      }),
      prisma.userFollow.count({ where }),
    ]);

    return res.json({
      data: follows.map(mapFavoriteArtist),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

meRouter.post("/favorites/artists/:artistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const { artistId } = req.params;
    if (artistId === auth.user.id) {
      return res.status(400).json({
        error: "cannot_favorite_self",
        message: "You cannot add yourself to favorites.",
      });
    }

    const artist = await prisma.user.findUnique({
      where: { id: artistId },
      select: { id: true },
    });

    if (!artist) {
      return res.status(404).json({ error: "artist_not_found", message: "Artist not found." });
    }

    const follow = await prisma.userFollow.upsert({
      where: { followerId_followingId: { followerId: auth.user.id, followingId: artistId } },
      create: { followerId: auth.user.id, followingId: artistId },
      update: {},
    });

    return res.status(201).json({
      id: follow.id,
      artistId: follow.followingId,
      savedAt: follow.createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

meRouter.delete("/favorites/artists/:artistId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await prisma.userFollow.deleteMany({
      where: { followerId: auth.user.id, followingId: req.params.artistId },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// ── most-played ───────────────────────────────────────────────────────────────

meRouter.get("/most-played", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));

    const grouped = await prisma.playbackEvent.groupBy({
      by: ["recordingId"],
      where: { userId: auth.user.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const recordingIds = grouped.map((g) => g.recordingId);
    const recordings = await prisma.recording.findMany({
      where: { id: { in: recordingIds } },
      include: RECORDING_WITH_UPLOADER_INCLUDE,
    });

    const recMap = new Map(recordings.map((r) => [r.id, r]));

    const data = grouped
      .filter((g) => recMap.has(g.recordingId))
      .map((g) => ({
        ...mapRecordingWithUploader(recMap.get(g.recordingId)!),
        userPlayCount: g._count.id,
      }));

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

// ── recently-played ───────────────────────────────────────────────────────────

meRouter.get("/recently-played", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));

    const events = await prisma.playbackEvent.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
      distinct: ["recordingId"],
      take: limit,
      select: { recordingId: true, createdAt: true },
    });

    const recordingIds = events.map((e) => e.recordingId);
    const recordings = await prisma.recording.findMany({
      where: { id: { in: recordingIds } },
      include: RECORDING_WITH_UPLOADER_INCLUDE,
    });

    const recMap = new Map(recordings.map((r) => [r.id, r]));
    const lastPlayedMap = new Map(events.map((e) => [e.recordingId, e.createdAt.toISOString()]));

    const data = events
      .filter((e) => recMap.has(e.recordingId))
      .map((e) => ({
        ...mapRecordingWithUploader(recMap.get(e.recordingId)!),
        lastPlayedAt: lastPlayedMap.get(e.recordingId)!,
      }));

    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});
