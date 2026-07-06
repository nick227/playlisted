import fs from "node:fs/promises";
import path from "node:path";

import { normalizeUploadUrl } from "../mediaUrls.js";
import { prisma } from "../prisma.js";
import { readStoredUploadMetadata } from "./readStoredUploadMetadata.js";
import { userOwnsUploadUrl } from "./userOwnsUploadUrl.js";
import { dtoMediaTypeToPrisma } from "./types.js";
import type { VisualMediaAsset } from "@prisma/client";

type ImportVisualMediaFromUrlInput = {
  url: string;
  originalName: string;
  kind: "image" | "video";
};

function sanitizeOriginalName(name: string): string {
  const trimmed = name.trim();
  return (trimmed || "imported-media").slice(0, 255);
}

async function findExistingOwnedAsset(userId: string, normalizedUrl: string, kind: "image" | "video") {
  const assets = await prisma.visualMediaAsset.findMany({
    where: {
      ownerId: userId,
      mediaType: dtoMediaTypeToPrisma(kind),
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    assets.find(
      (asset) =>
        normalizeUploadUrl(asset.url) === normalizedUrl ||
        normalizeUploadUrl(asset.thumbnailUrl) === normalizedUrl,
    ) ?? null
  );
}

export async function importVisualMediaFromUrl(
  userId: string,
  input: ImportVisualMediaFromUrlInput,
): Promise<VisualMediaAsset> {
  const normalizedUrl = normalizeUploadUrl(input.url);
  if (!normalizedUrl?.startsWith("/uploads/")) {
    throw new Error("import_url_must_be_upload");
  }

  const existing = await findExistingOwnedAsset(userId, normalizedUrl, input.kind);
  if (existing) return existing;

  if (!(await userOwnsUploadUrl(userId, normalizedUrl))) {
    throw new Error("import_url_not_owned");
  }

  const metadata = await readStoredUploadMetadata(normalizedUrl, input.kind);

  return prisma.visualMediaAsset.create({
    data: {
      ownerId: userId,
      mediaType: dtoMediaTypeToPrisma(input.kind),
      storageKey: null,
      url: normalizedUrl,
      thumbnailUrl: input.kind === "image" ? normalizedUrl : null,
      originalName: sanitizeOriginalName(input.originalName),
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      durationMs: null,
      width: null,
      height: null,
    },
  });
}
