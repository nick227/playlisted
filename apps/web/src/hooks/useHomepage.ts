import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useHomepage() {
  return useQuery({
    queryKey: ["homepage"],
    queryFn: () => api.homepage.get(),
  });
}
