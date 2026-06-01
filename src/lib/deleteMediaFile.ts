import fs from "node:fs/promises";
import path from "node:path";

const uploadsDir = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "uploads");

function mediaBaseUrl(): string | null {
  return process.env.MEDIA_BASE_URL?.replace(/\/$/, "") ?? null;
}

/** Map a stored media URL to a path relative to the uploads root, or null if not local. */
export function mediaUrlToRelativePath(url: string): string | null {
  const withoutQuery = url.split("?")[0] ?? url;

  const uploadsMatch = withoutQuery.match(/\/uploads\/(audio|images)\/([^/?#]+)$/);
  if (uploadsMatch) {
    return `${uploadsMatch[1]}/${uploadsMatch[2]}`;
  }

  const baseUrl = mediaBaseUrl();
  if (baseUrl && withoutQuery.startsWith(`${baseUrl}/`)) {
    const rest = withoutQuery.slice(baseUrl.length + 1);
    if (/^(audio|images)\/[^/?#]+$/.test(rest)) {
      return rest;
    }
  }

  return null;
}

export async function deleteMediaUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;

  const relative = mediaUrlToRelativePath(url);
  if (!relative) return;

  const filePath = path.resolve(uploadsDir, relative);
  const uploadsRoot = path.resolve(uploadsDir);
  if (filePath !== uploadsRoot && !filePath.startsWith(`${uploadsRoot}${path.sep}`)) {
    return;
  }

  await fs.unlink(filePath).catch(() => undefined);
}

export async function deleteRecordingMedia(recording: {
  audioUrl: string;
  artworkUrl: string | null;
}): Promise<void> {
  await Promise.all([deleteMediaUrl(recording.audioUrl), deleteMediaUrl(recording.artworkUrl)]);
}
