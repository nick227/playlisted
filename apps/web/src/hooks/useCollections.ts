import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function useCollectionPlaylists(pageSize = 100) {
  const { accessToken, user } = useAuth();

  return useQuery({
    queryKey: ["me", "collections", "playlists", pageSize, user?.id ?? "guest"],
    queryFn: () => authedApi(accessToken).me.collectionPlaylists({ pageSize }),
    enabled: Boolean(accessToken),
  });
}

export function useAddCollectionPlaylist() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (playlistId: string) => authedApi(accessToken).me.addCollectionPlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "collections", "playlists"] });
    },
  });
}
