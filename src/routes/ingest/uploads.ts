import crypto from "node:crypto";
import fs from "node:fs/promises";

import { Router } from "express";

import { requireApiKeyAuth } from "../../lib/apiKeyAuth.js";
import { prisma } from "../../lib/prisma.js";
import {
  handleMulterSingleError,
  ingestAudioUpload,
  ingestImageUpload,
  storedUploadUrl,
} from "../../lib/uploadMulter.js";
import type { UploadMediaKind } from "../../lib/uploadPolicy.js";
import { rejectDisallowedUpload } from "../../lib/uploadValidate.js";

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

function generateUploadId(): string {
  return "upl_" + crypto.randomBytes(16).toString("hex");
}

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
    const auth = await requireApiKeyAuth(req, res);
    if (!auth) return;

    const kind = req.query.kind as string;
    if (kind !== "audio" && kind !== "image") {
      return res.status(400).json({
        error: "invalid_kind",
        message: "Query param 'kind' must be 'audio' or 'image'.",
      });
    }

    const mediaKind = kind as UploadMediaKind;
    const upload = kind === "audio" ? ingestAudioUpload : ingestImageUpload;
    const subdir = kind === "audio" ? "audio" : "images";

    upload.single("file")(req, res, async (multerErr) => {
      if (handleMulterSingleError(multerErr, mediaKind, res, next)) return;

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          error: "file_required",
          message: "Multipart field 'file' is required.",
        });
      }

      if (await rejectDisallowedUpload(mediaKind, file, res)) return;

      const url = storedUploadUrl(subdir, file.filename);
      const storageKey = `${subdir}/${file.filename}`;
      const originalName = file.originalname;
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
