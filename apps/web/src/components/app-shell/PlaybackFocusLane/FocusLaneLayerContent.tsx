import type { CSSProperties } from "react";

import { FocusLaneOverlayContent, FocusLaneSubtitleContent } from "./FocusLaneSubtitleContent";
import type { FocusLaneLayers } from "./useFocusLaneLayers";

type FocusLaneLayerContentProps = {
  layers: FocusLaneLayers;
  isPlaying: boolean;
  withPlayer?: boolean;
  playerCollapsed?: boolean;
  customSubtitleStyle?: CSSProperties;
  subtitleStyleId?: string;
};

/** Renders the four independently-faded focus-lane layers for a resolved lane state. */
export function FocusLaneLayerContent({
  layers,
  isPlaying,
  withPlayer = true,
  playerCollapsed = false,
  customSubtitleStyle,
  subtitleStyleId,
}: FocusLaneLayerContentProps) {
  const {
    artistIntroLane,
    subtitleLane,
    titleIntroLane,
    nowPlayingLane,
    hasArtistIntro,
    hasSubtitle,
    hasTitleIntro,
    hasNowPlaying,
  } = layers;

  return (
    <>
      {hasArtistIntro ? (
        <div
          key={`artist-intro:${artistIntroLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--overlay${
            artistIntroLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={!artistIntroLane.layerVisible}
        >
          <FocusLaneOverlayContent
            fixture={artistIntroLane.displayFixture!}
            isPlaying={isPlaying}
            withPlayer={withPlayer}
            playerCollapsed={playerCollapsed}
          />
        </div>
      ) : null}
      {hasSubtitle ? (
        <div
          key={`subtitle:${subtitleLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--subtitle${
            subtitleLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={!subtitleLane.layerVisible}
        >
          <FocusLaneSubtitleContent
            fixture={subtitleLane.displayFixture!}
            customSubtitleStyle={customSubtitleStyle}
            subtitleStyleId={subtitleStyleId}
          />
        </div>
      ) : null}
      {hasTitleIntro ? (
        <div
          key={`title-intro:${titleIntroLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--subtitle${
            titleIntroLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={!titleIntroLane.layerVisible}
        >
          <FocusLaneSubtitleContent
            fixture={titleIntroLane.displayFixture!}
            isPlaying={isPlaying}
            withPlayer={withPlayer}
            playerCollapsed={playerCollapsed}
          />
        </div>
      ) : null}
      {hasNowPlaying ? (
        <div
          key={`now-playing:${nowPlayingLane.displayKey}`}
          className={`focus-lane__content focus-lane__content--subtitle${
            nowPlayingLane.layerVisible ? " is-visible" : ""
          }`}
          aria-hidden={!nowPlayingLane.layerVisible}
        >
          <FocusLaneSubtitleContent
            fixture={nowPlayingLane.displayFixture!}
            isPlaying={isPlaying}
            withPlayer={withPlayer}
            playerCollapsed={playerCollapsed}
          />
        </div>
      ) : null}
    </>
  );
}
