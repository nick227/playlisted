import type { UserDetail } from "@playlisted/client-sdk";
import { Pause, Pencil, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { TrackList } from "@/components/tracks/TrackList";
import { WaveformTrackRowSkeleton } from "@/components/tracks/WaveformTrackRow";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
import { useAuthAction } from "@/hooks/useAuthAction";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { formatDurationLong } from "@/lib/format";
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

  const coverStyle = playlist.coverArtUrl
    ? { backgroundImage: `url(${playlist.coverArtUrl})` }
    : { background: coverFallback(playlist.title) };
  const releaseDate = playlist.publishedAt ?? playlist.createdAt;
  const metadata = [
    releaseDate ? String(new Date(releaseDate).getFullYear()) : "",
    `${playlist.itemCount} ${playlist.itemCount === 1 ? "song" : "songs"}`,
    playlist.totalDurationSeconds > 0 ? formatDurationLong(playlist.totalDurationSeconds) : "",
  ].filter(Boolean);

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
    <article className="grid min-w-0 gap-5 py-6 md:grid-cols-[100px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[120px_minmax(0,1fr)]">
      <Link to={href} className="block w-44 self-start md:w-full" aria-label={playlist.title}>
        <div
          className="aspect-square w-full rounded-md bg-cover bg-center"
          style={coverStyle}
          aria-hidden="true"
        />
      </Link>

      <div className="min-w-0">
        <header className="mb-5">
          {metadata.length > 0 ? (
            <p className="text-[11px] tracking-wide text-[var(--color-text-muted)] md:text-xs">{metadata.join(" · ")}</p>
          ) : null}

          <h3 className="mt-1 text-[22px] font-bold leading-tight tracking-tight text-[var(--color-text)] md:text-2xl">
            <Link
              to={href}
              className={[
                "break-words transition hover:text-[var(--color-brand)]",
                isActive ? "text-[var(--color-brand)]" : "",
              ].join(" ")}
            >
              {playlist.title}
            </Link>
          </h3>

          {description ? (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-snug text-[var(--color-text-muted)]">
              {description}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={playAll}
              disabled={!isLoading && recordings.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-white/90 disabled:opacity-40"
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {isPlaying ? "Pause" : "Play album"}
            </button>
            {status === "authenticated" && !isOwner ? (
              <button
                type="button"
                onClick={handleFollow}
                disabled={addCollection.isPending || isFollowing}
                className="inline-flex h-9 items-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-white/50 disabled:opacity-50"
              >
                {isFollowing ? "Following" : addCollection.isPending ? "Following…" : "+ Follow"}
              </button>
            ) : null}
            {isOwner ? (
              <Link
                to={editHref ?? studioCollectionEditPath(playlist.id)}
                className="inline-flex h-9 items-center gap-1.5 px-2 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
              >
                <Pencil size={14} aria-hidden="true" />
                Edit
              </Link>
            ) : null}
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {Array.from({ length: playlist.itemCount }).map((_, index) => (
              <WaveformTrackRowSkeleton key={index} />
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
            numbered
          />
        )}
      </div>
    </article>
  );
}
