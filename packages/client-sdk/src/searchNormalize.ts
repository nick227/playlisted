import type { components } from "./generated/schema.js";

type SearchResponse = components["schemas"]["SearchResponse"];

/** Ensures all search groups exist (e.g. older cached responses missing `genres`). */
export function normalizeSearchResponse(
  data: Partial<SearchResponse> | null | undefined,
): SearchResponse {
  return {
    songs: data?.songs ?? [],
    playlists: data?.playlists ?? [],
    artists: data?.artists ?? [],
    genres: data?.genres ?? [],
  };
}
