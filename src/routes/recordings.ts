import { PublishStatus, RecordingType, Visibility } from "@prisma/client";
import { Router } from "express";

import { getAllGenres, getAllSubgenres } from "../utils/genresDictionary.js";
import { getAuthContextFromRequest } from "../lib/auth.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { canViewerAccessRecording } from "../lib/publicRecordingFilter.js";
import { canViewerAccessPlaylist } from "../lib/publicPlaylistFilter.js";
import { requireAuth } from "../lib/requireAuth.js";
import { prisma } from "../lib/prisma.js";
import { parsePageSize, parsePositivePage } from "../lib/pagination.js";
import { mapSubtitleSummary, subtitleInclude } from "../lib/subtitles/summary.js";
import { transcriptsRouter } from "./transcripts.js";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

export const recordingsRouter = Router();
recordingsRouter.use("/:recordingId/transcripts", transcriptsRouter);

function mapRecordingSummary(recording: any) {
  return {
    id: recording.id,
    uploaderId: recording.uploaderId,
    publishedPlaylistId: recording.publishedPlaylistId,
    title: recording.title,
    description: recording.description,
    audioUrl: recording.audioUrl,
    audioMimeType: recording.audioMimeType,
    audioBytes: recording.audioBytes ? Number(recording.audioBytes) : null,
    durationSeconds: recording.durationSeconds,
    artworkUrl: resolveRecordingArtworkUrl(recording, recording.publishedPlaylist),
    recordingType: recording.recordingType,
    visibility: recording.visibility,
    status: recording.status,
    trackNumber: recording.trackNumber,
    episodeNumber: recording.episodeNumber,
    explicit: recording.explicit,
    releaseDate: recording.releaseDate?.toISOString() ?? null,
    publishedAt: recording.publishedAt?.toISOString() ?? null,
    playCount: recording.playCount,
    subtitle: mapSubtitleSummary(recording.subtitles),
    createdAt: recording.createdAt.toISOString(),
    updatedAt: recording.updatedAt.toISOString(),
  };
}

function mapRecordingDetail(recording: any) {
  return {
    ...mapRecordingSummary(recording),
    uploader: {
      id: recording.uploader.id,
      username: recording.uploader.username,
      displayName: recording.uploader.displayName,
      avatarUrl: recording.uploader.avatarUrl,
      heroImageUrl: recording.uploader.heroImageUrl,
      role: recording.uploader.role,
    },
    publishedPlaylist: {
      id: recording.publishedPlaylist.id,
      ownerId: recording.publishedPlaylist.ownerId,
      title: recording.publishedPlaylist.title,
      slug: recording.publishedPlaylist.slug,
      coverArtUrl: recording.publishedPlaylist.coverArtUrl,
      type: recording.publishedPlaylist.type,
      visibility: recording.publishedPlaylist.visibility,
      status: recording.publishedPlaylist.status,
    },
  };
}

async function syncPlaylistStats(playlistId: string) {
  const items = await prisma.playlistItem.findMany({
    where: { playlistId },
    include: { recording: { select: { durationSeconds: true } } },
  });

  const itemCount = items.length;
  const totalDurationSeconds = items.reduce(
    (sum, item) => sum + (item.recording.durationSeconds ?? 0),
    0,
  );

  await prisma.playlist.update({
    where: { id: playlistId },
    data: { itemCount, totalDurationSeconds },
  });
}

recordingsRouter.get("/", async (req, res, next) => {
  try {
    const page = parsePositivePage(req.query.page, DEFAULT_PAGE);
    const pageSize = parsePageSize(req.query.pageSize, DEFAULT_PAGE_SIZE, 100);
    const uploaderId = typeof req.query.uploaderId === "string" ? req.query.uploaderId : undefined;
    const playlistId = typeof req.query.playlistId === "string" ? req.query.playlistId : undefined;
    const recordingType = typeof req.query.recordingType === "string" ? req.query.recordingType : undefined;
    const visibility = typeof req.query.visibility === "string" ? req.query.visibility : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const where = {
      ...(uploaderId ? { uploaderId } : {}),
      ...(playlistId ? { publishedPlaylistId: playlistId } : {}),
      ...(recordingType ? { recordingType: recordingType as RecordingType } : {}),
      ...(visibility ? { visibility: visibility as Visibility } : {}),
      ...(status ? { status: status as PublishStatus } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        include: { publishedPlaylist: { select: { coverArtUrl: true } }, subtitles: subtitleInclude() },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recording.count({ where }),
    ]);

    res.json({
      data: items.map(mapRecordingSummary),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    next(error);
  }
});

recordingsRouter.get("/:recordingId", async (req, res, next) => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.recordingId },
      include: {
        uploader: true,
        publishedPlaylist: true,
        subtitles: subtitleInclude(),
      },
    });

    if (!recording) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${req.params.recordingId} was not found.`,
      });
    }

    const auth = await getAuthContextFromRequest(req);
    const viewer = { userId: auth?.user.id, role: auth?.user.role };
    if (!canViewerAccessRecording(recording, viewer, recording.uploaderId)
      || !canViewerAccessPlaylist(recording.publishedPlaylist, viewer, recording.publishedPlaylist.ownerId)) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${req.params.recordingId} was not found.`,
      });
    }

    return res.json(mapRecordingDetail(recording));
  } catch (error) {
    return next(error);
  }
});

