import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

type SubtitleTextProps = {
  text: string;
  variant: "subtitle" | "fallbackSubtitle";
  source?: "title-intro" | "artist-info" | "song-info" | "system";
};

type FinalFallbackTextProps = {
  title: string;
  artistName?: string | null;
};

export function FinalFallbackText({ title, artistName }: FinalFallbackTextProps) {
  return (
    <div className="focus-lane__text focus-lane__text--fallback focus-lane__text--final-fallback">
      <p className="focus-lane__final-title">{title}</p>
      {artistName ? <p className="focus-lane__final-artist">{artistName}</p> : null}
    </div>
  );
}

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
