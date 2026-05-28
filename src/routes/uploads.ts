import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { ensureInboxPlaylist } from "../lib/inboxPlaylist.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js";
import { slugify } from "../utils/slug.js";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");
const mediaBaseUrl = (process.env.MEDIA_BASE_URL ?? "http://localhost:4000/uploads").replace(/\/$/, "");

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

function fileUrl(subdir: string, filename: string) {
  return `${mediaBaseUrl}/${subdir}/${filename}`;
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

    const url = fileUrl("audio", file.filename);
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
      url: fileUrl("images", file.filename),
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
      files: { url: string; mimeType?: string; bytes?: number; title?: string }[];
    };

    if (!Array.isArray(body.files) || body.files.length === 0) {
      return res.status(400).json({
        error: "files_required",
        message: "Provide a non-empty files array.",
      });
    }

    const inboxId = await ensureInboxPlaylist(auth.user.id);
    const created = [];

    for (const file of body.files) {
      const recording = await prisma.recording.create({
        data: {
          uploaderId: auth.user.id,
          publishedPlaylistId: inboxId,
          title: file.title ?? "Untitled",
          audioUrl: file.url,
          audioMimeType: file.mimeType ?? null,
          audioBytes: file.bytes != null ? BigInt(file.bytes) : null,
          status: "PUBLISHED",
          visibility: "PUBLIC",
          publishedAt: new Date(),
        },
      });

      const maxPosition = await prisma.playlistItem.aggregate({
        where: { playlistId: inboxId },
        _max: { position: true },
      });

      await prisma.playlistItem.create({
        data: {
          playlistId: inboxId,
          recordingId: recording.id,
          position: (maxPosition._max.position ?? 0) + 1,
          addedById: auth.user.id,
        },
      });

      created.push({
        id: recording.id,
        title: recording.title,
        audioUrl: recording.audioUrl,
      });
    }

    const { syncPlaylistStats } = await import("../lib/playlistStats.js");
    await syncPlaylistStats(inboxId);

    res.status(201).json({ recordings: created, inboxPlaylistId: inboxId });
  } catch (error) {
    next(error);
  }
});
