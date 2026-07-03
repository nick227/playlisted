import type { CSSProperties } from "react";

import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

type SubtitleTextProps = {
  text: string;
  variant: "subtitle" | "fallbackSubtitle";
  source?: "title-intro" | "artist-info" | "song-info" | "system";
  customStyle?: CSSProperties;
};

type FinalFallbackTextProps = {
  title: string;
  artistName?: string | null;
  customStyle?: CSSProperties;
};

export function FinalFallbackText({ title, artistName, customStyle }: FinalFallbackTextProps) {
  return (
    <div
      className={`focus-lane__text focus-lane__text--fallback focus-lane__text--final-fallback${
        customStyle ? " focus-lane__text--custom" : ""
      }`}
      style={customStyle}
    >
      <p className="focus-lane__final-title">{title}</p>
      {artistName ? <p className="focus-lane__final-artist">{artistName}</p> : null}
    </div>
  );
}

export function SubtitleText({ text, variant, source, customStyle }: SubtitleTextProps) {
  const isTitleIntro = variant === "fallbackSubtitle" && source === "title-intro";
  const usesCustomStyle = Boolean(customStyle);

  return (
    <p
      className={`focus-lane__text${
        variant === "fallbackSubtitle" && !usesCustomStyle ? " focus-lane__text--fallback" : ""
      }${isTitleIntro && !usesCustomStyle ? " focus-lane__text--title-intro" : ""}${
        usesCustomStyle ? " focus-lane__text--custom" : ""
      }`}
      style={usesCustomStyle ? customStyle : undefined}
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
