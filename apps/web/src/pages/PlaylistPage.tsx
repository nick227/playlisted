import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PlaylistAccessEmptyState } from "@/components/feedback/PlaylistAccessEmptyState";
import { PlaylistDetailView, PlaylistPageSkeleton } from "@/components/playlists/PlaylistDetailView";
import { usePlaylist } from "@/hooks/usePlaylist";
import { usePlaylistPageMeta } from "@/hooks/usePlaylistPageMeta";
import { playlistPath } from "@/lib/routes";

export function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { data: playlist, isLoading, isError, error } = usePlaylist(playlistId);
  usePlaylistPageMeta(playlist);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playlist?.owner?.username || !playlist.slug) return;
    navigate(
      playlistPath({
        id: playlist.id,
        href: playlist.href,
        username: playlist.owner.username,
        slug: playlist.slug,
      }),
      { replace: true },
    );
  }, [navigate, playlist?.id, playlist?.href, playlist?.owner?.username, playlist?.slug]);

  if (isLoading) {
    return <PlaylistPageSkeleton />;
  }

  if (isError || !playlist) {
    return <PlaylistAccessEmptyState error={error} />;
  }

  return <PlaylistDetailView playlist={playlist} />;
}
