import {
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { neighborAt } from "@/lib/browseNavigation/neighborAt";
import { prefetchBrowseTarget } from "@/lib/browseNavigation/prefetchBrowseTarget";
import {
  SWIPE_BOUNCE_MAX_PX,
  SWIPE_COMMIT_THRESHOLD_PX,
  SWIPE_PREFETCH_RATIO,
  SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
  isGestureExcludedTarget,
  rubberBandOffset,
} from "@/lib/gestures/swipeGesture";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import type { BrowseNeighborsResult, SwipeDirection } from "@/lib/browseNavigation/types";
import { BROWSE_SWIPE_NAVIGATION_STATE } from "@/lib/browseNavigation/types";
import { usePlaybackBodyFocusHidden } from "@/lib/playbackBodyFocus";
import { useAuth } from "@/providers/AuthProvider";

import { SwipeLoadingEdge } from "./SwipeLoadingEdge";

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

  const [pullOffset, setPullOffset] = useState(0);
  const [edgeMessage, setEdgeMessage] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prefetchedDirection, setPrefetchedDirection] = useState<SwipeDirection | null>(null);

  const neighborsQuery = useQuery({
    queryKey: ["browse-neighbors", neighborsKey],
    queryFn: resolveNeighbors,
    staleTime: 5 * 60_000,
  });

  const resetPull = useCallback(() => {
    setPullOffset(0);
    setPreviewLabel(null);
    setPrefetchedDirection(null);
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
      if (prefetchedDirection === direction) return;
      if (pullDistance < SWIPE_COMMIT_THRESHOLD_PX * SWIPE_PREFETCH_RATIO) return;

      const result = neighborsQuery.data;
      if (!result) return;

      const target = neighborAt(result, direction);
      if (!target) return;

      setPrefetchedDirection(direction);
      setPreviewLabel(target.label);
      void prefetchBrowseTarget(queryClient, target, accessToken);
    },
    [accessToken, neighborsQuery.data, prefetchedDirection, queryClient],
  );

  const updatePull = useCallback(
    (direction: SwipeDirection, deltaX: number) => {
      const result = neighborsQuery.data;
      const hasTarget = result ? neighborAt(result, direction) !== null : false;
      const pullDistance = direction === "next" ? -deltaX : deltaX;
      const offset = hasTarget
        ? Math.max(-SWIPE_BOUNCE_MAX_PX, Math.min(SWIPE_BOUNCE_MAX_PX, deltaX * 0.35))
        : Math.sign(deltaX) * rubberBandOffset(Math.abs(deltaX), SWIPE_BOUNCE_MAX_PX);

      setPullOffset(offset);
      maybePrefetch(direction, pullDistance);
    },
    [maybePrefetch, neighborsQuery.data],
  );

  const handleSwipeFinish = useCallback(
    ({ axis, deltaX, committed }: { axis: "horizontal" | "vertical" | null; deltaX: number; committed: boolean }) => {
      setIsDragging(false);

      if (committed || axis !== "horizontal") return;

      const direction = deltaX < 0 ? "next" : "prev";
      const pullDistance = direction === "next" ? -deltaX : deltaX;
      const result = neighborsQuery.data;
      if (result && neighborAt(result, direction) === null && pullDistance > 0) {
        showEdgeMessage(`No more ${endLabel}`);
      }

      resetPull();
    },
    [endLabel, neighborsQuery.data, resetPull, showEdgeMessage],
  );

  const gestureHandlers = useSwipeGesture({
    enabled: !disabled,
    axis: "horizontal",
    horizontalCommitPx: SWIPE_COMMIT_THRESHOLD_PX,
    velocityThreshold: SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
    isExcludedTarget: isGestureExcludedTarget,
    onIntentStart: () => setIsDragging(true),
    onDrag: info => {
      if (info.axis !== "horizontal") return;
      updatePull(info.horizontalDirection, info.deltaX);
    },
    onHorizontalSwipe: direction => {
      void commitNavigation(direction);
    },
    onFinish: handleSwipeFinish,
    onCancel: () => {
      setIsDragging(false);
      resetPull();
    },
  });

  return (
    <div
      className={`relative touch-pan-y select-none ${isDragging ? "cursor-grabbing" : ""}`}
      onPointerDown={gestureHandlers.onPointerDown}
      onPointerMove={gestureHandlers.onPointerMove}
      onPointerUp={gestureHandlers.onPointerUp}
      onPointerCancel={gestureHandlers.onPointerCancel}
      onLostPointerCapture={gestureHandlers.onLostPointerCapture}
      onClickCapture={gestureHandlers.onClick}
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
