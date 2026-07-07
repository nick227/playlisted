import type { UserDetail } from "@playlisted/client-sdk";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { Skeleton } from "@/components/feedback/Skeleton";
import { TrackList } from "@/components/tracks/TrackList";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { useAuthAction } from "@/hooks/useAuthAction";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { formatPlayCount } from "@/lib/format";
import { artistProfileTrackOrigin } from "@/lib/playbackOrigin";
import { coverFallback, playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

import { computePlaylistStreams } from "./artistProfileUtils";

type PlaylistSummary = UserDetail["publicPlaylists"][number];

type ArtistProfileCollectionPanelProps = {
  playlist: PlaylistSummary;
  owner: UserDetail;
  editHref?: string;
};

function CollectionBannerLightning() {
  return (
    <div className="collection-banner-lightning" aria-hidden="true">
      <div className="collection-banner-lightning__flash" />
      <span className="collection-banner-lightning__bolt collection-banner-lightning__bolt--1" />
      <span className="collection-banner-lightning__bolt collection-banner-lightning__bolt--2" />
      <span className="collection-banner-lightning__bolt collection-banner-lightning__bolt--3" />
      <div className="collection-banner-lightning__edge" />
    </div>
  );
}

export function ArtistProfileCollectionPanel({ playlist, owner, editHref }: ArtistProfileCollectionPanelProps) {
  const pendingPlayRef = useRef(false);
  const { user, status } = useAuth();
  const requireAuth = useAuthAction();
  const savedCollections = useCollectionPlaylists(100);
  const addCollection = useAddCollectionPlaylist();
  const { data: detail, isLoading } = usePlaylistByUsernameSlug(owner.username, playlist.slug);
  const { setQueue, currentTrack, togglePlay, ensurePlayback, playbackContext, activeOriginKey, state } = useAudioPlayer();

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
    artistImageUrl: owner.avatarUrl,
  }));
  const totalStreams = computePlaylistStreams(recordings);

  const bannerBackgroundStyle = playlist.coverArtUrl
    ? { backgroundImage: `url(${playlist.coverArtUrl})` }
    : { background: coverFallback(playlist.title) };

  useEffect(() => {
    if (!pendingPlayRef.current || recordings.length === 0) return;
    pendingPlayRef.current = false;
    setQueue(
      queueTracks,
      0,
      {
        playlistId: playlist.id,
        playlistOwnerUsername: owner.username,
        playlistSlug: playlist.slug,
        sourceContext: "artist-profile",
      },
      {
        segmentLabel: playlist.title,
        playbackOrigin: artistProfileTrackOrigin(playlist.id, queueTracks[0].id),
        originScope: "track",
      },
    );
  }, [recordings, owner.username, playlist.id, playlist.slug, playlist.title, queueTracks, setQueue]);

  function playAll() {
    if (isActive) {
      if (isPlaying) {
        togglePlay();
      } else {
        ensurePlayback();
      }
      return;
    }
    if (queueTracks.length === 0) {
      pendingPlayRef.current = true;
      return;
    }
    setQueue(
      queueTracks,
      0,
      {
        playlistId: playlist.id,
        playlistOwnerUsername: owner.username,
        playlistSlug: playlist.slug,
        sourceContext: "artist-profile",
      },
      {
        segmentLabel: playlist.title,
        playbackOrigin: artistProfileTrackOrigin(playlist.id, queueTracks[0].id),
        originScope: "track",
      },
    );
  }

  function playTrack(recording: CollectionRecording, index: number) {
    const playbackOrigin = artistProfileTrackOrigin(playlist.id, recording.id);

    if (currentTrack?.id === recording.id && activeOriginKey === playbackOrigin) {
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
        playlistOwnerUsername: owner.username,
        playlistSlug: playlist.slug,
        sourceContext: "artist-profile",
      },
      { segmentLabel: playlist.title, playbackOrigin, originScope: "track" },
    );
  }

  function handleFollow() {
    requireAuth(() => addCollection.mutate(playlist.id));
  }

  const href = playlistPath({
    id: playlist.id,
    href: playlist.href,
    username: owner.username,
    slug: playlist.slug,
  });

  return (
    <article className="min-w-0 overflow-x-clip">
      <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-white/8 md:min-h-[260px]">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700"
          style={bannerBackgroundStyle}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/35" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/25"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          aria-hidden="true"
        />

        <span
          className={[
            "collection-banner-glow",
            isActive ? "is-active" : "",
            isPlaying ? "is-playing" : "",
          ].join(" ")}
          aria-hidden="true"
        />
        {isPlaying ? <CollectionBannerLightning /> : null}

        <div className="relative z-10 flex min-h-[220px] flex-col justify-between p-5 md:min-h-[260px] md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">
              {isActive ? (
                <PlaybackBars active={isActive} playing={isPlaying} variant="row-compact" className="!mb-0" />
              ) : null}
              <span>{playlist.itemCount} tracks</span>
            </div>
            {isOwner ? (
              <Link
                to={editHref ?? studioCollectionEditPath(playlist.id)}
                className="shrink-0 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
              >
                Edit
              </Link>
            ) : null}
          </div>

          <div className="mt-auto flex items-end gap-4 md:gap-5">
            <button
              type="button"
              onClick={playAll}
              aria-label={isPlaying ? `Pause ${playlist.title}` : `Play ${playlist.title}`}
              className="group/play relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/12 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:scale-105 hover:border-white/40 hover:bg-white/20 md:h-16 md:w-16"
            >
              {isPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} className="ml-0.5" fill="currentColor" />
              )}
            </button>

            <div className="min-w-0 flex-1 pb-0.5">
              <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white md:text-3xl">
                <Link
                  to={href}
                  className="break-words transition hover:text-[var(--color-brand)] hover:underline"
                >
                  {playlist.title}
                </Link>
              </h3>
              <p className="mt-1.5 text-sm text-white/65">
                {!isLoading && recordings.length > 0
                  ? `${formatPlayCount(totalStreams) || "0"} streams`
                  : "Loading streams…"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/25 px-3 py-1 text-sm text-white/75 backdrop-blur-sm">
                  <FavoriteHeartButton
                    target="playlist"
                    id={playlist.id}
                    variant="inline"
                    className="!opacity-100 !p-0"
                  />
                  Like
                </div>
                {status === "authenticated" && !isOwner ? (
                  <button
                    type="button"
                    onClick={handleFollow}
                    disabled={addCollection.isPending || isFollowing}
                    className="rounded-full border border-white/12 bg-black/25 px-3 py-1 text-sm text-white/75 backdrop-blur-sm transition hover:border-white/25 hover:text-white disabled:opacity-50"
                  >
                    {isFollowing ? "Following" : addCollection.isPending ? "Following…" : "Follow"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 px-1">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: Math.min(playlist.itemCount, 4) }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
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
            playbackOriginForTrack={(recording) => artistProfileTrackOrigin(playlist.id, recording.id)}
          />
        )}
      </div>
    </article>
  );
}
