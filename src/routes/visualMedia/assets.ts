import fs from "node:fs/promises";
import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js";
import { persistUploadedFile } from "../lib/storage/uploadStorage.js";
import {
  handleMulterSingleError,
  studioImageUpload,
  studioVideoUpload,
} from "../lib/uploadMulter.js";
import { rejectDisallowedUpload } from "../lib/uploadValidate.js";
import { dtoMediaTypeToPrisma } from "../lib/visualMedia/types.js";
import { mapVisualMediaAsset } from "../lib/visualMedia/mapDto.js";

export const visualMediaAssetsRouter = Router();

visualMediaAssetsRouter.get("/", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const assets = await prisma.visualMediaAsset.findMany({
      where: { ownerId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({ items: assets.map(mapVisualMediaAsset) });
  } catch (error) {
    next(error);
  }
});

visualMediaAssetsRouter.post("/upload", (req, res, next) => {
  const kind = req.query.kind === "video" ? "video" : "image";
  const upload = kind === "video" ? studioVideoUpload : studioImageUpload;

  upload.single("file")(req, res, async (multerErr) => {
    if (handleMulterSingleError(multerErr, kind, res, next)) return;
    return handleVisualUpload(req, res, next, kind);
  });
});

async function handleVisualUpload(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  next: (error: unknown) => void,
  kind: "video" | "image",
) {
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

    if (await rejectDisallowedUpload(kind, file, res)) return;

    const subdir = kind === "video" ? "videos" : "images";
    let stored;
    try {
      stored = await persistUploadedFile({
        subdir,
        filename: file.filename,
        filePath: file.path,
        mimeType: file.mimetype,
      });
    } catch (storageErr) {
      await fs.unlink(file.path).catch(() => undefined);
      return next(storageErr);
    }

    const asset = await prisma.visualMediaAsset.create({
      data: {
        ownerId: auth.user.id,
        mediaType: dtoMediaTypeToPrisma(kind),
        storageKey: stored.storageKey ?? null,
        url: stored.url,
        thumbnailUrl: kind === "image" ? stored.url : null,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
    });

    res.status(201).json(mapVisualMediaAsset(asset));
  } catch (error) {
    next(error);
  }
}
