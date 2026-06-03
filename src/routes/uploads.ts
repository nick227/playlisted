import path from "node:path";

import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js";
import { BULK_REGISTER_MAX_FILES } from "../lib/uploadPolicy.js";
import {
  handleMulterSingleError,
  storedUploadUrlFromRequest,
  studioAudioUpload,
  studioImageUpload,
} from "../lib/uploadMulter.js";
import { rejectDisallowedUpload } from "../lib/uploadValidate.js";

export const uploadsRouter = Router();

uploadsRouter.post("/audio", (req, res, next) => {
  studioAudioUpload.single("file")(req, res, async (multerErr) => {
    if (handleMulterSingleError(multerErr, "audio", res, next)) return;

    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          error: "file_required",
          message: "Multipart field 'file' is required.",
        });
      }

      if (await rejectDisallowedUpload("audio", file, res)) return;

      const url = storedUploadUrlFromRequest(req, "audio", file.filename);
      const title = path.basename(file.originalname, path.extname(file.originalname));

      res.status(201).json({
        url,
        mimeType: file.mimetype,
        bytes: file.size,
        title,
      });
    } catch (error) {
      next(error);
    }
  });
});

uploadsRouter.post("/images", (req, res, next) => {
  studioImageUpload.single("file")(req, res, async (multerErr) => {
    if (handleMulterSingleError(multerErr, "image", res, next)) return;

    try {
      const auth = await requireAuth(req, res);
      if (!auth) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          error: "file_required",
          message: "Multipart field 'file' is required.",
        });
      }

      if (await rejectDisallowedUpload("image", file, res)) return;

      res.status(201).json({
        url: storedUploadUrlFromRequest(req, "images", file.filename),
        mimeType: file.mimetype,
        bytes: file.size,
      });
    } catch (error) {
      next(error);
    }
  });
});

uploadsRouter.post("/audio/bulk-register", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const body = req.body as {
      playlistId?: string;
      files: {
        url: string;
        mimeType?: string;
        bytes?: number;
        title?: string;
        durationSeconds?: number | null;
      }[];
    };

    if (!body.playlistId) {
      return res.status(400).json({
        error: "playlist_required",
        message: "Provide playlistId for the collection these uploads should be added to.",
      });
    }

    if (!Array.isArray(body.files) || body.files.length === 0) {
      return res.status(400).json({
        error: "files_required",
        message: "Provide a non-empty files array.",
      });
    }

    if (body.files.length > BULK_REGISTER_MAX_FILES) {
      return res.status(400).json({
        error: "too_many_files",
        message: `At most ${BULK_REGISTER_MAX_FILES} files per request.`,
      });
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: body.playlistId },
      select: { id: true, ownerId: true, status: true, visibility: true },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "playlist_not_found",
        message: `Playlist ${body.playlistId} was not found.`,
      });
    }

    if (playlist.ownerId !== auth.user.id) {
      return res.status(403).json({
        error: "forbidden",
        message: "You do not own this collection.",
      });
    }

    const created = [];

    for (const file of body.files) {
      const recording = await prisma.$transaction(async (tx) => {
        const createdRecording = await tx.recording.create({
          data: {
            uploaderId: auth.user.id,
            publishedPlaylistId: playlist.id,
            title: file.title ?? "Untitled",
            audioUrl: file.url,
            audioMimeType: file.mimeType ?? null,
            audioBytes: file.bytes != null ? BigInt(file.bytes) : null,
            durationSeconds: typeof file.durationSeconds === "number" ? Math.max(0, Math.floor(file.durationSeconds)) : null,
            status: playlist.status,
            visibility: playlist.visibility,
            publishedAt: playlist.status === "PUBLISHED" ? new Date() : null,
          },
        });

        const maxPosition = await tx.playlistItem.aggregate({
          where: { playlistId: playlist.id },
          _max: { position: true },
        });

        await tx.playlistItem.create({
          data: {
            playlistId: playlist.id,
            recordingId: createdRecording.id,
            position: (maxPosition._max.position ?? 0) + 1,
            addedById: auth.user.id,
          },
        });

        return createdRecording;
      });

      created.push({
        id: recording.id,
        title: recording.title,
        audioUrl: recording.audioUrl,
      });
    }

    const { syncPlaylistStats } = await import("../lib/playlistStats.js");
    await syncPlaylistStats(playlist.id);

    res.status(201).json({ recordings: created, playlistId: playlist.id });
  } catch (error) {
    next(error);
  }
});
