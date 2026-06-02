import { Pause, Play } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useUser } from "@/hooks/useUser";
import { coverFallback, playlistPath, profilePath } from "@/lib/routes";
import { homeSpotlightTrackOrigin } from "@/lib/playbackOrigin";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import type { components, PlaylistDetail } from "@playlisted/client-sdk";

type HomepageItem = components["schemas"]["HomepageItem"];
type RecordingInPlaylist = components["schemas"]["RecordingInPlaylist"];

function toQueueTrack(r: RecordingInPlaylist, pl: PlaylistDetail): QueueTrack {
  return {
    ...r,
    playlistTitle: pl.title,
    ownerName: pl.owner.displayName,
    ownerUsername: pl.owner.username,
    playlistSlug: pl.slug,
  };
}

// Active only when this row started playback (same recording can appear elsewhere on the homepage).
function CompactSongRow({
  recording,
  playlist,
  playbackOrigin,
  onPlay,
}: {
  recording: RecordingInPlaylist;
  playlist: PlaylistDetail;
  playbackOrigin: string;
  onPlay: () => void;
}) {
  const { isActive, isPlaying } = useTrackPlayback(recording.id, playbackOrigin);

  const songHref = `${playlistPath({
    id: playlist.id,
    href: playlist.href,
    username: playlist.owner.username,
    slug: playlist.slug,
  })}#track-${recording.id}`;

  return (
    <div
      className={[
        "group/row flex w-full items-center gap-2 rounded-md px-2 py-1.5 transition",
        isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <PlaybackBars active={isActive} playing={isPlaying} />

      <button
        type="button"
        onClick={onPlay}
        aria-label={isPlaying ? `Pause ${recording.title}` : `Play ${recording.title}`}
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded"
      >
        {recording.artworkUrl ? (
          <img src={recording.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(recording.title) }} aria-hidden />
        )}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
          ].join(" ")}
        >
          {isPlaying ? (
            <Pause size={10} fill="currentColor" className="text-white" />
          ) : (
            <Play size={10} fill="currentColor" className="ml-px text-white" />
          )}
        </div>
        {isActive && (
          <div className="pointer-events-none absolute inset-0 rounded ring-1 ring-inset ring-[var(--color-brand)]" />
        )}
      </button>

      <Link
        to={songHref}
        className={[
          "min-w-0 flex-1 truncate text-sm leading-none hover:underline",
          isActive ? "font-medium text-[var(--color-brand)]" : "text-white/90",
        ].join(" ")}
      >
        {recording.title}
      </Link>
    </div>
  );
}

