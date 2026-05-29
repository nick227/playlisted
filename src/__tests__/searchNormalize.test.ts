import { describe, expect, it } from "vitest";

import { normalizeSearchResponse } from "../../packages/client-sdk/src/searchNormalize.js";

describe("normalizeSearchResponse", () => {
  it("defaults missing groups to empty arrays", () => {
    expect(normalizeSearchResponse({ songs: [], playlists: [], artists: [] })).toEqual({
      songs: [],
      playlists: [],
      artists: [],
      genres: [],
    });
  });

  it("preserves provided genres", () => {
    expect(
      normalizeSearchResponse({
        songs: [],
        playlists: [],
        artists: [],
        genres: [{ id: "g1", name: "Jazz", slug: "jazz", songCount: 3 }],
      }),
    ).toEqual({
      songs: [],
      playlists: [],
      artists: [],
      genres: [{ id: "g1", name: "Jazz", slug: "jazz", songCount: 3 }],
    });
  });
});
