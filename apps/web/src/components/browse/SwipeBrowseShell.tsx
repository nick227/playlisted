import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { neighborAt } from "@/lib/browseNavigation/neighborAt";
import { prefetchBrowseTarget } from "@/lib/browseNavigation/prefetchBrowseTarget";
import {
  SWIPE_AXIS_THRESHOLD_PX,
  SWIPE_BOUNCE_MAX_PX,
  SWIPE_CLICK_SUPPRESS_MS,
  SWIPE_COMMIT_THRESHOLD_PX,
  SWIPE_PREFETCH_RATIO,
  SWIPE_VELOCITY_THRESHOLD,
  isSwipeExcludedTarget,
  rubberBandOffset,
} from "@/lib/browseNavigation/swipeGesture";
import type { BrowseNeighborsResult, SwipeDirection } from "@/lib/browseNavigation/types";
import { BROWSE_SWIPE_NAVIGATION_STATE } from "@/lib/browseNavigation/types";
import { usePlaybackBodyFocusHidden } from "@/lib/playbackBodyFocus";
import { useAuth } from "@/providers/AuthProvider";

import { SwipeLoadingEdge } from "./SwipeLoadingEdge";

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

type SwipeBrowseShellProps = {
  neighborsKey: string;
  resolveNeighbors: () => Promise<BrowseNeighborsResult>;
  endLabel: string;
  isRefreshing?: boolean;
  children: ReactNode;
};

export function SwipeBrowseShell({
  neighborsKey,
  resolveNeighbors,
  endLabel,
  isRefreshing = false,
  children,
}: SwipeBrowseShellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const bodyFocusHidden = usePlaybackBodyFocusHidden();
  const disabled = bodyFocusHidden;

  const shellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({ ...IDLE_DRAG });
  const clickSuppressionUntilRef = useRef(0);
  const prefetchedDirectionRef = useRef<SwipeDirection | null>(null);

  const [pullOffset, setPullOffset] = useState(0);
  const [edgeMessage, setEdgeMessage] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const neighborsQuery = useQuery({
    queryKey: ["browse-neighbors", neighborsKey],
    queryFn: resolveNeighbors,
    staleTime: 5 * 60_000,
  });

  const resetPull = useCallback(() => {
    setPullOffset(0);
    setPreviewLabel(null);
    prefetchedDirectionRef.current = null;
  }, []);

  const showEdgeMessage = useCallback((message: string) => {
    setEdgeMessage(message);
    window.setTimeout(() => setEdgeMessage(null), 1200);
  }, []);

  const commitNavigation = useCallback(
    async (direction: SwipeDirection) => {
      const result = neighborsQuery.data;
      if (!result) return;

      const target = neighborAt(result, direction);
      if (!target) {
        showEdgeMessage(`No more ${endLabel}`);
        resetPull();
        return;
      }

      await prefetchBrowseTarget(queryClient, target, accessToken);
      resetPull();
      navigate(target.href, { state: { intent: BROWSE_SWIPE_NAVIGATION_STATE } });
    },
    [accessToken, endLabel, navigate, neighborsQuery.data, queryClient, resetPull, showEdgeMessage],
  );

  const maybePrefetch = useCallback(
    (direction: SwipeDirection, pullDistance: number) => {
      if (prefetchedDirectionRef.current === direction) return;
      if (pullDistance < SWIPE_COMMIT_THRESHOLD_PX * SWIPE_PREFETCH_RATIO) return;

      const result = neighborsQuery.data;
      if (!result) return;

      const target = neighborAt(result, direction);
      if (!target) return;

      prefetchedDirectionRef.current = direction;
      setPreviewLabel(target.label);
      void prefetchBrowseTarget(queryClient, target, accessToken);
    },
    [accessToken, neighborsQuery.data, queryClient],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Clear any suppression left over from a prior swipe before we decide whether
      // to track this gesture — otherwise a tap on a link shortly after an unrelated
      // swipe elsewhere on the page (excluded targets return below) inherits the
      // stale suppression window and its click gets silently swallowed.
      clickSuppressionUntilRef.current = 0;

      if (disabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isSwipeExcludedTarget(event.target)) return;

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
    },
    [disabled],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId || disabled) return;

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (!drag.moved) {
        if (Math.abs(deltaX) < SWIPE_AXIS_THRESHOLD_PX) return;
        if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
        drag.moved = true;
        drag.direction = deltaX < 0 ? "next" : "prev";
        setIsDragging(true);
        shellRef.current?.setPointerCapture(event.pointerId);
      }

      const now = performance.now();
      const elapsed = Math.max(1, now - drag.lastTime);
      drag.velocityX = (event.clientX - drag.lastX) / elapsed;
      drag.lastX = event.clientX;
      drag.lastTime = now;

      const direction = drag.direction;
      if (!direction) return;

      const result = neighborsQuery.data;
      const hasTarget = result ? neighborAt(result, direction) !== null : false;
      const pullDistance = direction === "next" ? -deltaX : deltaX;
      const offset = hasTarget
        ? Math.max(-SWIPE_BOUNCE_MAX_PX, Math.min(SWIPE_BOUNCE_MAX_PX, deltaX * 0.35))
        : Math.sign(deltaX) * rubberBandOffset(Math.abs(deltaX), SWIPE_BOUNCE_MAX_PX);

      setPullOffset(offset);
      maybePrefetch(direction, pullDistance);
      event.preventDefault();
    },
    [disabled, maybePrefetch, neighborsQuery.data],
  );

  const finishPointer = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;

      if (shellRef.current?.hasPointerCapture(event.pointerId)) {
        shellRef.current.releasePointerCapture(event.pointerId);
      }

      const direction = drag.direction;
      const deltaX = event.clientX - drag.startX;
      const pullDistance = direction === "next" ? -deltaX : deltaX;
      const velocity = direction === "next" ? -drag.velocityX : drag.velocityX;
      const committed =
        drag.moved &&
        direction !== null &&
        (pullDistance >= SWIPE_COMMIT_THRESHOLD_PX || velocity >= SWIPE_VELOCITY_THRESHOLD);

      dragRef.current = { ...IDLE_DRAG };
      setIsDragging(false);

      if (drag.moved) {
        clickSuppressionUntilRef.current = performance.now() + SWIPE_CLICK_SUPPRESS_MS;
      }

      if (committed && direction) {
        void commitNavigation(direction);
        return;
      }

      if (drag.moved && direction) {
        const result = neighborsQuery.data;
        if (result && neighborAt(result, direction) === null && pullDistance > SWIPE_AXIS_THRESHOLD_PX) {
          showEdgeMessage(`No more ${endLabel}`);
        }
      }

      resetPull();
    },
    [commitNavigation, endLabel, neighborsQuery.data, resetPull, showEdgeMessage],
  );

  const suppressClickAfterSwipe = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (performance.now() > clickSuppressionUntilRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    clickSuppressionUntilRef.current = 0;
  }, []);

  return (
    <div
      ref={shellRef}
      className={`relative touch-pan-y select-none ${isDragging ? "cursor-grabbing" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
      onClickCapture={suppressClickAfterSwipe}
    >
      <SwipeLoadingEdge
        direction={pullOffset < 0 ? "left" : "right"}
        offset={Math.abs(pullOffset)}
        previewLabel={previewLabel}
        edgeMessage={edgeMessage}
        isRefreshing={isRefreshing}
      />
      <div
        className={isDragging ? "" : "transition-transform duration-200 ease-out"}
        style={{ transform: pullOffset !== 0 ? `translateX(${pullOffset}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
