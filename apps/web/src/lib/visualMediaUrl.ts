/** Normalize upload URLs so `/uploads/...` paths compare equal across relative/absolute forms. */
export function normalizeVisualMediaUrl(url: string): string {
  if (url.startsWith("/uploads/")) return url;

  try {
    const parsed = url.startsWith("/") ? new URL(url, "http://localhost") : new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) return parsed.pathname;
    return parsed.href;
  } catch {
    return url;
  }
}

/** Storage path key for an upload URL, or null when not an owned upload path. */
export function visualMediaUploadPathKey(url: string): string | null {
  const normalized = normalizeVisualMediaUrl(url);
  if (normalized.startsWith("/uploads/")) {
    return normalized.slice("/uploads/".length);
  }
  return null;
}
