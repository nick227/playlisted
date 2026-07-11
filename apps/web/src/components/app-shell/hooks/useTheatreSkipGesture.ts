import { useEffect } from "react";

import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { isGestureExcludedTarget } from "@/lib/gestures/swipeGesture";
import type { SwipeDirection } from "@/lib/browseNavigation/types";

type UseTheatreSkipGestureOptions = {
  enabled: boolean;
  onSkip: (direction: SwipeDirection) => void;
};

/**
 * Sitewide horizontal swipe-to-skip while the theatre FX background is
 * showing. The reveal shield (TheatreGestureLayer) only exists once the
 * idle-fade chrome-hidden state kicks in, so it misses the far more common
 * case of theatre FX playing behind a fully visible, normally interactive
 * page. A rendered full-viewport surface can't fill that gap without also
 * swallowing every ordinary click — anything on top of the page becomes the
 * click's target, whether or not it "consumes" the event, so nothing
 * underneath is ever reachable. Listening on `document.documentElement` in
 * the capture phase sidesteps that: hit-testing (and therefore normal
 * taps/clicks) is untouched, and page-level swipe handlers (e.g. browse
 * carousels) only ever get pre-empted once we've confirmed a real
 * horizontal swipe, via `preventDefault`/`stopPropagation` on the capture
 * pass before the event reaches them.
 */
export function useTheatreSkipGesture({ enabled, onSkip }: UseTheatreSkipGestureOptions) {
  const { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onClick } =
    useSwipeGesture({
      enabled,
      axis: "horizontal",
      isExcludedTarget: isGestureExcludedTarget,
      skipPointerCapture: true,
      onHorizontalSwipe: onSkip,
    });

  useEffect(() => {
    if (!enabled) return;

    const root = document.documentElement;
    const listenerOptions = { capture: true };
    // React's pointer/click handler signatures are structurally compatible with
    // native events (pointerId, clientX/Y, currentTarget, preventDefault, etc.);
    // only the TS types differ, since these are normally spread onto JSX props.
    const pointerDown = onPointerDown as unknown as (event: Event) => void;
    const pointerMove = onPointerMove as unknown as (event: Event) => void;
    const pointerUp = onPointerUp as unknown as (event: Event) => void;
    const pointerCancel = onPointerCancel as unknown as (event: Event) => void;
    const lostPointerCapture = onLostPointerCapture as unknown as (event: Event) => void;
    const click = onClick as unknown as (event: Event) => void;

    root.addEventListener("pointerdown", pointerDown, listenerOptions);
    root.addEventListener("pointermove", pointerMove, listenerOptions);
    root.addEventListener("pointerup", pointerUp, listenerOptions);
    root.addEventListener("pointercancel", pointerCancel, listenerOptions);
    root.addEventListener("lostpointercapture", lostPointerCapture, listenerOptions);
    root.addEventListener("click", click, listenerOptions);

    return () => {
      root.removeEventListener("pointerdown", pointerDown, listenerOptions);
      root.removeEventListener("pointermove", pointerMove, listenerOptions);
      root.removeEventListener("pointerup", pointerUp, listenerOptions);
      root.removeEventListener("pointercancel", pointerCancel, listenerOptions);
      root.removeEventListener("lostpointercapture", lostPointerCapture, listenerOptions);
      root.removeEventListener("click", click, listenerOptions);
    };
  }, [enabled, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onLostPointerCapture, onClick]);
}
