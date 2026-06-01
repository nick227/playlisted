import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PlaylistAccessEmptyState } from "@/components/feedback/PlaylistAccessEmptyState";
import { PlaylistDetailView, PlaylistPageSkeleton } from "@/components/playlists/PlaylistDetailView";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { usePlaylistPageMeta } from "@/hooks/usePlaylistPageMeta";
import { playlistPath } from "@/lib/routes";

export function CanonicalPlaylistPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { data: playlist, isLoading, isError, error } = usePlaylistByUsernameSlug(username, slug);
  usePlaylistPageMeta(playlist);
  const navigate = useNavigate();

  useEffect(() => {
    if (!playlist) return;
    if (username === playlist.owner.username && slug === playlist.slug) return;
    navigate(
      playlistPath({
        id: playlist.id,
        href: playlist.href,
        username: playlist.owner.username,
        slug: playlist.slug,
      }),
      { replace: true },
    );
  }, [navigate, playlist, username, slug]);

  if (isLoading) {
    return <PlaylistPageSkeleton />;
  }

  if (isError || !playlist) {
    return <PlaylistAccessEmptyState error={error} />;
  }

  return <PlaylistDetailView playlist={playlist} />;
}
