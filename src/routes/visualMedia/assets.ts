import fs from "node:fs/promises";
import type { Express } from "express";
import { Router } from "express";

import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../lib/requireAuth.js";
import { deleteStoredUpload, storageKeyFromUploadUrl } from "../../lib/storage/deleteStoredUpload.js";
import { persistUploadedFile } from "../../lib/storage/uploadStorage.js";
import {
  handleMulterSingleError,
  studioImageUpload,
  studioVisualVideoUpload,
} from "../../lib/uploadMulter.js";
import { rejectDisallowedUpload, resolveUploadMimeType } from "../../lib/uploadValidate.js";
import { dtoMediaTypeToPrisma } from "../../lib/visualMedia/types.js";
import { listUserLibraryImages } from "../../lib/visualMedia/listUserLibraryImages.js";
import { importVisualMediaFromUrl } from "../../lib/visualMedia/importVisualMediaFromUrl.js";
import { mapVisualMediaAsset } from "../../lib/visualMedia/mapDto.js";
import { parseVisualUploadMetadata } from "../../lib/visualMedia/validateUploadMetadata.js";

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

visualMediaAssetsRouter.get("/library-images", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const items = await listUserLibraryImages(auth.user.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

visualMediaAssetsRouter.post("/import-url", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const body = req.body as { url?: string; originalName?: string; kind?: string };
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const originalName = typeof body.originalName === "string" ? body.originalName.trim() : "imported-media";
    const kind = body.kind === "video" ? "video" : "image";

    if (!url) {
      return res.status(400).json({
        error: "url_required",
        message: "url is required.",
      });
    }

    try {
      const asset = await importVisualMediaFromUrl(auth.user.id, { url, originalName, kind });
      res.status(201).json(mapVisualMediaAsset(asset));
    } catch (error) {
      const message = error instanceof Error ? error.message : "import_failed";
      if (message === "import_url_not_owned") {
        return res.status(403).json({
          error: "import_url_not_owned",
          message: "You can only import uploads from your own library.",
        });
      }
      if (message === "import_url_must_be_upload" || message === "upload_url_invalid") {
        return res.status(400).json({
          error: "import_url_invalid",
          message: "Only existing Playlisted upload URLs can be linked without re-uploading.",
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

visualMediaAssetsRouter.post("/upload", async (req, res, next) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const kind = req.query.kind === "video" ? "video" : "image";

  if (kind === "video") {
    studioVisualVideoUpload(req, res, async (multerErr) => {
      if (handleMulterSingleError(multerErr, "video", res, next)) return;
      const files = req.files as { file?: Express.Multer.File[]; thumbnail?: Express.Multer.File[] } | undefined;
      return handleVisualUpload(req, res, next, "video", auth, {
        file: files?.file?.[0],
        thumbnail: files?.thumbnail?.[0],
      });
    });
    return;
  }

  studioImageUpload.single("file")(req, res, async (multerErr) => {
    if (handleMulterSingleError(multerErr, "image", res, next)) return;
    return handleVisualUpload(req, res, next, "image", auth, { file: req.file ?? undefined });
  });
});

type VisualUploadFiles = {
  file?: Express.Multer.File;
  thumbnail?: Express.Multer.File;
};

async function handleVisualUpload(
  req: Parameters<typeof requireAuth>[0],
  res: Parameters<typeof requireAuth>[1],
  next: (error: unknown) => void,
  kind: "video" | "image",
  auth: NonNullable<Awaited<ReturnType<typeof requireAuth>>>,
  files: VisualUploadFiles,
) {
  const startedAt = Date.now();
  let uploadLabel = "unknown";
  let stored: Awaited<ReturnType<typeof persistUploadedFile>> | null = null;
  let thumbStored: Awaited<ReturnType<typeof persistUploadedFile>> | null = null;
  const { file, thumbnail } = files;

  try {
    if (!file) {
      return res.status(400).json({
        error: "file_required",
        message: "Multipart field 'file' is required.",
      });
    }

    uploadLabel = file.originalname;
    console.info("[visual-upload] received", {
      kind,
      name: file.originalname,
      bytes: file.size,
      mimeType: file.mimetype,
      hasThumbnail: Boolean(thumbnail),
      userId: auth.user.id,
    });

    if (await rejectDisallowedUpload(kind, file, res, { allowExtensionFallback: true })) return;

    const metadata = parseVisualUploadMetadata(req.body as Record<string, unknown>, kind);
    const subdir = kind === "video" ? "videos" : "images";
    const mimeType = resolveUploadMimeType(kind, file);

    try {
      stored = await persistUploadedFile({
        subdir,
        filename: file.filename,
        filePath: file.path,
        mimeType,
      });
    } catch (storageErr) {
      await fs.unlink(file.path).catch(() => undefined);
      console.error("[visual-upload] storage failed", {
        kind,
        name: file.originalname,
        bytes: file.size,
        userId: auth.user.id,
        error: storageErr,
      });
      return next(storageErr);
    }

    if (thumbnail) {
      if (await rejectDisallowedUpload("image", thumbnail, res, { allowExtensionFallback: true })) {
        await deleteStoredUpload(stored.storageKey).catch(() => undefined);
        return;
      }
      try {
        thumbStored = await persistUploadedFile({
          subdir: "images",
          filename: thumbnail.filename,
          filePath: thumbnail.path,
          mimeType: resolveUploadMimeType("image", thumbnail),
        });
      } catch (storageErr) {
        await deleteStoredUpload(stored.storageKey).catch(() => undefined);
        await fs.unlink(thumbnail.path).catch(() => undefined);
        return next(storageErr);
      }
    }

    const asset = await prisma.visualMediaAsset.create({
      data: {
        ownerId: auth.user.id,
        mediaType: dtoMediaTypeToPrisma(kind),
        storageKey: stored.storageKey ?? null,
        url: stored.url,
        thumbnailUrl: kind === "image" ? stored.url : thumbStored?.url ?? null,
        originalName: file.originalname,
        mimeType,
        sizeBytes: file.size,
        durationMs: metadata.durationMs,
        width: metadata.width,
        height: metadata.height,
      },
    });

    console.info("[visual-upload] complete", {
      kind,
      name: uploadLabel,
      assetId: asset.id,
      provider: stored.provider,
      ms: Date.now() - startedAt,
      userId: auth.user.id,
    });

    res.status(201).json(mapVisualMediaAsset(asset));
  } catch (error) {
    if (thumbStored) {
      await deleteStoredUpload(thumbStored.storageKey).catch(() => undefined);
    }
    if (stored) {
      await deleteStoredUpload(stored.storageKey).catch(() => undefined);
    } else if (file) {
      await fs.unlink(file.path).catch(() => undefined);
    }
    if (thumbnail && !thumbStored) {
      await fs.unlink(thumbnail.path).catch(() => undefined);
    }
    console.error("[visual-upload] failed", {
      kind,
      name: uploadLabel,
      ms: Date.now() - startedAt,
      error,
    });
    next(error);
  }
}

visualMediaAssetsRouter.delete("/:assetId", async (req, res, next) => {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    const assetId = req.params.assetId?.trim() ?? "";
    if (!assetId) {
      return res.status(400).json({
        error: "asset_id_required",
        message: "assetId is required.",
      });
    }

    const asset = await prisma.visualMediaAsset.findFirst({
      where: { id: assetId, ownerId: auth.user.id },
    });
    if (!asset) {
      return res.status(404).json({
        error: "media_asset_not_found",
        message: "Visual media asset was not found.",
      });
    }

    await deleteStoredUpload(asset.storageKey);
    if (asset.thumbnailUrl && asset.thumbnailUrl !== asset.url) {
      const thumbKey = storageKeyFromUploadUrl(asset.thumbnailUrl);
      if (thumbKey) {
        await deleteStoredUpload(thumbKey).catch(() => undefined);
      }
    }
    await prisma.visualMediaAsset.delete({ where: { id: asset.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
