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
  lastY: number;
  lastTime: number;
  velocityY: number;
  moved: boolean;
  direction: SwipeDirection | null;
};

const IDLE_DRAG: DragState = {
  active: false,
  pointerId: -1,
  startX: 0,
  startY: 0,
  lastY: 0,
  lastTime: 0,
  velocityY: 0,
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
      if (disabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isSwipeExcludedTarget(event.target)) return;

      clickSuppressionUntilRef.current = 0;
      const now = performance.now();
      dragRef.current = {
        active: true,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastY: event.clientY,
        lastTime: now,
        velocityY: 0,
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
        if (Math.abs(deltaY) < SWIPE_AXIS_THRESHOLD_PX) return;
        if (Math.abs(deltaY) <= Math.abs(deltaX)) return;
        drag.moved = true;
        drag.direction = deltaY < 0 ? "next" : "prev";
        setIsDragging(true);
        shellRef.current?.setPointerCapture(event.pointerId);
      }

      const now = performance.now();
      const elapsed = Math.max(1, now - drag.lastTime);
      drag.velocityY = (event.clientY - drag.lastY) / elapsed;
      drag.lastY = event.clientY;
      drag.lastTime = now;

      const direction = drag.direction;
      if (!direction) return;

      const result = neighborsQuery.data;
      const hasTarget = result ? neighborAt(result, direction) !== null : false;
      const rawOffset = direction === "next" ? deltaY : -deltaY;
      const offset = hasTarget
        ? Math.max(-SWIPE_BOUNCE_MAX_PX, Math.min(SWIPE_BOUNCE_MAX_PX, rawOffset * 0.35))
        : -rubberBandOffset(Math.abs(rawOffset), SWIPE_BOUNCE_MAX_PX);

      setPullOffset(offset);
      maybePrefetch(direction, Math.abs(rawOffset));
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
      const deltaY = event.clientY - drag.startY;
      const pullDistance = direction === "next" ? -deltaY : deltaY;
      const velocity = direction === "next" ? -drag.velocityY : drag.velocityY;
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
    if (!dragRef.current.moved && performance.now() > clickSuppressionUntilRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current.moved = false;
    clickSuppressionUntilRef.current = 0;
  }, []);

  return (
    <div
      ref={shellRef}
      className={`relative touch-pan-x select-none ${isDragging ? "cursor-grabbing" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      onPointerCancel={finishPointer}
      onLostPointerCapture={finishPointer}
      onClickCapture={suppressClickAfterSwipe}
    >
      <SwipeLoadingEdge
        direction={pullOffset < 0 ? "top" : "bottom"}
        offset={Math.abs(pullOffset)}
        previewLabel={previewLabel}
        edgeMessage={edgeMessage}
        isRefreshing={isRefreshing}
      />
      <div
        className={isDragging ? "" : "transition-transform duration-200 ease-out"}
        style={{ transform: pullOffset !== 0 ? `translateY(${pullOffset}px)` : undefined }}
      >
        {children}
      </div>
    </div>
  );
}
