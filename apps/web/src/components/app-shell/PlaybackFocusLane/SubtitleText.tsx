import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

type SubtitleTextProps = {
  text: string;
  variant: "subtitle" | "fallbackSubtitle";
  source?: "title-intro" | "artist-info" | "song-info" | "system";
};

export function SubtitleText({ text, variant, source }: SubtitleTextProps) {
  const isTitleIntro = variant === "fallbackSubtitle" && source === "title-intro";

  return (
    <p
      className={`focus-lane__text${
        variant === "fallbackSubtitle" ? " focus-lane__text--fallback" : ""
      }${isTitleIntro ? " focus-lane__text--title-intro" : ""}`}
    >
      {text}
    </p>
  );
}

export function fixtureToSubtitleProps(fixture: PlaybackFocusFixture) {
  if (fixture.type === "subtitle") {
    return { text: fixture.text, variant: "subtitle" as const };
  }
  if (fixture.type === "fallbackSubtitle") {
    return {
      text: fixture.text,
      variant: "fallbackSubtitle" as const,
      source: fixture.source,
    };
  }
  return null;
}
