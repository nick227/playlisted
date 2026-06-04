import { describe, expect, it } from "vitest";

import { mergeGenreRefs, pickDisplayGenre } from "../lib/effectiveGenres.js";

const rock = { id: "1", name: "Rock", slug: "rock" };
const ambient = { id: "2", name: "Ambient", slug: "ambient" };
const jazz = { id: "3", name: "Jazz", slug: "jazz" };

describe("pickDisplayGenre", () => {
  it("prefers the active genre slug when present in merged tags", () => {
    const genre = pickDisplayGenre(
      [{ tag: rock }],
      [{ tag: ambient }],
      "ambient",
    );
    expect(genre).toEqual(ambient);
  });

  it("prefers recording genres over playlist when no slug filter", () => {
    const genre = pickDisplayGenre([{ tag: rock }], [{ tag: ambient }]);
    expect(genre).toEqual(rock);
  });

  it("falls back to playlist genre when recording has none", () => {
    const genre = pickDisplayGenre([], [{ tag: jazz }]);
    expect(genre).toEqual(jazz);
  });

  it("returns null when no genres exist", () => {
    expect(pickDisplayGenre([], [])).toBeNull();
  });
});

describe("mergeGenreRefs", () => {
  it("dedupes and sorts alphabetically", () => {
    expect(mergeGenreRefs([{ tag: rock }], [{ tag: ambient }])).toEqual([ambient, rock]);
  });
});
