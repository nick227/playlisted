import { describe, expect, it } from "vitest";
import { resolvePlaybackArtwork } from "./playbackArtwork";

describe("playback artwork lifecycle", () => {
  it.each(["playing", "paused", "loading", "error"])("retains selected song artwork while %s", (playerState) => {
    expect(resolvePlaybackArtwork({ track: { source: "site", artworkUrl: "cover" }, playerState, radioHasPlaybackSession: false })).toBe("cover");
  });

  it("clears after close or queue exhaustion without falling back to old radio artwork", () => {
    expect(resolvePlaybackArtwork({ track: null, playerState: "idle", radioHasPlaybackSession: true })).toBeNull();
    expect(resolvePlaybackArtwork({ track: { source: "site", artworkUrl: "cover" }, playerState: "idle", radioHasPlaybackSession: true })).toBeNull();
  });

  it("retains radio artwork on pause and between tracks, but clears when its session ends", () => {
    const input = { track: { source: "radio" as const, artworkUrl: "cover" }, playerState: "idle", radioHasPlaybackSession: true };
    expect(resolvePlaybackArtwork(input)).toBe("cover");
    expect(resolvePlaybackArtwork({ ...input, radioHasPlaybackSession: false })).toBeNull();
  });

  it("uses the next song's artwork, and clears when the replacement has no art", () => {
    const input = { track: { source: "site" as const, artworkUrl: "next-cover" }, playerState: "loading", radioHasPlaybackSession: false };
    expect(resolvePlaybackArtwork(input)).toBe("next-cover");
    expect(resolvePlaybackArtwork({ ...input, track: { source: "site" } })).toBeNull();
  });
});
