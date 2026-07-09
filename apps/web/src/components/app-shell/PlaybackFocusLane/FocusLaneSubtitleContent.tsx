import type { CSSProperties } from "react";

import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

import { ArtistVisual } from "./ArtistVisual";
import { TitleIntroVisual } from "./TitleIntroVisual";
import { SubtitleText } from "./SubtitleText";

import { getSubtitleStylePreset } from "@/lib/subtitleStylePresets";

type FocusLaneSubtitleContentProps = {
  fixture: PlaybackFocusFixture;
  customSubtitleStyle?: CSSProperties;
  subtitleStyleId?: string;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

function computeDynamicFontSize(text: string): string {
  // To fill the entire screen area (both horizontal and vertical space), the text needs to be able to wrap.
  // We base the font size on the square root of the character count using `vmin` to ensure it scales correctly
  // on any aspect ratio.
  const charCount = Math.max(1, text.length);
  // Using 240 as a base multiplier (reduced by ~15% from 280) to perfectly fill the space without overflowing.
  const sizeVmin = 150 / Math.sqrt(charCount);
  return `clamp(2rem, ${sizeVmin}vmin, 80rem)`;
}

/** Lyric caption rendering only — overlays are rendered separately. */
export function FocusLaneSubtitleContent({
  fixture,
  customSubtitleStyle,
  subtitleStyleId,
  withPlayer = true,
  playerCollapsed = false,
}: FocusLaneSubtitleContentProps) {
  if (fixture.type === "titleIntro") {
    return (
      <TitleIntroVisual
        title={fixture.title}
        artistName={fixture.artist?.artistName}
        recording={fixture.recording}
        withPlayer={withPlayer}
        playerCollapsed={playerCollapsed}
      />
    );
  }

  if (fixture.type !== "subtitle") return null;

  let style: CSSProperties | undefined = customSubtitleStyle ? { ...customSubtitleStyle } : undefined;
  const preset = subtitleStyleId ? getSubtitleStylePreset(subtitleStyleId) : undefined;
  if (preset?.dynamicSize) {
    style = style || {};
    style.fontSize = computeDynamicFontSize(fixture.text);
    style.width = "100%";
    style.maxWidth = "100vw";
    style.lineHeight = "0.95";
    style.textWrap = "normal";
    style.wordBreak = "break-word";
  }

  return <SubtitleText text={fixture.text} customStyle={style} />;
}

type FocusLaneOverlayContentProps = {
  fixture: PlaybackFocusFixture;
  isPlaying?: boolean;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
};

export function FocusLaneOverlayContent({
  fixture,
  isPlaying,
  withPlayer = true,
  playerCollapsed = false,
}: FocusLaneOverlayContentProps) {
  if (fixture.type === "finalFallback") {
    const artist = fixture.artist;
    const recording = fixture.recording;

    return (
      <ArtistVisual
        artistName={(artist?.artistName || fixture.artistName) ?? undefined}
        imageUrl={artist?.imageUrl ?? undefined}
        artistBio={artist?.bioLine}
        recording={recording}
        isPlaying={isPlaying}
        withPlayer={withPlayer}
        playerCollapsed={playerCollapsed}
      />
    );
  }

  return null;
}