recordingsRouter.patch("/:recordingId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const recording = await prisma.recording.findUnique({
      where: { id: req.params.recordingId },
      select: { id: true, uploaderId: true },
    });

    if (!recording) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${req.params.recordingId} was not found.`,
      });
    }

    if (recording.uploaderId !== auth.user.id && auth.user.role !== "ADMIN") {
      return res.status(403).json({
        error: "forbidden",
        message: "You do not have permission to update this recording.",
      });
    }

    const body = req.body as {
      title?: string;
      artworkUrl?: string | null;
      coverArtUrl?: string | null;
    };
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) {
        return res.status(400).json({
          error: "invalid_title",
          message: "Recording title cannot be blank.",
        });
      }
      data.title = title;
    }

    if (body.artworkUrl !== undefined || body.coverArtUrl !== undefined) {
      data.artworkUrl = body.artworkUrl !== undefined ? body.artworkUrl : body.coverArtUrl;
    }

    const updated = await prisma.recording.update({
      where: { id: recording.id },
      data,
      include: {
        uploader: true,
        publishedPlaylist: true,
        subtitles: subtitleInclude(),
      },
    });

    return res.json(mapRecordingDetail(updated));
  } catch (error) {
    return next(error);
  }
});

recordingsRouter.post("/", async (req, res, next) => {
  try {
    const body = req.body as {
      uploaderId: string;
      publishedPlaylistId: string;
      title: string;
      description?: string | null;
      audioUrl: string;
      audioMimeType?: string | null;
      audioBytes?: number | null;
      durationSeconds?: number | null;
      artworkUrl?: string | null;
      recordingType?: RecordingType;
      visibility?: Visibility;
      status?: PublishStatus;
      trackNumber?: number | null;
      episodeNumber?: number | null;
      explicit?: boolean;
      releaseDate?: string | null;
      publishedAt?: string | null;
    };

    const [uploader, playlist, maxPosition] = await Promise.all([
      prisma.user.findUnique({ where: { id: body.uploaderId }, select: { id: true } }),
      prisma.playlist.findUnique({ where: { id: body.publishedPlaylistId }, select: { id: true } }),
      prisma.playlistItem.aggregate({
        where: { playlistId: body.publishedPlaylistId },
        _max: { position: true },
      }),
    ]);

    if (!uploader) {
      return res.status(404).json({
        error: "uploader_not_found",
        message: `User ${body.uploaderId} does not exist.`,
      });
    }

    if (!playlist) {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${body.publishedPlaylistId} does not exist.`,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const recording = await tx.recording.create({
        data: {
          uploaderId: body.uploaderId,
          publishedPlaylistId: body.publishedPlaylistId,
          title: body.title,
          description: body.description ?? null,
          audioUrl: body.audioUrl,
          audioMimeType: body.audioMimeType ?? null,
          audioBytes: body.audioBytes != null ? BigInt(body.audioBytes) : null,
          durationSeconds: body.durationSeconds ?? null,
          artworkUrl: body.artworkUrl ?? null,
          recordingType: body.recordingType ?? "SONG",
          visibility: body.visibility ?? "PUBLIC",
          status: body.status ?? "DRAFT",
          trackNumber: body.trackNumber ?? null,
          episodeNumber: body.episodeNumber ?? null,
          explicit: body.explicit ?? false,
          releaseDate: body.releaseDate ? new Date(body.releaseDate) : null,
          publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
        },
      });

      await tx.recordingSubtitle.create({
        data: {
          recordingId: recording.id,
          status: "QUEUED",
        },
      });

      await tx.playlistItem.create({
        data: {
          playlistId: body.publishedPlaylistId,
          recordingId: recording.id,
          position: (maxPosition._max.position ?? 0) + 1,
          addedById: body.uploaderId,
        },
      });

      return tx.recording.findUniqueOrThrow({
        where: { id: recording.id },
        include: {
          uploader: true,
          publishedPlaylist: true,
          subtitles: subtitleInclude(),
        },
      });
    });

    await syncPlaylistStats(body.publishedPlaylistId);

    return res.status(201).json(mapRecordingDetail(created));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002") {
      return res.status(409).json({
        error: "recording_conflict",
        message: "A recording with that unique value already exists.",
      });
    }

    return next(error);
  }
});

