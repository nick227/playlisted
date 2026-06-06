import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export const IMAGE_MAX_DIMENSION = Number(process.env.IMAGE_MAX_DIMENSION ?? 1920);
export const OPTIMIZED_IMAGE_MAX_BYTES = Number(process.env.OPTIMIZED_IMAGE_MAX_BYTES ?? 5 * 1024 * 1024);

export type OptimizedImageResult = {
  width: number | null;
  height: number | null;
  bytes: number;
  optimized: boolean;
};

function outputForExtension(ext: string, pipeline: sharp.Sharp) {
  if (ext === ".jpg" || ext === ".jpeg") {
    return pipeline.jpeg({ quality: 82, mozjpeg: true });
  }
  if (ext === ".webp") {
    return pipeline.webp({ quality: 82 });
  }
  return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
}

export async function optimizeImageFile(filePath: string): Promise<OptimizedImageResult> {
  const ext = path.extname(filePath).toLowerCase();
  const original = await fs.stat(filePath);
  const metadata = await sharp(filePath).metadata();
  const shouldResize =
    (metadata.width != null && metadata.width > IMAGE_MAX_DIMENSION) ||
    (metadata.height != null && metadata.height > IMAGE_MAX_DIMENSION);

  let pipeline = sharp(filePath).rotate();
  if (shouldResize) {
    pipeline = pipeline.resize({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const tempPath = `${filePath}.optimizing-${process.pid}-${Date.now()}`;
  try {
    await outputForExtension(ext, pipeline).toFile(tempPath);
    const optimized = await fs.stat(tempPath);

    if (optimized.size >= original.size && !shouldResize) {
      await fs.unlink(tempPath).catch(() => undefined);
      return {
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        bytes: original.size,
        optimized: false,
      };
    }

    await fs.rename(tempPath, filePath);
    const nextMetadata = await sharp(filePath).metadata();
    return {
      width: nextMetadata.width ?? null,
      height: nextMetadata.height ?? null,
      bytes: optimized.size,
      optimized: true,
    };
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw error;
  }
}
