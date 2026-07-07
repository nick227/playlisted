import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type SyntheticEvent } from "react";

import {
  SWIPE_AXIS_THRESHOLD_PX,
  SWIPE_CLICK_SUPPRESS_MS,
  SWIPE_COMMIT_THRESHOLD_PX,
  SWIPE_VELOCITY_THRESHOLD,
} from "@/lib/browseNavigation/swipeGesture";
import type { SwipeDirection } from "@/lib/browseNavigation/types";

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

type UseHorizontalBrowseSwipeGestureOptions = {
  enabled: boolean;
  onCommit: (direction: SwipeDirection) => void | Promise<void>;
  onTap?: () => void;
  isExcludedTarget?: (target: EventTarget | null) => boolean;
};

export function useHorizontalBrowseSwipeGesture({
  enabled,
  onCommit,
  onTap,
  isExcludedTarget,
}: UseHorizontalBrowseSwipeGestureOptions) {
  const dragRef = useRef<DragState>({ ...IDLE_DRAG });
  const clickSuppressionUntilRef = useRef(0);
  const captureTargetRef = useRef<HTMLElement | null>(null);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isExcludedTarget?.(event.target)) return;

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
      captureTargetRef.current = event.currentTarget;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [enabled, isExcludedTarget],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId || !enabled) return;

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
      event.preventDefault();
    },
    [enabled],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement> | SyntheticEvent) => {
      if (!("pointerId" in event)) return;
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      if (captureTargetRef.current?.hasPointerCapture(event.pointerId)) {
        captureTargetRef.current.releasePointerCapture(event.pointerId);
      }
      captureTargetRef.current = null;

      const direction = drag.direction;
      const deltaX = event.clientX - drag.startX;
      const pullDistance = direction === "next" ? -deltaX : deltaX;
      const velocity = direction === "next" ? -drag.velocityX : drag.velocityX;
      const committed =
        drag.moved &&
        direction !== null &&
        (pullDistance >= SWIPE_COMMIT_THRESHOLD_PX || velocity >= SWIPE_VELOCITY_THRESHOLD);

      dragRef.current = { ...IDLE_DRAG };

      if (drag.moved) {
        clickSuppressionUntilRef.current = performance.now() + SWIPE_CLICK_SUPPRESS_MS;
        event.preventDefault();
        event.stopPropagation();
      }

      if (committed && direction) {
        void onCommit(direction);
        return;
      }

      if (!drag.moved) {
        onTap?.();
      }
    },
    [onCommit, onTap],
  );

  const suppressClickAfterSwipe = useCallback((event: SyntheticEvent) => {
    if (performance.now() > clickSuppressionUntilRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: finishPointer,
    onPointerCancel: finishPointer,
    onLostPointerCapture: finishPointer,
    onClick: suppressClickAfterSwipe,
  };
}
