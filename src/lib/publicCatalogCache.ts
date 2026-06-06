import { clearPublicJsonCache } from "./publicJsonCache.js";

const PUBLIC_CATALOG_CACHE_NAMESPACES = [
  "homepage",
  "library-genres",
  "library-playlist-genres",
  "library-artists",
  "random-playlists",
  "chart-top-songs",
  "chart-top-playlists",
  "chart-top-artists",
];

export function clearPublicCatalogCaches() {
  for (const namespace of PUBLIC_CATALOG_CACHE_NAMESPACES) {
    clearPublicJsonCache(namespace);
  }
}
