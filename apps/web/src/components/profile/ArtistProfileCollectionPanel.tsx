import type { UserDetail } from "@playlisted/client-sdk";
import { ChevronDown, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { TrackList } from "@/components/tracks/TrackList";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { useAuthAction } from "@/hooks/useAuthAction";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { formatPlayCount } from "@/lib/format";
import { coverFallback } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

import { computePlaylistStreams } from "./artistProfileUtils";

type PlaylistSummary = UserDetail["publicPlaylists"][number];

type ArtistProfileCollectionPanelProps = {
  playlist: PlaylistSummary;
  owner: UserDetail;
};

export function ArtistProfileCollectionPanel({ playlist, owner }: ArtistProfileCollectionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const pendingPlayRef = useRef(false);
  const { user, status } = useAuth();
  const requireAuth = useAuthAction();
  const savedCollections = useCollectionPlaylists(100);
  const addCollection = useAddCollectionPlaylist();
  const { data: detail, isLoading } = usePlaylistByUsernameSlug(
    shouldLoad ? owner.username : undefined,
    shouldLoad ? playlist.slug : undefined,
  );
  const { setQueue, togglePlay, playbackContext, state } = useAudioPlayer();

  const isActive = playbackContext.playlistId === playlist.id;
  const isPlaying = isActive && state === "playing";
  const isOwner = user?.id === owner.id;
  const isFollowing =
    isOwner || (savedCollections.data?.data.some((item) => item.id === playlist.id) ?? false);

  const recordings = (detail?.recordings ?? []) as CollectionRecording[];
  const queueTracks: QueueTrack[] = recordings.map((recording) => ({
    ...recording,
    playlistTitle: playlist.title,
    ownerName: owner.displayName,
  }));
  const totalStreams = computePlaylistStreams(recordings);

  useEffect(() => {
    if (!pendingPlayRef.current || recordings.length === 0) return;
    pendingPlayRef.current = false;
    const tracks = recordings.map((recording) => ({
      ...recording,
      playlistTitle: playlist.title,
      ownerName: owner.displayName,
    }));
    setQueue(tracks, 0, {
      playlistId: playlist.id,
      playlistOwnerUsername: owner.username,
      playlistSlug: playlist.slug,
      sourceContext: "artist-profile",
    });
  }, [recordings, owner.displayName, owner.username, playlist.id, playlist.slug, playlist.title, setQueue]);

  function ensureLoaded() {
    if (!shouldLoad) setShouldLoad(true);
  }

  function playAll() {
    ensureLoaded();
    if (isActive) {
      togglePlay();
      return;
    }
    if (queueTracks.length === 0) {
      pendingPlayRef.current = true;
      return;
    }
    setQueue(queueTracks, 0, {
      playlistId: playlist.id,
      playlistOwnerUsername: owner.username,
      playlistSlug: playlist.slug,
      sourceContext: "artist-profile",
    });
  }

  function playTrack(_recording: CollectionRecording, index: number) {
    setQueue(queueTracks, index, {
      playlistId: playlist.id,
      playlistOwnerUsername: owner.username,
      playlistSlug: playlist.slug,
      sourceContext: "artist-profile",
    });
  }

  function handleFollow() {
    requireAuth(() => addCollection.mutate(playlist.id));
  }

  return (
    <article className="border-b border-white/8 py-6 last:border-b-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={playAll}
          onMouseEnter={ensureLoaded}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-md"
        >
          {playlist.coverArtUrl ? (
            <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(playlist.title) }} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
            {isPlaying ? (
              <Pause size={20} className="text-white" fill="currentColor" />
            ) : (
              <Play size={20} className="ml-0.5 text-white" fill="currentColor" />
            )}
          </div>
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-medium text-white">{playlist.title}</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {playlist.itemCount} tracks
            {shouldLoad && !isLoading && recordings.length > 0
              ? ` · ${formatPlayCount(totalStreams) || "0"} streams`
              : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={playAll}
            onMouseEnter={ensureLoaded}
            className="text-sm text-[var(--color-text-muted)] transition hover:text-white"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
            <FavoriteHeartButton target="playlist" id={playlist.id} variant="inline" className="!opacity-100 !p-0" />
            Like
          </div>
          {status === "authenticated" && !isOwner ? (
            <button
              type="button"
              onClick={handleFollow}
              disabled={addCollection.isPending || isFollowing}
              className="text-sm text-[var(--color-text-muted)] transition hover:text-white disabled:opacity-50"
            >
              {isFollowing ? "Following" : addCollection.isPending ? "Following…" : "Follow collection"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              ensureLoaded();
              setExpanded((open) => !open);
            }}
            className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] transition hover:text-white"
            aria-expanded={expanded}
          >
            Tracks
            <ChevronDown size={14} className={`transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 pl-0 sm:pl-24">
          {isLoading ? (
            <p className="text-sm text-[var(--color-text-muted)]">Loading tracks…</p>
          ) : recordings.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No tracks yet.</p>
          ) : (
            <TrackList
              recordings={recordings}
              ownerName={owner.displayName}
              playlistContext={{
                playlistId: playlist.id,
                playlistTitle: playlist.title,
                ownerUsername: owner.username,
                ownerDisplayName: owner.displayName,
                slug: playlist.slug,
              }}
              onPlay={playTrack}
            />
          )}
        </div>
      ) : null}
    </article>
  );
}
