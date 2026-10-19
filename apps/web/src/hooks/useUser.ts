import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function userQueryOptions(userId: string | undefined) {
  return {
    queryKey: ["user", userId],
    queryFn: () => api.users.getById(userId!),
    enabled: Boolean(userId),
  };
}

export function useUser(userId: string | undefined) {
  return useQuery({ ...userQueryOptions(userId), placeholderData: keepPreviousData });
}
