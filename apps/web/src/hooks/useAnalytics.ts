import { useQuery } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import type { ChartRange } from "@playlisted/client-sdk";

export function useAnalyticsSummary(range: ChartRange) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () => authedApi(accessToken).analytics.summary({ range }),
    enabled: Boolean(accessToken),
  });
}

export function useAnalyticsRecordings(
  range: ChartRange,
  sortBy: "plays" | "duration" | "completion",
  order: "asc" | "desc",
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["analytics", "recordings", range, sortBy, order],
    queryFn: () =>
      authedApi(accessToken).analytics.recordings({ range, sortBy, order, pageSize: 100 }),
    enabled: Boolean(accessToken),
  });
}

export function useAnalyticsPlaylists(
  range: ChartRange,
  sortBy: "plays" | "duration" | "completion" | "likes" | "follows",
  order: "asc" | "desc",
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["analytics", "playlists", range, sortBy, order],
    queryFn: () =>
      authedApi(accessToken).analytics.playlists({ range, sortBy, order, pageSize: 100 }),
    enabled: Boolean(accessToken),
  });
}
