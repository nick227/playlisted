import fs from "node:fs/promises";
import path from "node:path";

import { slugify } from "../../src/utils/slug.js";
import { getProjectRoot } from "./loadSeedData.js";

const MIME_BY_EXT: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export type ImportedMedia = {
  url: string;
  mimeType: string;
  bytes: bigint;
  relativePath: string;
};

function mimeFromExtension(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export function getUploadsDir() {
  return path.resolve(getProjectRoot(), process.env.UPLOADS_DIR ?? "uploads");
}

export async function resetUploadsDir() {
  const uploadsDir = getUploadsDir();
  await fs.rm(uploadsDir, { recursive: true, force: true });
  await fs.mkdir(path.join(uploadsDir, "audio"), { recursive: true });
  await fs.mkdir(path.join(uploadsDir, "images"), { recursive: true });
}

export async function importMediaFile(options: {
  mediaRoot: string;
  relativeFile: string;
  assetKey: string;
  kind: "audio" | "images";
  mediaBaseUrl: string;
}): Promise<ImportedMedia> {
  const projectRoot = getProjectRoot();
  const sourcePath = path.join(projectRoot, options.mediaRoot, options.relativeFile);

  try {
    await fs.access(sourcePath);
  } catch {
    throw new Error(`Media file not found: ${sourcePath}`);
  }

  const ext = path.extname(options.relativeFile);
  const safeKey = slugify(options.assetKey) || "asset";
  const destFileName = `${safeKey}${ext}`;
  const relativePath = path.posix.join(options.kind, destFileName);
  const destPath = path.join(getUploadsDir(), relativePath);

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.copyFile(sourcePath, destPath);

  const stat = await fs.stat(destPath);
  const baseUrl = options.mediaBaseUrl.replace(/\/$/, "");

  return {
    url: `${baseUrl}/${relativePath.replace(/\\/g, "/")}`,
    mimeType: mimeFromExtension(options.relativeFile),
    bytes: BigInt(stat.size),
    relativePath,
  };
}
