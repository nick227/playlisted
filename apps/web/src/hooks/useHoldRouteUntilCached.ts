import { use, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { hashKey, useQueryClient, type FetchQueryOptions } from "@tanstack/react-query";

export type RouteQuery = Pick<FetchQueryOptions<any, any, any, any>, "queryKey" | "queryFn" | "staleTime" | "gcTime"> & {
  enabled?: unknown;
};

const inflight = new Map<string, Promise<void>>();

/**
 * Suspends a route page until its layout-critical queries have settled once.
 * Router navigations run inside `startTransition`, so React keeps the previous
 * page on screen and swaps straight to the finished one instead of flashing a
 * skeleton. Every uncached query starts before suspending, so independent
 * requests load in parallel. Errors are swallowed here; the page's own
 * `useQuery` reads the cached error state and renders its empty state.
 *
 * Only holds while a navigation is landing (first mount, or a new location
 * key). Later key changes — station switch, login, background refetch — aren't
 * transitions, so suspending then would blank the page to the route fallback.
 *
 * Call it once per component, as the last hook: each retry after a suspend must
 * reach the suspension point with the same hook list, or React bails out of
 * concurrent rendering.
 */
export function useHoldRouteUntilCached(...queries: Array<RouteQuery | null | undefined | false>) {
  const queryClient = useQueryClient();
  const { key: locationKey } = useLocation();
  const committedLocationKeyRef = useRef<string | null>(null);
  useEffect(() => {
    committedLocationKeyRef.current = locationKey;
  }, [locationKey]);

  if (committedLocationKeyRef.current === locationKey) return;

  const pending: Promise<void>[] = [];

  for (const query of queries) {
    if (!query || query.enabled === false) continue;

    const state = queryClient.getQueryState(query.queryKey);
    if (state && (state.data !== undefined || state.status === "error")) continue;

    const hash = hashKey(query.queryKey);
    let promise = inflight.get(hash);
    if (!promise) {
      promise = queryClient
        .fetchQuery({
          queryKey: query.queryKey,
          queryFn: query.queryFn,
          staleTime: query.staleTime,
          gcTime: query.gcTime,
        })
        .then(
          () => undefined,
          () => undefined,
        )
        .finally(() => inflight.delete(hash));
      inflight.set(hash, promise);
    }
    pending.push(promise);
  }

  if (pending.length > 0) use(pending[0]);
}
