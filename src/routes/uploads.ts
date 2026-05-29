import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js";
import { slugify } from "../utils/slug.js";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");
const mediaBaseUrl = process.env.MEDIA_BASE_URL?.replace(/\/$/, "") ?? null;

function createUpload(subdir: "audio" | "images") {
  const storage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        const dest = path.join(uploadsDir, subdir);
        await fs.mkdir(dest, { recursive: true });
        cb(null, dest);
      } catch (error) {
        cb(error as Error, "");
      }
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".bin";
      const key = slugify(path.basename(file.originalname, ext)) || "file";
      const hash = crypto.randomBytes(4).toString("hex");
      cb(null, `${key}-${hash}${ext}`);
    },
  });

  return multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
}

const audioUpload = createUpload("audio");
const imageUpload = createUpload("images");

export const uploadsRouter = Router();

function fileUrl(req: { protocol: string; get: (header: string) => string | undefined }, subdir: string, filename: string) {
  if (mediaBaseUrl) {
    return `${mediaBaseUrl}/${subdir}/${filename}`;
  }

  // Prefer relative URLs so the web app can proxy /uploads in dev.
  // This also avoids cross-origin media playback quirks (range/CORS).
  void req;
  return `/uploads/${subdir}/${filename}`;
}

uploadsRouter.post("/audio", audioUpload.single("file"), async (req, res, next) => {
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

    const url = fileUrl(req, "audio", file.filename);
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

uploadsRouter.post("/images", imageUpload.single("file"), async (req, res, next) => {
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

    res.status(201).json({
      url: fileUrl(req, "images", file.filename),
      mimeType: file.mimetype,
      bytes: file.size,
    });
  } catch (error) {
    next(error);
  }
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
