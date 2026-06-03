import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import type { Request, Response } from "express";
import multer from "multer";

import { fileTooLargeMessage, UPLOAD_MAX_BYTES, type UploadMediaKind } from "./uploadPolicy.js";
import { slugify } from "../utils/slug.js";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");
const mediaBaseUrl = process.env.MEDIA_BASE_URL?.replace(/\/$/, "") ?? null;

function uploadSubdir(kind: UploadMediaKind): "audio" | "images" {
  return kind === "audio" ? "audio" : "images";
}

export function storedUploadUrl(subdir: string, filename: string): string {
  if (mediaBaseUrl) return `${mediaBaseUrl}/${subdir}/${filename}`;
  return `/uploads/${subdir}/${filename}`;
}

export function storedUploadUrlFromRequest(
  req: Request,
  subdir: string,
  filename: string,
): string {
  if (mediaBaseUrl) return `${mediaBaseUrl}/${subdir}/${filename}`;
  void req;
  return `/uploads/${subdir}/${filename}`;
}

export function createDiskMulter(kind: UploadMediaKind) {
  const subdir = uploadSubdir(kind);
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
      const ext = path.extname(file.originalname).toLowerCase() || ".bin";
      const base = slugify(path.basename(file.originalname, path.extname(file.originalname))) || "file";
      const rand = crypto.randomBytes(8).toString("hex");
      cb(null, `${base}-${rand}${ext}`);
    },
  });

  return multer({ storage, limits: { fileSize: UPLOAD_MAX_BYTES[kind] } });
}

export const studioAudioUpload = createDiskMulter("audio");
export const studioImageUpload = createDiskMulter("image");
export const ingestAudioUpload = createDiskMulter("audio");
export const ingestImageUpload = createDiskMulter("image");

export function handleMulterSingleError(
  err: unknown,
  kind: UploadMediaKind,
  res: Response,
  next: (err: unknown) => void,
): boolean {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "file_too_large", message: fileTooLargeMessage(kind) });
      return true;
    }
    res.status(400).json({ error: "upload_error", message: err.message });
    return true;
  }
  if (err) {
    next(err);
    return true;
  }
  return false;
}

