import { describe, expect, it } from "vitest";

import { playlistTitleOrSlugMatch, SEARCHABLE_PLAYLIST } from "../lib/searchQuery.js";

describe("searchQuery", () => {
  it("normalizes spaced queries to slug matches", () => {
    expect(playlistTitleOrSlugMatch("new and goood")).toEqual(
      expect.arrayContaining([
        { title: { contains: "new and goood" } },
        { slug: { contains: "new and goood" } },
        { slug: "new-and-goood" },
        { slug: { contains: "new-and-goood" } },
      ]),
    );
  });

  it("includes public draft playlists in searchable filter", () => {
    expect(SEARCHABLE_PLAYLIST).toEqual({
      OR: [
        { visibility: "PUBLIC", status: { in: ["PUBLISHED", "DRAFT"] } },
        { visibility: "UNLISTED", status: "PUBLISHED" },
      ],
    });
  });
});
