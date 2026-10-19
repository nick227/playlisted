import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function userByUsernameQueryOptions(username: string | undefined) {
  return {
    queryKey: ["user", "username", username],
    queryFn: () => api.users.getByUsername(username!),
    enabled: Boolean(username),
  };
}

export function useUserByUsername(username: string | undefined) {
  return useQuery({ ...userByUsernameQueryOptions(username), placeholderData: keepPreviousData });
}
