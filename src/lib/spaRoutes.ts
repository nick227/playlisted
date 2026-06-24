import path from "node:path";

const SPA_EXCLUDED_PREFIXES = ["/api/", "/uploads/", "/docs", "/openapi.yaml"];
const STATIC_ASSET_PREFIXES = ["/assets/"];
const STATIC_ASSET_EXTENSIONS = new Set([
  ".css",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".map",
  ".png",
  ".svg",
  ".txt",
  ".webmanifest",
  ".webp",
  ".woff",
  ".woff2",
]);

export function isSpaRoute(pathname: string) {
  if (SPA_EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (STATIC_ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  return !STATIC_ASSET_EXTENSIONS.has(path.extname(pathname).toLowerCase());
}
