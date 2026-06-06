import { playlistPath, playlistRecordingPath } from "@/lib/routes";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

export function recordingShareUrl(params: {
  playlistId: string;
  recordingId: string;
  title: string;
  username?: string | null;
  slug?: string | null;
}): string {
  return absoluteUrl(
    playlistRecordingPath(
      {
        id: params.playlistId,
        username: params.username,
        slug: params.slug,
      },
      { title: params.title },
    ),
  );
}

export function playlistShareUrl(params: {
  id: string;
  username?: string | null;
  slug?: string | null;
}): string {
  return absoluteUrl(playlistPath(params));
}

export type ShareResult = "shared" | "copied" | "failed";

export async function shareContent(url: string, title?: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ url, title });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "failed";
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
