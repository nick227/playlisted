import { useCallback, useEffect, useRef } from "react";

export function useTimelineTrackRect() {
  const trackRef = useRef<HTMLDivElement>(null);
  const trackRectRef = useRef<DOMRect | null>(null);

  const refreshTrackRect = useCallback(() => {
    trackRectRef.current = trackRef.current?.getBoundingClientRect() ?? null;
  }, []);

  const getTrackRect = useCallback(() => trackRectRef.current, []);

  useEffect(() => {
    const element = trackRef.current;
    if (!element) return;

    refreshTrackRect();
    const observer = new ResizeObserver(() => refreshTrackRect());
    observer.observe(element);
    return () => observer.disconnect();
  }, [refreshTrackRect]);

  return { trackRef, getTrackRect, refreshTrackRect };
}
