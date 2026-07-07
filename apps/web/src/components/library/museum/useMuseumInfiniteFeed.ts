import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { buildMuseumBatch, shuffleMuseumPools } from "./museumFeed";
import type { MuseumExhibit, MuseumPools } from "./museumTypes";

export function useMuseumInfiniteFeed(pools: MuseumPools) {
  const [batchCount, setBatchCount] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const shuffledRef = useRef<MuseumPools | null>(null);

  if (!shuffledRef.current && (pools.artists.length > 0 || pools.songs.length > 0)) {
    shuffledRef.current = shuffleMuseumPools(pools);
  }

  const shuffledPools = shuffledRef.current ?? pools;

  const exhibits = useMemo(() => {
    const merged: MuseumExhibit[] = [];
    for (let i = 0; i < batchCount; i += 1) {
      merged.push(...buildMuseumBatch(i, shuffledPools));
    }
    return merged;
  }, [batchCount, shuffledPools]);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setBatchCount((count) => count + 1);
    window.setTimeout(() => {
      loadingRef.current = false;
    }, 400);
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "480px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return { exhibits, sentinelRef };
}
