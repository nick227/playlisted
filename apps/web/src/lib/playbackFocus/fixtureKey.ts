import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

export function focusLaneFixtureKey(fixture: PlaybackFocusFixture | null): string {
  if (!fixture || fixture.type === "none") return "none";
  if (fixture.type === "subtitle") return `subtitle:${fixture.cueId}`;
  if (fixture.type === "fallbackSubtitle") return `fallback:${fixture.key}`;
  if (fixture.type === "finalFallback") return "final:artist-visual";
  const _exhaustive: never = fixture;
  return _exhaustive;
}
