import { useEffect, useMemo, useRef, useState } from "react";

import { focusLaneFixtureKey } from "@/lib/playbackFocus/fixtureKey";
import { getFixtureFadeOutMs } from "@/lib/playbackFocus/resolvePlaybackFocusFixture";
import type { PlaybackFocusFixture } from "@/lib/playbackFocus/types";

function fixtureVariantClass(fixture: PlaybackFocusFixture | null): string {
  if (!fixture || fixture.type === "none") return "";
  if (fixture.type === "subtitle") return " focus-lane--subtitle";
  if (fixture.type === "finalFallback") return " focus-lane--artist-visual";
  if (fixture.source === "title-intro") return " focus-lane--title-intro";
  return " focus-lane--artist-visual";
}

export function useFocusLaneVisibility(activeFixture: PlaybackFocusFixture) {
  const [renderedFixture, setRenderedFixture] = useState<PlaybackFocusFixture | null>(null);
  const [layerVisible, setLayerVisible] = useState(false);
  const renderedFixtureRef = useRef<PlaybackFocusFixture | null>(null);
  const activeKey = focusLaneFixtureKey(activeFixture);
  const hasActiveContent = activeFixture.type !== "none";

  useEffect(() => {
    renderedFixtureRef.current = renderedFixture;
  }, [renderedFixture]);

  useEffect(() => {
    if (hasActiveContent) {
      const previousKey = focusLaneFixtureKey(renderedFixtureRef.current);
      const fixtureChanged = previousKey !== activeKey;

      setRenderedFixture(activeFixture);

      if (
        renderedFixtureRef.current &&
        renderedFixtureRef.current.type !== "none" &&
        !fixtureChanged
      ) {
        setLayerVisible(true);
        return;
      }

      setLayerVisible(false);
      let secondFrame: number | null = null;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setLayerVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      };
    }

    setLayerVisible(false);
    const previous = renderedFixtureRef.current;
    if (!previous || previous.type === "none") {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRenderedFixture(null);
    }, getFixtureFadeOutMs(previous));

    return () => window.clearTimeout(timeout);
  }, [activeFixture, activeKey, hasActiveContent]);

  const displayFixture = hasActiveContent ? activeFixture : renderedFixture;
  const displayKey = focusLaneFixtureKey(displayFixture);
  const variantClass = useMemo(() => fixtureVariantClass(displayFixture), [displayFixture]);

  return {
    displayFixture,
    displayKey,
    layerVisible: layerVisible && displayFixture?.type !== "none",
    variantClass,
  };
}
