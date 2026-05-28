import { useState } from "react";
import { useParams } from "react-router-dom";

import { PlaylistCard } from "@/components/cards/PlaylistCard";
import { CollectionView } from "@/components/collection/CollectionView";
import type { CollectionRecording } from "@/components/collection/partitionRecordings";
import { mergeForPlayback, partitionRecordings } from "@/components/collection/partitionRecordings";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { usePlaylist } from "@/hooks/usePlaylist";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

export function PlaylistPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { data: playlist, isLoading, isError } = usePlaylist(playlistId);
  const { data: related } = usePlaylists(6);
  const { setQueue, currentTrack, state, togglePlay } = useAudioPlayer();
  const { status } = useAuth();
  const [addOpen, setAddOpen] = useState(false);

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

  const { ownUploads, fromOthers } = partitionRecordings(
    playlist.recordings as CollectionRecording[],
    playlist.ownerId,
  );
  const playbackOrder = mergeForPlayback(ownUploads, fromOthers);

  const queueTracks: QueueTrack[] = playbackOrder.map((r) => ({
    ...r,
    playlistTitle: playlist.title,
    ownerName: playlist.owner.displayName,
  }));

  const currentPlaylistId = playlist.id;
  const playlistHasCurrent = currentTrack ? currentTrack.publishedPlaylistId === currentPlaylistId : false;
  const playlistIsPlaying = playlistHasCurrent && state === "playing";
  const playlistIsPaused = playlistHasCurrent && state === "paused";

  function playAll(shuffle = false) {
    if (playlistHasCurrent) {
      togglePlay();
      return;
    }
    const tracks = shuffle ? [...queueTracks].sort(() => Math.random() - 0.5) : queueTracks;
    if (tracks.length > 0) {
      setQueue(tracks, 0, { playlistId: currentPlaylistId, sourceContext: "playlist" });
    }
  }

  function playRecording(_recording: CollectionRecording, index: number) {
    setQueue(queueTracks, index, { playlistId: currentPlaylistId, sourceContext: "playlist" });
  }

  return (
    <>
      <CollectionView
        playlist={playlist}
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
        recordingIds={playlist.recordings.map((r) => r.id)}
        title={`Add "${playlist.title}" (${playlist.itemCount} tracks)`}
      />

      {related && related.data.length > 0 ? (
        <div className="mx-auto mt-14 max-w-6xl">
          <ContentRow title="More playlists">
            {related.data
              .filter((p) => p.id !== playlist.id)
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
