import { useCallback, useEffect, useMemo } from "react";
import type { PlaylistDetail } from "@playlisted/client-sdk";

import { SwipeBrowseShell } from "@/components/browse/SwipeBrowseShell";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { CollectionView } from "@/components/collection/CollectionView";
import { BrowseBreadcrumbs } from "@/components/library/BrowseBreadcrumbs";
import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { ContentRow } from "@/components/discovery/ContentRow";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { useIsMdUp } from "@/hooks/useIsMdUp";
import { usePlaylistHashTrack } from "@/hooks/usePlaylistHashTrack";
import { usePlaylists } from "@/hooks/usePlaylists";
import { BROWSE_LAYOUT_CLASS, playlistBrowseCrumbs } from "@/lib/browsePaths";
import { resolvePlaylistBrowseSequence } from "@/lib/browseNavigation/resolvePlaylistNeighbors";
import { collectionTrackOrigin } from "@/lib/playbackOrigin";
import { recordingHash } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

type PlaylistDetailViewProps = {
  playlist: PlaylistDetail;
  isRefreshing?: boolean;
};

export function PlaylistDetailView({ playlist, isRefreshing = false }: PlaylistDetailViewProps) {
  const isMdUp = useIsMdUp();
  const relatedPlaylistLimit = isMdUp ? 4 : 6;
  const { data: related } = usePlaylists(relatedPlaylistLimit + 1);
  const { setQueue, currentTrack, togglePlay, ensurePlayback, playbackContext, state } = useAudioPlayer();
  const { status, user } = useAuth();
  const savedCollections = useCollectionPlaylists(100);
  const addCollection = useAddCollectionPlaylist();

  const recordings = playlist.recordings as CollectionRecording[];

  const queueTracks: QueueTrack[] = useMemo(
    () =>
      recordings.map((recording) => ({
        ...recording,
        playlistTitle: playlist.title,
        ownerName: playlist.owner.displayName,
        ownerUsername: playlist.owner.username,
        artistImageUrl: playlist.owner.avatarUrl,
        playlistSlug: playlist.slug,
      })),
    [playlist.owner.displayName, playlist.owner.username, playlist.slug, playlist.title, recordings],
  );

  const playlistContainsCurrentTrack = Boolean(
    currentTrack?.id && recordings.some((recording) => recording.id === currentTrack.id),
  );
  const playlistHasCurrent = playbackContext.playlistId === playlist.id || playlistContainsCurrentTrack;
  const playlistIsPlaying = playlistHasCurrent && state === "playing";
  const playlistIsPaused = playlistHasCurrent && state === "paused";
  const isInCollections =
    user?.id === playlist.ownerId ||
    (savedCollections.data?.data.some((item) => item.id === playlist.id) ?? false);

  const playAll = useCallback((shuffle = false) => {
    if (playlistHasCurrent) {
      if (playlistIsPlaying) {
        togglePlay();
      } else {
        ensurePlayback();
      }
      return;
    }

    const tracks = shuffle ? [...queueTracks].sort(() => Math.random() - 0.5) : queueTracks;
    if (tracks.length > 0) {
      const origin = collectionTrackOrigin(playlist.id, tracks[0].id);
      setQueue(
        tracks,
        0,
        {
          playlistId: playlist.id,
          playlistOwnerUsername: playlist.owner.username,
          playlistSlug: playlist.slug,
          sourceContext: "playlist",
        },
        { segmentLabel: playlist.title, playbackOrigin: origin, originScope: "track" },
      );
    }
  }, [
    playlist.id,
    playlist.owner.username,
    playlist.slug,
    playlist.title,
    playlistHasCurrent,
    playlistIsPlaying,
    queueTracks,
    ensurePlayback,
    setQueue,
    togglePlay,
  ]);

  const playRecording = useCallback((recording: CollectionRecording, index: number) => {
    const playbackOrigin = collectionTrackOrigin(playlist.id, recording.id);

    if (currentTrack?.id === recording.id) {
      if (state === "playing") {
        togglePlay();
      } else {
        ensurePlayback();
      }
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
      { segmentLabel: playlist.title, playbackOrigin, originScope: "track" },
    );
  }, [
    currentTrack?.id,
    state,
    playlist.id,
    playlist.owner.username,
    playlist.slug,
    playlist.title,
    queueTracks,
    ensurePlayback,
    setQueue,
    togglePlay,
  ]);

  useEffect(() => {
    if (!currentTrack) return;
    if (!recordings.some((recording) => recording.id === currentTrack.id)) return;

    const nextHash = recordingHash(currentTrack.title);
    if (window.location.hash === nextHash) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
  }, [currentTrack, recordings]);

  const browseCrumbs = playlistBrowseCrumbs(
    { displayName: playlist.owner.displayName, username: playlist.owner.username },
    playlist.title,
  );

  usePlaylistHashTrack(recordings, playRecording);

  const resolveNeighbors = useCallback(
    () => resolvePlaylistBrowseSequence(playlist),
    [playlist],
  );

  return (
    <SwipeBrowseShell
      neighborsKey={`playlist:${playlist.id}`}
      resolveNeighbors={resolveNeighbors}
      endLabel="playlists"
      isRefreshing={isRefreshing}
    >
      <div className={BROWSE_LAYOUT_CLASS}>
        <BrowseBreadcrumbs crumbs={browseCrumbs} />
        <div className="mt-5">
          <CollectionView
            playlist={playlist}
            mode="view"
            onPlayAll={playAll}
            onPlayTrack={playRecording}
            playbackOriginForTrack={(recording) => collectionTrackOrigin(playlist.id, recording.id)}
            activeWhenTrackMatches={playlistContainsCurrentTrack}
            playlistIsPlaying={playlistIsPlaying}
            playlistIsPaused={playlistIsPaused}
            onAddCollection={
              status === "authenticated" ? () => addCollection.mutate(playlist.id) : undefined
            }
            collectionAddPending={addCollection.isPending}
            collectionAdded={isInCollections}
          />
        </div>
      </div>

      {related && related.data.length > 0 ? (
        <div className={`${BROWSE_LAYOUT_CLASS} mt-4`}>
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
                  className="w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] shrink-0"
                />
              ))}
          </ContentRow>
        </div>
      ) : null}
    </SwipeBrowseShell>
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
