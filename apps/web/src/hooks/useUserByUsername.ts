import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useUserByUsername(username: string | undefined) {
  return useQuery({
    queryKey: ["user", "username", username],
    queryFn: () => api.users.getByUsername(username!),
    enabled: Boolean(username),
  });
}
