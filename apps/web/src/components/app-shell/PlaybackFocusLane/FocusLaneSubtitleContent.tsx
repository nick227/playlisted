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

  if (fixture.type === "artistVisual") {
    return (
      <ArtistVisual
        artistName={fixture.artistName}
        imageUrl={fixture.imageUrl}
        bioLine={fixture.bioLine}
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
