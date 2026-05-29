import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { CollectionView } from "@/components/collection/CollectionView";
import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { ContentRow } from "@/components/discovery/ContentRow";
import { PlaylistAccessEmptyState } from "@/components/feedback/PlaylistAccessEmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { usePlaylists } from "@/hooks/usePlaylists";
import { playlistPath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

export function CanonicalPlaylistPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { data: playlist, isLoading, isError, error } = usePlaylistByUsernameSlug(username, slug);
  const { data: related } = usePlaylists(6);
  const { setQueue, togglePlay, playbackContext, state } = useAudioPlayer();
  const { status, user } = useAuth();
  const savedCollections = useCollectionPlaylists(100);
  const addCollection = useAddCollectionPlaylist();
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
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !playlist) {
    return <PlaylistAccessEmptyState error={error} />;
  }

  const pl = playlist;

  const recordings = pl.recordings as CollectionRecording[];

  const queueTracks: QueueTrack[] = recordings.map((r) => ({
    ...r,
    playlistTitle: pl.title,
    ownerName: pl.owner.displayName,
  }));

  const playlistHasCurrent = playbackContext.playlistId === pl.id;
  const playlistIsPlaying = playlistHasCurrent && state === "playing";
  const playlistIsPaused = playlistHasCurrent && state === "paused";
  const isInCollections =
    user?.id === pl.ownerId || (savedCollections.data?.data.some((item) => item.id === pl.id) ?? false);

  function playAll(shuffle = false) {
    if (playlistHasCurrent) {
      togglePlay();
      return;
    }
    const tracks = shuffle ? [...queueTracks].sort(() => Math.random() - 0.5) : queueTracks;
    if (tracks.length > 0) {
      setQueue(tracks, 0, {
        playlistId: pl.id,
        playlistOwnerUsername: pl.owner.username,
        playlistSlug: pl.slug,
        sourceContext: "playlist",
      });
    }
  }

  function playRecording(_recording: CollectionRecording, index: number) {
    setQueue(queueTracks, index, {
      playlistId: pl.id,
      playlistOwnerUsername: pl.owner.username,
      playlistSlug: pl.slug,
      sourceContext: "playlist",
    });
  }

  return (
    <>
      <CollectionView
        playlist={pl}
        mode="view"
        onPlayAll={playAll}
        onPlayTrack={playRecording}
        playlistIsPlaying={playlistIsPlaying}
        playlistIsPaused={playlistIsPaused}
        onAddCollection={
          status === "authenticated" ? () => addCollection.mutate(pl.id) : undefined
        }
        collectionAddPending={addCollection.isPending}
        collectionAdded={isInCollections}
      />

      {related && related.data.length > 0 ? (
        <div className="mx-auto mt-14 max-w-4xl">
          <ContentRow title="More playlists">
            {related.data
              .filter((p) => p.id !== pl.id)
              .slice(0, 5)
              .map((p) => (
                <SmartPlaylistCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  creatorName={p.owner.displayName}
                  coverArtUrl={p.coverArtUrl}
                  ownerUsername={p.owner.username}
                  slug={p.slug}
                  className="w-40 shrink-0"
                />
              ))}
          </ContentRow>
        </div>
      ) : null}
    </>
  );
}
