import type { UserDetail } from "@playlisted/client-sdk";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { Skeleton } from "@/components/feedback/Skeleton";
import { TrackList } from "@/components/tracks/TrackList";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { useAuthAction } from "@/hooks/useAuthAction";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { artistProfileTrackOrigin } from "@/lib/playbackOrigin";
import { coverFallback, playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

type PlaylistSummary = UserDetail["publicPlaylists"][number];

type ArtistProfileCollectionPanelProps = {
  playlist: PlaylistSummary;
  owner: UserDetail;
  editHref?: string;
};

export function ArtistProfileCollectionPanel({ playlist, owner, editHref }: ArtistProfileCollectionPanelProps) {
  const pendingPlayRef = useRef(false);
  const { user, status } = useAuth();
  const requireAuth = useAuthAction();
  const savedCollections = useCollectionPlaylists(100);
  const addCollection = useAddCollectionPlaylist();
  const { data: detail, isLoading } = usePlaylistByUsernameSlug(owner.username, playlist.slug);
  const { setQueue, currentTrack, togglePlay, ensurePlayback, playbackContext, state } = useAudioPlayer();

  const recordings = (detail?.recordings ?? []) as CollectionRecording[];
  const playlistContainsCurrentTrack = Boolean(
    currentTrack?.id && recordings.some((recording) => recording.id === currentTrack.id),
  );
  const isActive = playbackContext.playlistId === playlist.id || playlistContainsCurrentTrack;
  const isPlaying = isActive && state === "playing";
  const isOwner = user?.id === owner.id;
  const isFollowing =
    isOwner || (savedCollections.data?.data.some((item) => item.id === playlist.id) ?? false);

  const queueTracks: QueueTrack[] = recordings.map((recording) => ({
    ...recording,
    playlistTitle: playlist.title,
    ownerName: owner.displayName,
    artistImageUrl: owner.avatarUrl,
  }));
  const description = playlist.description?.trim() || detail?.description?.trim() || "";

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
    <article
      className={[
        "min-w-0 overflow-x-clip pb-20",
        isActive ? "bg-[var(--color-canvas)]" : "",
      ].join(" ")}
    >
      <div className="playlist-hero-card relative min-h-[320px] overflow-hidden border border-white/8 md:min-h-[380px]">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-700"
          style={bannerBackgroundStyle}
          aria-hidden="true"
        />
        <div
          className={[
            "collection-banner-shade absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/55",
            isPlaying ? "is-playing" : "",
          ].join(" ")}
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

        <div className="relative z-10 flex min-h-[320px] flex-col p-5 md:min-h-[380px] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 max-w-[min(100%,28rem)] pr-2">
              <h3 className="text-3xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] md:text-4xl">
                <Link
                  to={href}
                  className="break-words transition hover:text-[var(--color-brand)]"
                >
                  {playlist.title}
                </Link>
              </h3>
              {description ? (
                <p className="mt-2 line-clamp-2 text-base leading-snug text-white/75 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)] md:text-lg">
                  {description}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {isOwner ? (
                <Link
                  to={editHref ?? studioCollectionEditPath(playlist.id)}
                  className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]"
                >
                  Edit
                </Link>
              ) : null}
              {status === "authenticated" && !isOwner ? (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={addCollection.isPending || isFollowing}
                  className="rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:border-white/50 disabled:opacity-50"
                >
                  {isFollowing ? "Following" : addCollection.isPending ? "Following…" : "Follow"}
                </button>
              ) : null}
              <FavoriteHeartButton
                target="playlist"
                id={playlist.id}
                variant="inline"
                inlineAlwaysVisible
                className="!rounded-full !bg-black/45 !p-2 !text-white backdrop-blur-sm hover:!bg-black/60"
              />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <button
              type="button"
              onClick={playAll}
              aria-label={isPlaying ? `Pause ${playlist.title}` : `Play ${playlist.title}`}
              className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-black/80 text-white shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-md transition hover:scale-105 hover:border-white/50 md:h-20 md:w-20"
            >
              {isPlaying ? (
                <Pause size={26} fill="currentColor" />
              ) : (
                <Play size={26} className="ml-0.5" fill="currentColor" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-1 pt-4">
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
            activeWhenTrackMatches={playlistContainsCurrentTrack}
          />
        )}
      </div>
    </article>
  );
}
