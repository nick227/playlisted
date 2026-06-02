import type { PlaylistDetail } from "@playlisted/client-sdk";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { CollectionView } from "@/components/collection/CollectionView";
import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { ContentRow } from "@/components/discovery/ContentRow";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { useIsMdUp } from "@/hooks/useIsMdUp";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

type PlaylistDetailViewProps = {
  playlist: PlaylistDetail;
};

export function PlaylistDetailView({ playlist }: PlaylistDetailViewProps) {
  const isMdUp = useIsMdUp();
  const relatedPlaylistLimit = isMdUp ? 5 : 6;
  const { data: related } = usePlaylists(relatedPlaylistLimit + 1);
  const { setQueue, currentTrack, togglePlay, playbackContext, state } = useAudioPlayer();
  const { status, user } = useAuth();
  const savedCollections = useCollectionPlaylists(100);
  const addCollection = useAddCollectionPlaylist();

  const recordings = playlist.recordings as CollectionRecording[];

  const queueTracks: QueueTrack[] = recordings.map((recording) => ({
    ...recording,
    playlistTitle: playlist.title,
    ownerName: playlist.owner.displayName,
  }));

  const playlistHasCurrent = playbackContext.playlistId === playlist.id;
  const playlistIsPlaying = playlistHasCurrent && state === "playing";
  const playlistIsPaused = playlistHasCurrent && state === "paused";
  const isInCollections =
    user?.id === playlist.ownerId ||
    (savedCollections.data?.data.some((item) => item.id === playlist.id) ?? false);

  function playAll(shuffle = false) {
    if (playlistHasCurrent) {
      togglePlay();
      return;
    }

    const tracks = shuffle ? [...queueTracks].sort(() => Math.random() - 0.5) : queueTracks;
    if (tracks.length > 0) {
      setQueue(
        tracks,
        0,
        {
          playlistId: playlist.id,
          playlistOwnerUsername: playlist.owner.username,
          playlistSlug: playlist.slug,
          sourceContext: "playlist",
        },
        { segmentLabel: playlist.title },
      );
    }
  }

  function playRecording(recording: CollectionRecording, index: number) {
    if (currentTrack?.id === recording.id) {
      togglePlay();
      return;
    }

    setQueue(
      queueTracks,
      index,
      {
        playlistId: playlist.id,
        playlistOwnerUsername: playlist.owner.username,
        playlistSlug: playlist.slug,
        sourceContext: "playlist",
      },
      { segmentLabel: playlist.title },
    );
  }

  return (
    <>
      <CollectionView
        playlist={playlist}
        mode="view"
        onPlayAll={playAll}
        onPlayTrack={playRecording}
        playlistIsPlaying={playlistIsPlaying}
        playlistIsPaused={playlistIsPaused}
        onAddCollection={
          status === "authenticated" ? () => addCollection.mutate(playlist.id) : undefined
        }
        collectionAddPending={addCollection.isPending}
        collectionAdded={isInCollections}
      />

      {related && related.data.length > 0 ? (
        <div className="mx-auto mt-14 max-w-5xl">
          <ContentRow title="More playlists">
            {related.data
              .filter((item) => item.id !== playlist.id)
              .slice(0, relatedPlaylistLimit)
              .map((item) => (
                <SmartPlaylistCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  creatorName={item.owner.displayName}
                  coverArtUrl={item.coverArtUrl}
                  ownerUsername={item.owner.username}
                  slug={item.slug}
                  className="w-45 shrink-0"
                />
              ))}
          </ContentRow>
        </div>
      ) : null}
    </>
  );
}

export function PlaylistPageSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
