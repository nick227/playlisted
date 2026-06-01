import { describe, it, expect } from "vitest";

import {
  canViewerAccessPlaylist,
  isPlaylistBrowsable,
  isPlaylistLinkAccessible,
  PUBLIC_PUBLISHED_PLAYLIST,
} from "../lib/publicPlaylistFilter.js";
import { BROWSABLE_RECORDING } from "../lib/publicRecordingFilter.js";

const PUBLIC_PUBLISHED = { visibility: "PUBLIC", status: "PUBLISHED" };
const PRIVATE_PUBLISHED = { visibility: "PRIVATE", status: "PUBLISHED" };
const UNLISTED_PUBLISHED = { visibility: "UNLISTED", status: "PUBLISHED" };

describe("playlist visibility helpers", () => {
  it("defines public published playlist filter", () => {
    expect(PUBLIC_PUBLISHED_PLAYLIST).toEqual(PUBLIC_PUBLISHED);
  });

  it("treats only PUBLIC+PUBLISHED as browsable", () => {
    expect(isPlaylistBrowsable(PUBLIC_PUBLISHED)).toBe(true);
    expect(isPlaylistBrowsable(PRIVATE_PUBLISHED)).toBe(false);
    expect(isPlaylistBrowsable(UNLISTED_PUBLISHED)).toBe(false);
  });

  it("allows link access for PUBLIC or UNLISTED when published", () => {
    expect(isPlaylistLinkAccessible(PUBLIC_PUBLISHED)).toBe(true);
    expect(isPlaylistLinkAccessible(UNLISTED_PUBLISHED)).toBe(true);
    expect(isPlaylistLinkAccessible(PRIVATE_PUBLISHED)).toBe(false);
  });

  it("blocks anonymous viewers from private playlists", () => {
    expect(canViewerAccessPlaylist(PRIVATE_PUBLISHED, {}, "owner-1")).toBe(false);
    expect(canViewerAccessPlaylist(PUBLIC_PUBLISHED, {}, "owner-1")).toBe(true);
  });

  it("requires browsable canonical playlist for library songs", () => {
    expect(BROWSABLE_RECORDING).toEqual({
      visibility: "PUBLIC",
      status: "PUBLISHED",
      publishedPlaylist: PUBLIC_PUBLISHED_PLAYLIST,
    });
  });
});
