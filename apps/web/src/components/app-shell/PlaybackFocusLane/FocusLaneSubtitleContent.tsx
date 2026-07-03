import type { CSSProperties } from "react";

import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

import { ArtistVisual } from "./ArtistVisual";
import { FinalFallbackText, fixtureToSubtitleProps, SubtitleText } from "./SubtitleText";

type FocusLaneSubtitleContentProps = {
  fixture: PlaybackFocusFixture;
  customSubtitleStyle?: CSSProperties;
};

function usesCustomSubtitleStyle(fixture: PlaybackFocusFixture): boolean {
  return fixture.type === "subtitle" || fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback";
}

export function FocusLaneSubtitleContent({ fixture, customSubtitleStyle }: FocusLaneSubtitleContentProps) {
  const style = customSubtitleStyle && usesCustomSubtitleStyle(fixture) ? customSubtitleStyle : undefined;
  const subtitleProps = fixtureToSubtitleProps(fixture);

  const isTitleIntro = fixture.type === "fallbackSubtitle" && fixture.source === "title-intro";
  const isCombinedView = (fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback") && !isTitleIntro;

  if (isCombinedView) {
    const artist = (fixture.type === "fallbackSubtitle" || fixture.type === "finalFallback") ? fixture.artist : null;
    
    let subtitleNode = null;
    if (fixture.type === "finalFallback") {
      subtitleNode = (
        <FinalFallbackText
          title={fixture.title}
          artistName={fixture.artistName}
          customStyle={style}
        />
      );
    } else if (subtitleProps) {
      subtitleNode = <SubtitleText {...subtitleProps} customStyle={style} />;
    }

    return (
      <ArtistVisual
        artistName={artist?.artistName || (fixture.type === "finalFallback" ? fixture.artistName ?? undefined : undefined)}
        imageUrl={artist?.imageUrl ?? undefined}
        subtitleNode={subtitleNode}
      />
    );
  }

  if (fixture.type === "finalFallback") {
    return (
      <FinalFallbackText
        title={fixture.title}
        artistName={fixture.artistName}
        customStyle={style}
      />
    );
  }

  if (subtitleProps) {
    return <SubtitleText {...subtitleProps} customStyle={style} />;
  }

  return null;
}
