import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PlaylistCard } from "@/components/cards/PlaylistCard";
import { CollectionView } from "@/components/collection/CollectionView";
import type { CollectionRecording } from "@/components/collection/partitionRecordings";
import { mergeForPlayback, partitionRecordings } from "@/components/collection/partitionRecordings";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

export function CanonicalPlaylistPage() {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const { data: playlist, isLoading, isError } = usePlaylistByUsernameSlug(username, slug);
  const { data: related } = usePlaylists(6);
  const { setQueue, currentTrack, state, togglePlay, playbackContext } = useAudioPlayer();
  const { status } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !playlist) {
    return <EmptyState title="Playlist not found" description="This playlist may have been removed." />;
  }

  const pl = playlist;

  const { ownUploads, fromOthers } = partitionRecordings(
    pl.recordings as CollectionRecording[],
    pl.ownerId,
  );
  const playbackOrder = mergeForPlayback(ownUploads, fromOthers);

  const queueTracks: QueueTrack[] = playbackOrder.map((r) => ({
    ...r,
    playlistTitle: pl.title,
    ownerName: pl.owner.displayName,
  }));

  const playlistHasCurrent = playbackContext.playlistId === pl.id;
  const playlistIsPlaying = playlistHasCurrent && state === "playing";
  const playlistIsPaused = playlistHasCurrent && state === "paused";

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

  // Keep the URL normalized to /@username/:slug
  if (username !== pl.owner.username || slug !== pl.slug) {
    navigate(`/@${pl.owner.username}/${pl.slug}`, { replace: true });
  }

  return (
    <>
      <CollectionView
        playlist={pl}
        mode="view"
        activeTrackId={currentTrack?.id}
        playerState={state}
        onPlayAll={playAll}
        onPlayTrack={playRecording}
        playlistIsPlaying={playlistIsPlaying}
        playlistIsPaused={playlistIsPaused}
        onAddCollectionToPlaylist={status === "authenticated" ? () => setAddOpen(true) : undefined}
      />

      <AddToPlaylistDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        recordingIds={pl.recordings.map((r) => r.id)}
        title={`Add "${pl.title}" (${pl.itemCount} tracks)`}
      />

      {related && related.data.length > 0 ? (
        <div className="mx-auto mt-14 max-w-6xl">
          <ContentRow title="More playlists">
            {related.data
              .filter((p) => p.id !== pl.id)
              .slice(0, 6)
              .map((p) => (
                <PlaylistCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  creatorName={p.owner.displayName}
                  coverArtUrl={p.coverArtUrl}
                />
              ))}
          </ContentRow>
        </div>
      ) : null}
    </>
  );
}

