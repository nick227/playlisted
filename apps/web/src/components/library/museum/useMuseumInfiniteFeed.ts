import { useEffect, useMemo, useRef, useState } from "react";
import { buildMuseumFeed, shuffleMuseumPools } from "./museumFeed";
import type { MuseumPools } from "./museumTypes";

export function useMuseumInfiniteFeed(pools: MuseumPools) {
  const [batchCount, setBatchCount] = useState(1);
  const [seed] = useState(() => Date.now());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const shuffledPools = useMemo(() => shuffleMuseumPools(pools, seed), [pools, seed]);
  const { exhibits, hasMore } = useMemo(
    () => buildMuseumFeed(shuffledPools, batchCount),
    [batchCount, shuffledPools],
  );

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    let requested = false;
    const observer = new IntersectionObserver((entries) => {
      if (!requested && entries[0]?.isIntersecting) {
        requested = true;
        setBatchCount(count => count + 1);
      }
    }, { rootMargin: "480px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, batchCount, shuffledPools]);

  return { exhibits, sentinelRef, hasMore };
}
