import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.users.getById(userId!),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}
