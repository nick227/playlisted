/** Ensures all search groups exist (e.g. older cached responses missing `genres`). */
export function normalizeSearchResponse(data) {
    return {
        songs: data?.songs ?? [],
        playlists: data?.playlists ?? [],
        artists: data?.artists ?? [],
        genres: data?.genres ?? [],
    };
}
