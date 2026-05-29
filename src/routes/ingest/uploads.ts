import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { Router } from "express";
import multer from "multer";

import { requireApiKeyAuth } from "../../lib/apiKeyAuth.js";
import { prisma } from "../../lib/prisma.js";
import { slugify } from "../../utils/slug.js";

const UPLOAD_SELECT = {
  id: true,
  userId: true,
  kind: true,
  url: true,
  mimeType: true,
  bytes: true,
  originalName: true,
  status: true,
  createdAt: true,
} as const;

// ── allowlists ────────────────────────────────────────────────────────────────

const ALLOWED: Record<"audio" | "image", { mimes: Set<string>; exts: Set<string> }> = {
  audio: {
    mimes: new Set([
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav",
      "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/flac", "audio/x-flac",
      "audio/ogg", "audio/vorbis", "audio/aac", "audio/webm",
    ]),
    exts: new Set([".mp3", ".wav", ".m4a", ".flac", ".ogg", ".aac", ".webm"]),
  },
  image: {
    mimes: new Set(["image/jpeg", "image/png", "image/webp"]),
    exts: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  },
};

function isAllowed(kind: "audio" | "image", mimeType: string, ext: string): boolean {
  const list = ALLOWED[kind];
  return list.mimes.has(mimeType.toLowerCase()) && list.exts.has(ext.toLowerCase());
}

// ── storage ───────────────────────────────────────────────────────────────────

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");
const mediaBaseUrl = process.env.MEDIA_BASE_URL?.replace(/\/$/, "") ?? null;

function fileUrl(subdir: string, filename: string): string {
  if (mediaBaseUrl) return `${mediaBaseUrl}/${subdir}/${filename}`;
  return `/uploads/${subdir}/${filename}`;
}

function createUpload(subdir: "audio" | "images") {
  const storage = multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        const dest = path.join(uploadsDir, subdir);
        await fs.mkdir(dest, { recursive: true });
        cb(null, dest);
      } catch (err) {
        cb(err as Error, "");
      }
    },
    filename: (_req, file, cb) => {
      // Sanitize: slug the basename + 8 random hex chars — no user input reaches the path
      const ext = path.extname(file.originalname).toLowerCase() || ".bin";
      const base = slugify(path.basename(file.originalname, path.extname(file.originalname))) || "file";
      const rand = crypto.randomBytes(8).toString("hex");
      cb(null, `${base}-${rand}${ext}`);
    },
  });
  // 100 MB hard cap — documented in OpenAPI
  return multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
}

const audioUpload = createUpload("audio");
const imageUpload = createUpload("images");

// ── helpers ───────────────────────────────────────────────────────────────────

function generateUploadId(): string {
  return "upl_" + crypto.randomBytes(16).toString("hex");
}

// ── router ────────────────────────────────────────────────────────────────────

export const ingestUploadsRouter = Router();

ingestUploadsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const kind = typeof req.query.kind === "string" ? req.query.kind : undefined;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 50)));

    const where = {
      userId: auth.user.id,
      ...(kind ? { kind } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.uploadAsset.findMany({
        where,
        select: UPLOAD_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.uploadAsset.count({ where }),
    ]);

    return res.json({
      data: items.map((a) => ({
        uploadId: a.id,
        kind: a.kind,
        url: a.url,
        mimeType: a.mimeType,
        bytes: a.bytes,
        originalName: a.originalName,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total },
    });
  } catch (error) {
    return next(error);
  }
});

ingestUploadsRouter.post("/", async (req, res, next) => {
  try {
    // API key auth — session tokens are rejected by requireApiKeyAuth
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const kind = req.query.kind as string;
    if (kind !== "audio" && kind !== "image") {
      return res.status(400).json({
        error: "invalid_kind",
        message: "Query param 'kind' must be 'audio' or 'image'.",
      });
    }

    const upload = kind === "audio" ? audioUpload : imageUpload;
    const subdir = kind === "audio" ? "audio" : "images";

    upload.single("file")(req, res, async (multerErr) => {
      if (multerErr instanceof multer.MulterError) {
        if (multerErr.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            error: "file_too_large",
            message: "File exceeds the 100 MB limit.",
          });
        }
        return res.status(400).json({ error: "upload_error", message: multerErr.message });
      }
      if (multerErr) return next(multerErr);

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          error: "file_required",
          message: "Multipart field 'file' is required.",
        });
      }

      const ext = path.extname(file.originalname).toLowerCase();

      // Validate MIME type + extension together
      if (!isAllowed(kind, file.mimetype, ext)) {
        await fs.unlink(file.path).catch(() => undefined);
        const allowed = ALLOWED[kind];
        return res.status(415).json({
          error: "unsupported_media_type",
          message: `Unsupported file type. Allowed extensions: ${[...allowed.exts].join(", ")}.`,
        });
      }

      const url = fileUrl(subdir, file.filename);
      const storageKey = `${subdir}/${file.filename}`;
      const originalName = path.basename(file.originalname);
      const uploadId = generateUploadId();

      try {
        await prisma.uploadAsset.create({
          data: {
            id: uploadId,
            userId: auth.user.id,
            kind,
            url,
            storageKey,
            mimeType: file.mimetype,
            bytes: file.size,
            originalName,
            status: "READY",
          },
        });
      } catch (dbErr) {
        // Clean up the file if we can't record it
        await fs.unlink(file.path).catch(() => undefined);
        return next(dbErr);
      }

      return res.status(201).json({
        uploadId,
        url,
        kind,
        mimeType: file.mimetype,
        bytes: file.size,
        originalName,
      });
    });
  } catch (error) {
    return next(error);
  }
});
