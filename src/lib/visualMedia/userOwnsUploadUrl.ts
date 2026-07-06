import { normalizeUploadUrl } from "../mediaUrls.js";
import { prisma } from "../prisma.js";
import { listUserLibraryImages } from "./listUserLibraryImages.js";

export async function userOwnsUploadUrl(userId: string, url: string): Promise<boolean> {
  const normalized = normalizeUploadUrl(url);
  if (!normalized) return false;

  const [library, assets] = await Promise.all([
    listUserLibraryImages(userId),
    prisma.visualMediaAsset.findMany({
      where: { ownerId: userId },
      select: { url: true, thumbnailUrl: true },
    }),
  ]);

  if (library.some((item) => normalizeUploadUrl(item.url) === normalized)) {
    return true;
  }

  return assets.some(
    (asset) =>
      normalizeUploadUrl(asset.url) === normalized ||
      normalizeUploadUrl(asset.thumbnailUrl) === normalized,
  );
}
