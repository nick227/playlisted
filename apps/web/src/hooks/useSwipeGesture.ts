import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";

import {
  SWIPE_AXIS_THRESHOLD_PX,
  SWIPE_CLICK_SUPPRESS_MS,
  THEATRE_SWIPE_COMMIT_THRESHOLD_PX,
  THEATRE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
} from "@/lib/gestures/swipeGesture";
import type { SwipeDirection } from "@/lib/browseNavigation/types";

export type SwipeAxis = "horizontal" | "vertical" | "both";
export type VerticalSwipeDirection = "up" | "down";

type SwipeIntentAxis = Exclude<SwipeAxis, "both">;

type DragState = {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  intentAxis: SwipeIntentAxis | null;
  moved: boolean;
};

const IDLE_DRAG: DragState = {
  active: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
  startTime: 0,
  intentAxis: null,
  moved: false,
};

type SwipeGestureOptions = {
  enabled: boolean;
  axis?: SwipeAxis;
  horizontalCommitPx?: number;
  verticalCommitPx?: number;
  /** Average gesture velocity threshold in CSS pixels per millisecond. */
  velocityThreshold?: number;
  axisThresholdPx?: number;
  clickSuppressMs?: number;
  verticalDominanceRatio?: number;
  /** Required margin (as a ratio) one axis must lead the other by before the initial intent axis locks. */
  axisLockDominanceRatio?: number;
  isExcludedTarget?: (target: EventTarget | null) => boolean;
  /**
   * Backdrop-style consumers (e.g. the theatre shield) have no legitimate
   * content of their own to receive a click. When set, every pointerdown/click
   * that lands on the surface is unconditionally consumed instead of only
   * being suppressed after a real swipe — this closes the gap where a plain
   * tap-to-dismiss leaves the trailing native `click` event free to fall
   * through to whatever briefly remains underneath mid-dismiss.
   */
  consumeAllClicks?: boolean;
  /**
   * Skip `setPointerCapture` on pointerdown. Capture exists so a small
   * element keeps receiving move/up events once the pointer strays outside
   * its bounds — irrelevant for a listener already attached at the document
   * root, which sees every event regardless. Capturing there anyway risks
   * retargeting the synthesized touch `click` (and other compat mouse
   * events) away from the element actually under the finger, breaking plain
   * taps sitewide for the whole duration this gesture is enabled.
   */
  skipPointerCapture?: boolean;
  onHorizontalSwipe?: (direction: SwipeDirection) => void;
  onVerticalSwipe?: (direction: VerticalSwipeDirection) => void;
  onTap?: () => void;
  /** Pointer cancellation resets gesture state only; use this for visual cleanup. */
  onCancel?: () => void;
  onIntentStart?: (axis: SwipeIntentAxis) => void;
  onDrag?: (info: {
    axis: SwipeIntentAxis;
    deltaX: number;
    deltaY: number;
    horizontalDirection: SwipeDirection;
    verticalDirection: VerticalSwipeDirection;
  }) => void;
  onFinish?: (info: {
    axis: SwipeIntentAxis | null;
    deltaX: number;
    deltaY: number;
    committed: boolean;
  }) => void;
};

function resolveIntentAxis(
  axis: SwipeAxis,
  deltaX: number,
  deltaY: number,
  dominanceRatio: number,
): SwipeIntentAxis | null {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (axis === "horizontal") return absX > absY ? "horizontal" : null;
  if (axis === "vertical") return absY > absX ? "vertical" : null;
  // Both axes are live (e.g. theatre skip + reveal). A bare majority at the
  // 12px threshold locks in on the first noisy sample of a real swipe, so a
  // deliberate horizontal flick with a hair of vertical jitter often
  // mis-locks "vertical" and can never fire the skip for the rest of the
  // gesture. Require a clear margin before locking; ambiguous movement keeps
  // waiting for the next sample instead of guessing.
  if (absX > absY * dominanceRatio) return "horizontal";
  if (absY > absX * dominanceRatio) return "vertical";
  return null;
}

