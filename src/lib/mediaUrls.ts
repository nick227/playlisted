export function normalizeUploadUrl(url: string | null): string | null {
  if (!url) return url;
  if (url.startsWith("/uploads/")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) {
      return parsed.pathname;
    }
  } catch {
    // Keep non-URL values as-is.
  }

  return url;
}

export function resolveRecordingArtworkUrl(
  recording: { artworkUrl: string | null },
  playlist?: { coverArtUrl?: string | null } | null,
): string | null {
  return normalizeUploadUrl(recording.artworkUrl ?? playlist?.coverArtUrl ?? null);
}
