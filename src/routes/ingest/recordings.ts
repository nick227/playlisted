import { Prisma } from "@prisma/client";
import { Router } from "express";

import { requireApiKeyAuth } from "../../lib/apiKeyAuth.js";
import { resolveUploadAsset } from "../../lib/ingestAsset.js";
import { prisma } from "../../lib/prisma.js";
import { syncPlaylistStats } from "../../lib/playlistStats.js";

export const ingestRecordingsRouter = Router();

const RECORDING_SELECT = {
  id: true,
  uploaderId: true,
  publishedPlaylistId: true,
  title: true,
  description: true,
  audioUrl: true,
  audioMimeType: true,
  audioBytes: true,
  durationSeconds: true,
  artworkUrl: true,
  trackNumber: true,
  recordingType: true,
  visibility: true,
  status: true,
  externalSource: true,
  externalId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function mapRecording(r: {
  id: string; uploaderId: string; publishedPlaylistId: string; title: string;
  description: string | null; audioUrl: string; audioMimeType: string | null;
  audioBytes: bigint | null; durationSeconds: number | null; artworkUrl: string | null;
  trackNumber: number | null; recordingType: string; visibility: string; status: string;
  externalSource: string | null; externalId: string | null; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: r.id,
    uploaderId: r.uploaderId,
    playlistId: r.publishedPlaylistId,
    title: r.title,
    description: r.description,
    audioUrl: r.audioUrl,
    audioMimeType: r.audioMimeType,
    audioBytes: r.audioBytes != null ? Number(r.audioBytes) : null,
    durationSeconds: r.durationSeconds,
    artworkUrl: r.artworkUrl,
    trackNumber: r.trackNumber,
    recordingType: r.recordingType,
    visibility: r.visibility,
    status: r.status,
    externalSource: r.externalSource,
    externalId: r.externalId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

ingestRecordingsRouter.post("/", async (req, res, next) => {
  try {
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const body = req.body as {
      externalSource: string;
      externalId: string;
      playlistExternalId: string;
      title: string;
      audioUploadId: string;
      coverUploadId?: string | null;
      trackNumber?: number | null;
      durationSeconds?: number | null;
      description?: string | null;
    };

    // Validate audio asset — must belong to auth user and be kind=audio
    const audioResult = await resolveUploadAsset(body.audioUploadId, auth.user.id, "audio");
    if ("assetError" in audioResult) {
      return res.status(audioResult.assetError.status).json({
        error: audioResult.assetError.error,
        message: audioResult.assetError.message,
      });
    }

    // Validate cover image if provided — must belong to auth user and be kind=image
    let artworkUrl: string | null = null;
    if (body.coverUploadId) {
      const coverResult = await resolveUploadAsset(body.coverUploadId, auth.user.id, "image");
      if ("assetError" in coverResult) {
        return res.status(coverResult.assetError.status).json({
          error: coverResult.assetError.error,
          message: coverResult.assetError.message,
        });
      }
      artworkUrl = coverResult.asset.url;
    }

    // Look up the target playlist — owner-scoped
    const playlist = await prisma.playlist.findFirst({
      where: {
        ownerId: auth.user.id,
        externalSource: body.externalSource,
        externalId: body.playlistExternalId,
      },
      select: { id: true, status: true, visibility: true },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `No playlist found for externalId '${body.playlistExternalId}' under your account.`,
      });
    }

    const audioAsset = audioResult.asset;

    // Upsert — uploaderId is always from auth context, never request-provided
    const existing = await prisma.recording.findFirst({
      where: {
        uploaderId: auth.user.id,
        externalSource: body.externalSource,
        externalId: body.externalId,
      },
      select: RECORDING_SELECT,
    });

    if (existing) {
      const audioChanged = existing.audioUrl !== audioAsset.url;
      const updated = await prisma.recording.update({
        where: { id: existing.id },
        data: {
          title: body.title,
          // Only overwrite if explicitly provided — omitting preserves the existing value
          ...(body.description !== undefined ? { description: body.description ?? null } : {}),
          ...(body.durationSeconds !== undefined ? { durationSeconds: body.durationSeconds ?? null } : {}),
          // coverUploadId: null explicitly clears artwork; omitting it preserves existing
          ...(body.coverUploadId !== undefined ? { artworkUrl } : {}),
          ...(body.trackNumber !== undefined ? { trackNumber: body.trackNumber ?? null } : {}),
          audioUrl: audioAsset.url,
          audioMimeType: audioAsset.mimeType,
          audioBytes: BigInt(audioAsset.bytes),
        },
        select: RECORDING_SELECT,
      });

      if (audioChanged) {
        const activeSub = await prisma.recordingSubtitle.findFirst({
          where: { recordingId: existing.id, isActive: true },
        });

        if (activeSub) {
          await prisma.recordingSubtitle.update({
            where: { id: activeSub.id },
            data: {
              status: "QUEUED",
              language: null,
              segments: Prisma.JsonNull,
              vttText: null,
              errorMessage: null,
              generatedAt: null,
            },
          });
        } else {
          await prisma.recordingSubtitle.create({
            data: {
              recordingId: existing.id,
              isActive: true,
              source: "MODAL",
              status: "QUEUED",
            },
          });
        }
      }

      await syncPlaylistStats(updated.publishedPlaylistId);
      return res.status(200).json({ created: false, recording: mapRecording(updated) });
    }

    // Retry loop guards against the PlaylistItem position unique-constraint race
    // (two concurrent ingest requests for the same playlist read the same MAX and both try +1)
    let recording = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        recording = await prisma.$transaction(async (tx) => {
          const created = await tx.recording.create({
            data: {
              uploaderId: auth.user.id,
              publishedPlaylistId: playlist.id,
              title: body.title,
              description: body.description ?? null,
              audioUrl: audioAsset.url,
              audioMimeType: audioAsset.mimeType,
              audioBytes: BigInt(audioAsset.bytes),
              durationSeconds: body.durationSeconds ?? null,
              artworkUrl,
              trackNumber: body.trackNumber ?? null,
              status: playlist.status,
              visibility: playlist.visibility,
              externalSource: body.externalSource,
              externalId: body.externalId,
            },
            select: RECORDING_SELECT,
          });

          await tx.recordingSubtitle.create({
            data: {
              recordingId: created.id,
              isActive: true,
              source: "MODAL",
              status: "QUEUED",
            },
          });

          const maxPos = await tx.playlistItem.aggregate({
            where: { playlistId: playlist.id },
            _max: { position: true },
          });

          await tx.playlistItem.create({
            data: {
              playlistId: playlist.id,
              recordingId: created.id,
              position: (maxPos._max.position ?? 0) + 1,
              addedById: auth.user.id,
            },
          });

          return created;
        });
        break;
      } catch (err) {
        // Only retry the specific PlaylistItem playlistId+position unique constraint.
        // Any other P2002 (e.g. recording.externalId conflict) is a hard error.
        const e = err as { code?: string; meta?: { modelName?: string; target?: string[] } };
        const isPositionConflict =
          e?.code === "P2002" &&
          e?.meta?.modelName === "PlaylistItem" &&
          Array.isArray(e?.meta?.target) &&
          e.meta.target.includes("position");
        if (isPositionConflict && attempt < 4) continue;
        throw err;
      }
    }

    await syncPlaylistStats(playlist.id);
    return res.status(201).json({ created: true, recording: mapRecording(recording!) });
  } catch (error) {
    return next(error);
  }
});

ingestRecordingsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const externalSource = typeof req.query.externalSource === "string" ? req.query.externalSource : undefined;
    const externalId = typeof req.query.externalId === "string" ? req.query.externalId : undefined;
    const playlistId = typeof req.query.playlistId === "string" ? req.query.playlistId : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)));

    const where = {
      uploaderId: auth.user.id,
      ...(externalSource ? { externalSource } : {}),
      ...(externalId ? { externalId } : {}),
      ...(playlistId ? { publishedPlaylistId: playlistId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.recording.findMany({
        where,
        select: RECORDING_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recording.count({ where }),
    ]);

    return res.json({
      data: items.map(mapRecording),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});
