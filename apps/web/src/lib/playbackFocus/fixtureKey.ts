import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

export function focusLaneFixtureKey(fixture: PlaybackFocusFixture | null): string {
  if (!fixture || fixture.type === "none") return "none";

  switch (fixture.type) {
    case "subtitle":
      return `subtitle:${fixture.cueId}`;
    case "titleIntro":
      return `title-intro:${fixture.key}`;
    case "finalFallback":
      return `final:${fixture.key}`;
    default: {
      const _exhaustive: never = fixture;
      return _exhaustive;
    }
  }
}