function PlaylistSpotlight({ item }: { item: HomepageItem }) {
  const { data: playlist } = usePlaylist(item.id);
  const { setQueue, currentTrack, togglePlay, playbackContext, activeOriginKey, isPlaying: playerIsPlaying } =
    useAudioPlayer();

  const queueTracks = useMemo(
    () => (playlist ? playlist.recordings.map((r) => toQueueTrack(r, playlist)) : []),
    [playlist],
  );

  const context = useMemo(
    () =>
      playlist
        ? {
            playlistId: playlist.id,
            playlistOwnerUsername: playlist.owner.username,
            playlistSlug: playlist.slug,
            sourceContext: "spotlight",
          }
        : undefined,
    [playlist],
  );

  if (!playlist || !context) return null;

  const pl = playlist;
  const recordings = pl.recordings.slice(0, 8);
  const hasRecordings = recordings.length > 0;

  const playlistHasCurrent = playbackContext.playlistId === pl.id;
  const isPlaying = playlistHasCurrent && playerIsPlaying;

  function handlePlayAll() {
    if (playlistHasCurrent) { togglePlay(); return; }
    const first = recordings[0];
    if (queueTracks.length > 0 && first) {
      setQueue(queueTracks, 0, context, {
        segmentLabel: pl.title,
        playbackOrigin: homeSpotlightTrackOrigin(pl.id, first.id),
        originScope: "track",
      });
    }
  }

  function handleTrackPlay(recording: RecordingInPlaylist, idx: number) {
    const origin = homeSpotlightTrackOrigin(pl.id, recording.id);
    if (currentTrack?.id === recording.id && activeOriginKey === origin) {
      togglePlay();
      return;
    }
    setQueue(queueTracks, idx, context, {
      segmentLabel: pl.title,
      playbackOrigin: origin,
      originScope: "track",
    });
  }

  const href = playlistPath({ id: pl.id, href: pl.href, username: pl.owner.username, slug: pl.slug });
  const description = item.description ?? pl.description;

  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid md:grid-cols-2">

        {/* Left — cover image, capped so it doesn't over-stretch on tall right columns */}
        <div className="h-52 w-full overflow-hidden md:h-auto md:max-h-[480px]">
          {pl.coverArtUrl ? (
            <img src={pl.coverArtUrl} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(pl.title) }} />
          )}
        </div>

        {/* Right — meta then rows */}
        <div className="flex min-w-0 flex-col">
          <div className="space-y-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Featured Playlist
            </p>
            <Link
              to={href}
              className="block text-3xl font-bold leading-tight tracking-tight text-white hover:underline md:text-4xl"
            >
              {pl.title}
            </Link>
            <p className="text-sm text-[var(--color-text-muted)]">
              by{" "}
              <Link to={profilePath(pl.owner.username)} className="hover:underline hover:text-white">
                {pl.owner.displayName}
              </Link>
            </p>
            {description && (
              <p className="pt-1 text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
                {description}
              </p>
            )}
            {hasRecordings && (
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handlePlayAll}
                  aria-label={isPlaying ? `Pause ${pl.title}` : `Play all of ${pl.title}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-black transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isPlaying ? (
                    <><Pause size={13} fill="currentColor" />Pause</>
                  ) : (
                    <><Play size={13} fill="currentColor" />Play all</>
                  )}
                </button>
                <Link
                  to={href}
                  className="text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
                >
                  Show all
                </Link>
              </div>
            )}
          </div>

          {hasRecordings && (
            <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-2">
              {recordings.map((r, idx) => (
                <CompactSongRow
                  key={r.id}
                  recording={r}
                  playlist={pl}
                  playbackOrigin={homeSpotlightTrackOrigin(pl.id, r.id)}
                  onPlay={() => handleTrackPlay(r, idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ArtistSpotlight({ item }: { item: HomepageItem }) {
  const { data: user } = useUser(item.id);

  if (!user) return null;

  const playlists = user.publicPlaylists
    .filter((p) => p.status === "PUBLISHED")
    .slice(0, 6);

  const href = profilePath(user.username);
  const description = item.description ?? user.bio;
  const imageUrl = item.imageUrl ?? user.heroImageUrl ?? user.avatarUrl;

  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid md:grid-cols-[260px_1fr]">

        {/* Left — artist image, capped so it doesn't over-stretch */}
        <div className="h-52 overflow-hidden md:h-auto md:max-h-[480px]">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover object-top" />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(user.displayName) }} />
          )}
        </div>

        {/* Right — meta then playlists */}
        <div className="flex min-w-0 flex-col">
          <div className="space-y-2 p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
              Featured Artist
            </p>
            <Link
              to={href}
              className="block text-3xl font-bold leading-tight tracking-tight text-white hover:underline md:text-4xl"
            >
              {user.displayName}
            </Link>
            <p className="text-sm text-[var(--color-text-muted)]">@{user.username}</p>
            {description && (
              <p className="pt-1 text-sm leading-relaxed text-[var(--color-text-muted)] line-clamp-2">
                {description}
              </p>
            )}
            <div className="pt-2">
              <Link
                to={href}
                className="inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                View artist
              </Link>
            </div>
          </div>

          {playlists.length > 0 && (
            <div className="border-t border-[var(--color-border)] p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {playlists.map((pl) => (
                  <SmartPlaylistCard
                    key={pl.id}
                    id={pl.id}
                    title={pl.title}
                    creatorName={user.displayName}
                    coverArtUrl={pl.coverArtUrl}
                    ownerUsername={user.username}
                    slug={pl.slug}
                    className="w-full"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function SpotlightBanner({ item }: { item: HomepageItem }) {
  if (item.targetType === "USER") return <ArtistSpotlight item={item} />;
  return <PlaylistSpotlight item={item} />;
}
