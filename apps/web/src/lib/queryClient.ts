import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      // Don't refire every stale mounted query on each tab focus; data that
      // must stay live (radio, admin) polls explicitly via refetchInterval.
      refetchOnWindowFocus: false,
    },
  },
});