recordingsRouter.get("/:recordingId/subtitles", async (req, res, next) => {
  try {
    const recording = await prisma.recording.findUnique({
      where: { id: req.params.recordingId },
      include: {
        uploader: { select: { id: true } },
        publishedPlaylist: true,
        subtitles: { where: { isActive: true }, take: 1 },
      },
    });

    if (!recording) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${req.params.recordingId} was not found.`,
      });
    }

    const auth = await getAuthContextFromRequest(req);
    const viewer = { userId: auth?.user.id, role: auth?.user.role };
    if (!canViewerAccessRecording(recording, viewer, recording.uploaderId)
      || !canViewerAccessPlaylist(recording.publishedPlaylist, viewer, recording.publishedPlaylist.ownerId)) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${req.params.recordingId} was not found.`,
      });
    }

    if (!recording.subtitles || recording.subtitles.length === 0) {
      return res.json({ status: "QUEUED" });
    }

    const activeSubtitle = recording.subtitles[0];

    if (activeSubtitle.status !== "READY") {
      const canSeeRawError =
        activeSubtitle.status === "FAILED" &&
        (auth?.user.role === "ADMIN" || auth?.user.id === recording.uploaderId);

      return res.json({
        status: activeSubtitle.status,
        ...(activeSubtitle.status === "FAILED"
          ? { errorMessage: canSeeRawError ? activeSubtitle.errorMessage ?? "Subtitles unavailable" : "Subtitles unavailable" }
          : {}),
      });
    }

    return res.json({
      status: activeSubtitle.status,
      language: activeSubtitle.language,
      segments: activeSubtitle.segments ?? [],
      vttText: activeSubtitle.vttText ?? "",
    });
  } catch (error) {
    return next(error);
  }
});

recordingsRouter.patch("/:recordingId/tags", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const recording = await prisma.recording.findUnique({
      where: { id: req.params.recordingId },
      select: { id: true, uploaderId: true },
    });

    if (!recording) {
      return res.status(404).json({
        error: "recording_not_found",
        message: `Recording ${req.params.recordingId} was not found.`,
      });
    }

    if (recording.uploaderId !== auth.user.id) {
      return res.status(403).json({
        error: "forbidden",
        message: "You do not have permission to update tags for this recording.",
      });
    }

    const body = req.body as { tagSlugs?: string[] };
    if (!Array.isArray(body.tagSlugs)) {
      return res.status(400).json({
        error: "invalid_request",
        message: "tagSlugs must be an array of tag slugs.",
      });
    }

    const distinctSlugs = Array.from(new Set(body.tagSlugs));
    const tagInfos = distinctSlugs
      .map((slug) => {
        const subgenre = getAllSubgenres().find((s) => s.slug === slug);
        if (subgenre) {
          return { slug, name: subgenre.name, kind: "GENRE" as const };
        }

        const genre = getAllGenres().find((g) => g.slug === slug);
        if (genre) {
          return { slug, name: genre.name, kind: "GENRE" as const };
        }

        return undefined;
      })
      .filter((info): info is { slug: string; name: string; kind: "GENRE" } => Boolean(info));

    if (tagInfos.length !== distinctSlugs.length) {
      return res.status(400).json({
        error: "invalid_tag_slugs",
        message: "One or more tag slugs are not recognized.",
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const tags = await Promise.all(
        tagInfos.map((info) =>
          tx.tag.upsert({
            where: { slug: info.slug },
            update: {},
            create: { name: info.name, slug: info.slug, kind: info.kind },
          }),
        ),
      );

      await tx.recordingTag.deleteMany({ where: { recordingId: recording.id } });

      if (tags.length > 0) {
        await tx.recordingTag.createMany({
          data: tags.map((tag) => ({ recordingId: recording.id, tagId: tag.id })),
        });
      }

      return tx.recording.findUnique({
        where: { id: recording.id },
        include: {
          tags: { include: { tag: true } },
        },
      });
    });

    if (!updated) {
      return res.status(500).json({
        error: "update_failed",
        message: "Failed to update recording tags.",
      });
    }

    return res.json({
      ...mapRecordingSummary(updated),
      tags: updated.tags.map(({ tag }) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        kind: tag.kind,
      })),
    });
  } catch (error) {
    return next(error);
  }
});
