import type { CSSProperties } from "react";

import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

import { ArtistVisual } from "./ArtistVisual";
import { TitleIntroVisual } from "./TitleIntroVisual";
import { fixtureToSubtitleProps, SubtitleText } from "./SubtitleText";

type FocusLaneSubtitleContentProps = {
  fixture: PlaybackFocusFixture;
  customSubtitleStyle?: CSSProperties;
  currentTimeSec?: number;
  isPlaying?: boolean;
};

function usesCustomSubtitleStyle(fixture: PlaybackFocusFixture): boolean {
  return fixture.type === "subtitle" || fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback";
}

export function FocusLaneSubtitleContent({
  fixture,
  customSubtitleStyle,
  currentTimeSec,
  isPlaying,
}: FocusLaneSubtitleContentProps) {
  const style = customSubtitleStyle && usesCustomSubtitleStyle(fixture) ? customSubtitleStyle : undefined;
  const subtitleProps = fixtureToSubtitleProps(fixture);

  const isTitleIntro = fixture.type === "fallbackSubtitle" && fixture.source === "title-intro";
  const isCombinedView = (fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback") && !isTitleIntro;

  if (isTitleIntro && fixture.type === "fallbackSubtitle") {
    return (
      <TitleIntroVisual
        title={fixture.text}
        artistName={fixture.artist?.artistName}
        recording={fixture.recording}
        customStyle={style}
      />
    );
  }

  if (isCombinedView) {
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
      />
    );
  }

  if (subtitleProps) {
    return <SubtitleText {...subtitleProps} customStyle={style} />;
  }

  return null;
}
