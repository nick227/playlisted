import type { PlaylistDetail } from "@playlisted/client-sdk";

import { usePageMeta } from "@/hooks/usePageMeta";

export function usePlaylistPageMeta(playlist: PlaylistDetail | undefined) {
  usePageMeta({
    title: playlist ? `${playlist.title} by ${playlist.owner.displayName}` : "Playlist",
    description: playlist?.description ?? undefined,
    image: playlist?.coverArtUrl,
  });
}
