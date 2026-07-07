function decodeMetaContent(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function extractMetaTag(html: string, key: string, attr: "property" | "name"): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\s+${attr}="${escapedKey}"\\s+content="([^"]*)"`, "i"),
    new RegExp(`<meta\\s+content="([^"]*)"\\s+${attr}="${escapedKey}"`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeMetaContent(match[1]);
  }

  return null;
}

export function extractOgImageUrl(html: string): string | null {
  return extractMetaTag(html, "og:image", "property");
}

export function extractThumbnailUrl(html: string): string | null {
  return extractMetaTag(html, "thumbnail", "name");
}

export function isJpegBuffer(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export function imagePathFromUrl(imageUrl: string, baseOrigin: string): string {
  const parsed = new URL(imageUrl, baseOrigin);
  const base = new URL(baseOrigin);
  if (parsed.origin !== base.origin) {
    return imageUrl;
  }
  return `${parsed.pathname}${parsed.search}`;
}