export function useSwipeGesture({
  enabled,
  axis = "horizontal",
  horizontalCommitPx = THEATRE_SWIPE_COMMIT_THRESHOLD_PX,
  verticalCommitPx = 72,
  velocityThreshold = THEATRE_SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
  axisThresholdPx = SWIPE_AXIS_THRESHOLD_PX,
  clickSuppressMs = SWIPE_CLICK_SUPPRESS_MS,
  verticalDominanceRatio = 1.25,
  axisLockDominanceRatio = 1.25,
  isExcludedTarget,
  consumeAllClicks = false,
  skipPointerCapture = false,
  onHorizontalSwipe,
  onVerticalSwipe,
  onTap,
  onCancel,
  onIntentStart,
  onDrag,
  onFinish,
}: SwipeGestureOptions) {
  const dragRef = useRef<DragState>({ ...IDLE_DRAG });
  const clickSuppressionUntilRef = useRef(0);
  const captureTargetRef = useRef<HTMLElement | null>(null);

  const resetDrag = useCallback(() => {
    dragRef.current = { ...IDLE_DRAG };
    captureTargetRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isExcludedTarget?.(event.target)) return;

      if (consumeAllClicks) event.preventDefault();
      clickSuppressionUntilRef.current = 0;
      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startTime: performance.now(),
        intentAxis: null,
        moved: false,
      };
      if (!skipPointerCapture) {
        captureTargetRef.current = event.currentTarget;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [consumeAllClicks, enabled, isExcludedTarget, skipPointerCapture],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!enabled || !drag.active || drag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (!drag.moved) {
        if (Math.max(absX, absY) < axisThresholdPx) return;
        const intentAxis = resolveIntentAxis(axis, deltaX, deltaY, axisLockDominanceRatio);
        if (!intentAxis) return;
        drag.moved = true;
        drag.intentAxis = intentAxis;
        onIntentStart?.(intentAxis);
      }

      if (drag.intentAxis) {
        onDrag?.({
          axis: drag.intentAxis,
          deltaX,
          deltaY,
          horizontalDirection: deltaX < 0 ? "next" : "prev",
          verticalDirection: deltaY < 0 ? "up" : "down",
        });
      }

      event.preventDefault();
      event.stopPropagation();
    },
    [axis, axisLockDominanceRatio, axisThresholdPx, enabled, onDrag, onIntentStart],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement> | SyntheticEvent) => {
      if (!("pointerId" in event)) return;
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      if (captureTargetRef.current?.hasPointerCapture(event.pointerId)) {
        captureTargetRef.current.releasePointerCapture(event.pointerId);
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);
      const elapsed = Math.max(1, performance.now() - drag.startTime);
      const avgVelocityX = Math.abs(deltaX / elapsed);
      const avgVelocityY = Math.abs(deltaY / elapsed);
      let moved = drag.moved;
      let intentAxis = drag.intentAxis;

      // On a busy main thread (real touch hardware under load) a fast flick
      // can complete with zero intervening pointermove callbacks — the browser
      // still guarantees pointerdown/pointerup delivery, but pointermove is the
      // one event type it's free to coalesce or drop entirely. Without this,
      // `moved` would stay false and the swipe would silently register as a
      // tap instead. Fall back to resolving intent axis from the pointerup
      // position itself so a real swipe is never lost just because we never
      // saw it happen.
      if (!moved && Math.max(absX, absY) >= axisThresholdPx) {
        const fallbackAxis = resolveIntentAxis(axis, deltaX, deltaY, axisLockDominanceRatio);
        if (fallbackAxis) {
          intentAxis = fallbackAxis;
          moved = true;
        }
      }

      resetDrag();

      if (moved || consumeAllClicks) {
        clickSuppressionUntilRef.current = performance.now() + clickSuppressMs;
        event.preventDefault();
        event.stopPropagation();
      }

      let committed = false;

      if (intentAxis === "horizontal" && absX > absY) {
        committed = absX >= horizontalCommitPx || avgVelocityX >= velocityThreshold;
        if (committed) {
          onFinish?.({ axis: intentAxis, deltaX, deltaY, committed });
          onHorizontalSwipe?.(deltaX < 0 ? "next" : "prev");
          return;
        }
      }

      if (intentAxis === "vertical" && absY > absX * verticalDominanceRatio) {
        committed = absY >= verticalCommitPx || avgVelocityY >= velocityThreshold;
        if (committed) {
          onFinish?.({ axis: intentAxis, deltaX, deltaY, committed });
          onVerticalSwipe?.(deltaY < 0 ? "up" : "down");
          return;
        }
      }

      onFinish?.({ axis: intentAxis, deltaX, deltaY, committed: false });
      if (!moved) onTap?.();
    },
    [
      axis,
      axisLockDominanceRatio,
      axisThresholdPx,
      clickSuppressMs,
      consumeAllClicks,
      horizontalCommitPx,
      onHorizontalSwipe,
      onTap,
      onFinish,
      onVerticalSwipe,
      resetDrag,
      velocityThreshold,
      verticalCommitPx,
      verticalDominanceRatio,
    ],
  );

  const cancelPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement> | SyntheticEvent) => {
      if ("pointerId" in event) {
        const drag = dragRef.current;
        if (!drag.active || drag.pointerId !== event.pointerId) return;
        if (captureTargetRef.current?.hasPointerCapture(event.pointerId)) {
          captureTargetRef.current.releasePointerCapture(event.pointerId);
        }
      }
      resetDrag();
      onCancel?.();
    },
    [onCancel, resetDrag],
  );

  const suppressClickAfterSwipe = useCallback(
    (event: SyntheticEvent) => {
      if (!consumeAllClicks && performance.now() > clickSuppressionUntilRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      clickSuppressionUntilRef.current = 0;
    },
    [consumeAllClicks],
  );

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: cancelPointer,
    onLostPointerCapture: cancelPointer,
    onClick: suppressClickAfterSwipe,
  };
}
