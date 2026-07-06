import type { CSSProperties } from "react";

import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

import { ArtistVisual } from "./ArtistVisual";
import { TitleIntroVisual } from "./TitleIntroVisual";
import { fixtureToSubtitleProps, SubtitleText } from "./SubtitleText";

import { getSubtitleStylePreset } from "@/lib/subtitleStylePresets";

type FocusLaneSubtitleContentProps = {
  fixture: PlaybackFocusFixture;
  customSubtitleStyle?: CSSProperties;
  subtitleStyleId?: string;
  currentTimeSec?: number;
  isPlaying?: boolean;
  onMinimizeArtistVisual?: () => void;
  artistVisualMinimized?: boolean;
};

function usesCustomSubtitleStyle(fixture: PlaybackFocusFixture): boolean {
  return fixture.type === "subtitle" || fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback";
}

function computeDynamicFontSize(text: string): string {
  // To fill the entire screen area (both horizontal and vertical space), the text needs to be able to wrap.
  // We base the font size on the square root of the character count using `vmin` to ensure it scales correctly 
  // on any aspect ratio.
  const charCount = Math.max(1, text.length);
  // Using 240 as a base multiplier (reduced by ~15% from 280) to perfectly fill the space without overflowing.
  const sizeVmin = 150 / Math.sqrt(charCount);
  return `clamp(2rem, ${sizeVmin}vmin, 80rem)`;
}

export function FocusLaneSubtitleContent({
  fixture,
  customSubtitleStyle,
  subtitleStyleId,
  currentTimeSec,
  isPlaying,
  onMinimizeArtistVisual,
  artistVisualMinimized = false,
}: FocusLaneSubtitleContentProps) {
  const isTitleIntro = fixture.type === "fallbackSubtitle" && fixture.source === "title-intro";
  let style = customSubtitleStyle && usesCustomSubtitleStyle(fixture) ? { ...customSubtitleStyle } : undefined;
  const subtitleProps = fixtureToSubtitleProps(fixture);

  const preset = subtitleStyleId ? getSubtitleStylePreset(subtitleStyleId) : undefined;
  // Full-bleed dynamic sizing is for plain subtitle captions only — not the title intro card.
  if (preset?.dynamicSize && style && subtitleProps?.text && !isTitleIntro) {
    style.fontSize = computeDynamicFontSize(subtitleProps.text);
    style.width = "100%";
    style.maxWidth = "100vw";
    style.lineHeight = "0.95";
    style.textWrap = "normal";
    style.wordBreak = "break-word";
  }

  const isCombinedView = (fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback") && !isTitleIntro;

  if (isTitleIntro && fixture.type === "fallbackSubtitle") {
    return (
      <TitleIntroVisual
        title={fixture.text}
        artistName={fixture.artist?.artistName}
        recording={fixture.recording}
      />
    );
  }

  if (isCombinedView) {
    if (artistVisualMinimized) return null;

    const artist = (fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback") ? fixture.artist : null;
    const recording = (fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback") ? fixture.recording : null;

    return (
      <ArtistVisual
        artistName={artist?.artistName || (fixture.type === "finalFallback" ? fixture.artistName ?? undefined : undefined)}
        imageUrl={artist?.imageUrl ?? undefined}
        artistBio={artist?.bioLine}
        recording={recording}
        currentTimeSec={currentTimeSec}
        isPlaying={isPlaying}
        onMinimize={onMinimizeArtistVisual}
      />
    );
  }

  if (subtitleProps) {
    return <SubtitleText {...subtitleProps} customStyle={style} />;
  }

  return null;
}
