import { useCallback, type KeyboardEvent } from "react";

import { useSwipeGesture, type VerticalSwipeDirection } from "@/hooks/useSwipeGesture";
import {
  SWIPE_CLICK_SUPPRESS_MS,
  armTheatreSwipeSuppress,
  isGestureExcludedTarget,
} from "@/lib/gestures/swipeGesture";
import type { SwipeDirection } from "@/lib/browseNavigation/types";

import { buildRevealShieldClassName } from "./appShellLayout";

type TheatreGestureLayerProps = {
  visible: boolean;
  withPlayer: boolean;
  onSkip: (direction: SwipeDirection) => void;
  onReveal: () => void;
};

function isTheatreControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(".play-focus-theatre-hit-area")) return false;
  return isGestureExcludedTarget(target);
}

export function TheatreGestureLayer({
  visible,
  withPlayer,
  onSkip,
  onReveal,
}: TheatreGestureLayerProps) {
  const handleHorizontalSwipe = useCallback(
    (direction: SwipeDirection) => {
      armTheatreSwipeSuppress(SWIPE_CLICK_SUPPRESS_MS);
      onSkip(direction);
    },
    [onSkip],
  );

  const handleVerticalSwipe = useCallback(
    (direction: VerticalSwipeDirection) => {
      if (direction === "up") onReveal();
    },
    [onReveal],
  );

  const gestureHandlers = useSwipeGesture({
    enabled: visible,
    axis: "both",
    isExcludedTarget: isTheatreControlTarget,
    onHorizontalSwipe: handleHorizontalSwipe,
    onVerticalSwipe: handleVerticalSwipe,
    onTap: onReveal,
    onIntentStart: axis => {
      if (axis === "horizontal") armTheatreSwipeSuppress(SWIPE_CLICK_SUPPRESS_MS);
    },
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onReveal();
    },
    [onReveal],
  );

  if (!visible) return null;

  return (
    <div
      className={buildRevealShieldClassName(withPlayer)}
      role="button"
      tabIndex={0}
      data-swipe-surface
      aria-label="Show page content"
      onKeyDown={handleKeyDown}
      {...gestureHandlers}
    />
  );
}
