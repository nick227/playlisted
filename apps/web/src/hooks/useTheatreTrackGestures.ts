import { useEffect, useRef } from "react";

import {
  SWIPE_AXIS_THRESHOLD_PX,
  SWIPE_CLICK_SUPPRESS_MS,
  SWIPE_COMMIT_THRESHOLD_PX,
  SWIPE_VELOCITY_THRESHOLD,
  isSwipeExcludedTarget,
} from "@/lib/browseNavigation/swipeGesture";
import type { SwipeDirection } from "@/lib/browseNavigation/types";
import { isPlaybackFocusInteractiveTarget } from "@/lib/playbackFocus/interactiveTarget";

type DragState = {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
  moved: boolean;
  direction: SwipeDirection | null;
};

const IDLE_DRAG: DragState = {
  active: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastTime: 0,
  velocityX: 0,
  moved: false,
  direction: null,
};

type UseTheatreTrackGesturesOptions = {
  enabled: boolean;
  onTrackNext: () => void;
  onTrackPrevious: () => void;
  onReveal: () => void;
};

function isTheatreGestureBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        "[data-bottom-player]",
        ".topbar-chrome",
        ".sidebar-nav-content",
        ".bottom-player",
      ].join(","),
    ),
  );
}

function shouldRevealTapTarget(target: EventTarget | null): boolean {
  if (isPlaybackFocusInteractiveTarget(target)) return false;
  if (isTheatreGestureBlockedTarget(target)) return false;
  if (isSwipeExcludedTarget(target)) return false;
  return true;
}

/** Document-level theatre gestures: horizontal swipe skips tracks, tap reveals body. */
export function useTheatreTrackGestures({
  enabled,
  onTrackNext,
  onTrackPrevious,
  onReveal,
}: UseTheatreTrackGesturesOptions) {
  const dragRef = useRef<DragState>({ ...IDLE_DRAG });
  const clickSuppressionUntilRef = useRef(0);
  const onTrackNextRef = useRef(onTrackNext);
  const onTrackPreviousRef = useRef(onTrackPrevious);
  const onRevealRef = useRef(onReveal);

  onTrackNextRef.current = onTrackNext;
  onTrackPreviousRef.current = onTrackPrevious;
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (!enabled) return;

    const resetDrag = () => {
      dragRef.current = { ...IDLE_DRAG };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isTheatreGestureBlockedTarget(event.target)) return;

      clickSuppressionUntilRef.current = 0;
      const now = performance.now();
      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastTime: now,
        velocityX: 0,
        moved: false,
        direction: null,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (!drag.moved) {
        if (Math.abs(deltaX) < SWIPE_AXIS_THRESHOLD_PX) return;
        if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
        drag.moved = true;
        drag.direction = deltaX < 0 ? "next" : "prev";
      }

      const now = performance.now();
      const elapsed = Math.max(1, now - drag.lastTime);
      drag.velocityX = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX;
      drag.lastTime = now;
    };

    const onPointerFinish = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      const direction = drag.direction;
      const deltaX = event.clientX - drag.startX;
      const pullDistance = direction === "next" ? -deltaX : deltaX;
      const velocity = direction === "next" ? -drag.velocityX : drag.velocityX;
      const committed =
        drag.moved &&
        direction !== null &&
        (pullDistance >= SWIPE_COMMIT_THRESHOLD_PX || velocity >= SWIPE_VELOCITY_THRESHOLD);

      const revealTarget = event.target;
      const moved = drag.moved;
      resetDrag();

      if (committed && direction) {
        clickSuppressionUntilRef.current = performance.now() + SWIPE_CLICK_SUPPRESS_MS;
        if (direction === "next") onTrackNextRef.current();
        else onTrackPreviousRef.current();
        return;
      }

      if (!moved && shouldRevealTapTarget(revealTarget)) {
        clickSuppressionUntilRef.current = performance.now() + SWIPE_CLICK_SUPPRESS_MS;
        onRevealRef.current();
      }
    };

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() > clickSuppressionUntilRef.current) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("pointermove", onPointerMove, { capture: true });
    document.addEventListener("pointerup", onPointerFinish, { capture: true });
    document.addEventListener("pointercancel", onPointerFinish, { capture: true });
    document.addEventListener("click", onClickCapture, { capture: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("pointermove", onPointerMove, { capture: true });
      document.removeEventListener("pointerup", onPointerFinish, { capture: true });
      document.removeEventListener("pointercancel", onPointerFinish, { capture: true });
      document.removeEventListener("click", onClickCapture, { capture: true });
      resetDrag();
    };
  }, [enabled]);
}
