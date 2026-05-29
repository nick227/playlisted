import type { LibrarySong } from "@playlisted/client-sdk";
import { useMemo } from "react";

import { useLibrarySongs } from "@/hooks/useLibrary";

export function useArtistTracks(userId: string | undefined) {
  const query = useLibrarySongs(null, Boolean(userId));

  const tracks = useMemo(() => {
    if (!userId) return [] as LibrarySong[];
    return (query.data?.data ?? []).filter((song) => song.uploaderId === userId);
  }, [query.data?.data, userId]);

  return { tracks, ...query };
}
