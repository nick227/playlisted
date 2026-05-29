import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

export function useFavoriteRecordings() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["me", "favorites", "recordings"],
    queryFn: () => authedApi(accessToken).me.favoriteRecordings({ pageSize: 100 }),
    enabled: Boolean(accessToken),
  });
}

export function useFavoritePlaylists() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["me", "favorites", "playlists"],
    queryFn: () => authedApi(accessToken).me.favoritePlaylists({ pageSize: 100 }),
    enabled: Boolean(accessToken),
  });
}

export function useFavoriteArtists() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["me", "favorites", "artists"],
    queryFn: () => authedApi(accessToken).me.favoriteArtists({ pageSize: 100 }),
    enabled: Boolean(accessToken),
  });
}

export function useFavoriteIds() {
  const query = useFavoriteRecordings();
  const ids = new Set(query.data?.data.map((r) => r.id) ?? []);
  return { ids, isLoading: query.isLoading };
}

export function useFavoritePlaylistIds() {
  const query = useFavoritePlaylists();
  const ids = new Set(query.data?.data.map((p) => p.id) ?? []);
  return { ids, isLoading: query.isLoading };
}

export function useFavoriteArtistIds() {
  const query = useFavoriteArtists();
  const ids = new Set(query.data?.data.map((artist) => artist.id) ?? []);
  return { ids, isLoading: query.isLoading };
}

export function useToggleFavorite() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["me", "favorites", "recordings"] });

  const add = useMutation({
    mutationFn: (recordingId: string) => client.me.addFavorite(recordingId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (recordingId: string) => client.me.removeFavorite(recordingId),
    onSuccess: invalidate,
  });

  return { add, remove };
}

export function useToggleFavoritePlaylist() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["me", "favorites", "playlists"] });

  const add = useMutation({
    mutationFn: (playlistId: string) => client.me.addFavoritePlaylist(playlistId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (playlistId: string) => client.me.removeFavoritePlaylist(playlistId),
    onSuccess: invalidate,
  });

  return { add, remove };
}

export function useToggleFavoriteArtist() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["me", "favorites", "artists"] });

  const add = useMutation({
    mutationFn: (artistId: string) => client.me.addFavoriteArtist(artistId),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (artistId: string) => client.me.removeFavoriteArtist(artistId),
    onSuccess: invalidate,
  });

  return { add, remove };
}

export function useMostPlayed(limit = 20) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["me", "most-played", limit],
    queryFn: () => authedApi(accessToken).me.mostPlayed({ limit }),
    enabled: Boolean(accessToken),
  });
}

export function useRecentlyPlayed(limit = 20) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["me", "recently-played", limit],
    queryFn: () => authedApi(accessToken).me.recentlyPlayed({ limit }),
    enabled: Boolean(accessToken),
  });
}
