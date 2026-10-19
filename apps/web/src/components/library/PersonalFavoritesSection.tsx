import { useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import type { FavoriteRecordingItem, MostPlayedItem, RecentlyPlayedItem } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { MuseumSectionHeader } from "@/components/library/museum/museumUi";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import {
  useFavoriteArtists,
  useFavoritePlaylists,
  useFavoriteRecordings,
  useMostPlayed,
  useRecentlyPlayed,
} from "@/hooks/useFavorites";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { personalTrackToQueueTrack } from "@/lib/queueTrack";
import { coverFallback, playlistPath, playlistRecordingPath, profilePath } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

type AnyTrack = FavoriteRecordingItem | MostPlayedItem | RecentlyPlayedItem;
type PersonalList = "favorites" | "most-played" | "recent";

const PERSONAL_LIST_LIMIT = 20;

const LIST_OPTIONS: { value: PersonalList; label: string }[] = [
  { value: "favorites", label: "Favorites" },
  { value: "most-played", label: "Most played" },
  { value: "recent", label: "Recent" },
];

const filterChipClass =
  "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90 data-[active=true]:border-[var(--color-brand)]/50 data-[active=true]:bg-[var(--color-brand)]/15 data-[active=true]:text-white";

// ── track row ─────────────────────────────────────────────────────────────────

function PersonalTrackRow({
  track,
  badge,
  badgeColor = "text-[var(--color-text-muted)]",
  allTracks,
}: {
  track: AnyTrack;
  badge?: string;
  badgeColor?: string;
  allTracks: AnyTrack[];
}) {
  const { playTrack, togglePlay, ensurePlayback } = useAudioPlayer();
  const { isActive, isPlaying } = useTrackPlayback(track.id);

  const songHref = playlistRecordingPath(
    { id: track.playlist.id, username: track.uploader.username, slug: track.playlist.slug },
    track,
  );
  const artistHref = profilePath(track.uploader.username);
  const playlistHref = playlistPath({
    id: track.playlist.id,
    username: track.uploader.username,
    slug: track.playlist.slug,
  });

  function handlePlay() {
    if (isActive) {
      if (isPlaying) {
        togglePlay();
      } else {
        ensurePlayback();
      }
    } else {
      const queue = allTracks.map(personalTrackToQueueTrack);
      playTrack(personalTrackToQueueTrack(track), queue, { sourceContext: "library" }, {
        segmentLabel: "Favorites",
      });
    }
  }

  return (
    <div
      className={[
        "group/card flex items-center gap-2 rounded-xl px-2.5 py-2 transition sm:px-3 sm:py-2.5",
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md sm:h-10 sm:w-10">
        {track.artworkUrl ? (
          <img src={track.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: coverFallback(track.title) }} aria-hidden />
        )}
        <button
          type="button"
          onClick={handlePlay}
          className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${isActive ? "opacity-100" : "opacity-0 group-hover/card:opacity-100"}`}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying
            ? <Pause size={16} className="text-white sm:size-3.5" fill="currentColor" />
            : <Play size={16} className="text-white sm:size-3.5" fill="currentColor" />}
        </button>
      </div>

      <div className="min-w-0 flex-1 py-0.5 sm:py-0">
        <Link
          to={songHref}
          className={[
            "block truncate text-sm font-semibold transition hover:underline",
            isActive ? "text-[var(--color-brand)]" : "text-white",
          ].join(" ")}
        >
          {track.title}
        </Link>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          <span className="mr-1.5 inline-flex shrink-0 items-end gap-1.5 opacity-80">
            <PlaybackBars active={isActive} playing={isPlaying} variant="row-compact" className="mb-[2px]" />
            <span className="tabular-nums leading-none">{formatDuration(track.durationSeconds)}</span>
          </span>
          <span className="mr-1.5 opacity-50" aria-hidden>·</span>
          <Link to={artistHref} className="hover:underline">
            {track.uploader.displayName}
          </Link>
          <span className="mx-1.5 text-white/20" aria-hidden>·</span>
          <Link to={playlistHref} className="hover:underline">
            {track.playlist.title}
          </Link>
        </p>
        {badge ? (
          <p className={`mt-1 truncate text-[11px] font-medium sm:hidden ${badgeColor}`}>{badge}</p>
        ) : null}
      </div>

      {badge ? (
        <span className={`hidden shrink-0 text-xs font-medium sm:inline ${badgeColor}`}>{badge}</span>
      ) : null}

      <FavoriteHeartButton target="recording" id={track.id} variant="inline" className="max-sm:!hidden !opacity-100" />
    </div>
  );
}

function TrackListBody({
  tracks,
  loading,
  empty,
  badgeFor,
  badgeColor,
}: {
  tracks: AnyTrack[];
  loading: boolean;
  empty: string;
  badgeFor: (track: AnyTrack) => string;
  badgeColor?: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }
  if (tracks.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="flex flex-col gap-0.5">
      {tracks.map((track) => (
        <PersonalTrackRow
          key={track.id}
          track={track}
          badge={badgeFor(track)}
          badgeColor={badgeColor}
          allTracks={tracks}
        />
      ))}
    </div>
  );
}

// ── signed-in body ────────────────────────────────────────────────────────────

function PersonalFavoritesBody() {
  const [activeList, setActiveList] = useState<PersonalList>("favorites");
  const favorites = useFavoriteRecordings();
  const mostPlayed = useMostPlayed(PERSONAL_LIST_LIMIT);
  const recentlyPlayed = useRecentlyPlayed(PERSONAL_LIST_LIMIT);
  const favoritePlaylists = useFavoritePlaylists();
  const favoriteArtists = useFavoriteArtists();

  const favPlaylistItems = favoritePlaylists.data?.data ?? [];
  const favArtistItems = favoriteArtists.data?.data ?? [];

  return (
    <>
      <div className="overflow-hidden rounded-xl bg-[var(--color-canvas)]/80">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] px-4 py-3" role="tablist" aria-label="Personal lists">
          {LIST_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={activeList === option.value}
              data-active={activeList === option.value}
              onClick={() => setActiveList(option.value)}
              className={filterChipClass}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="p-1.5 sm:p-2">
          {activeList === "favorites" ? (
            <TrackListBody
              tracks={favorites.data?.data ?? []}
              loading={favorites.isLoading}
              empty="No favorites yet — heart a song to save it here"
              badgeFor={(track) => `${formatPlayCount(track.playCount)} plays`}
            />
          ) : null}
          {activeList === "most-played" ? (
            <TrackListBody
              tracks={mostPlayed.data?.data ?? []}
              loading={mostPlayed.isLoading}
              empty="Play some songs to see your top tracks"
              badgeFor={(track) => `${formatPlayCount((track as MostPlayedItem).userPlayCount)} plays`}
              badgeColor="text-emerald-400"
            />
          ) : null}
          {activeList === "recent" ? (
            <TrackListBody
              tracks={recentlyPlayed.data?.data ?? []}
              loading={recentlyPlayed.isLoading}
              empty="Your listening history will appear here"
              badgeFor={(track) => `${formatPlayCount(track.playCount)} plays`}
            />
          ) : null}
        </div>
      </div>

      {favPlaylistItems.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-base font-bold tracking-tight text-white">Saved collections</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
            {favPlaylistItems.map((playlist) => (
              <SmartPlaylistCard
                key={playlist.id}
                id={playlist.id}
                title={playlist.title}
                creatorName={playlist.owner.displayName}
                coverArtUrl={playlist.coverArtUrl}
                ownerUsername={playlist.owner.username}
                slug={playlist.slug}
                className="w-full"
              />
            ))}
          </div>
        </div>
      ) : null}

      {favArtistItems.length > 0 ? (
        <div className="mt-6">
          <h3 className="mb-3 text-base font-bold tracking-tight text-white">Saved artists</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-5">
            {favArtistItems.map((artist) => (
              <ArtistCard
                key={artist.id}
                id={artist.id}
                username={artist.username}
                displayName={artist.displayName}
                subtitle={`@${artist.username}`}
                avatarUrl={artist.avatarUrl}
                className="w-full"
              />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

// ── section ───────────────────────────────────────────────────────────────────

/** The signed-in listener's favorites, most played, and recent tracks in list format. */
export function PersonalFavoritesSection() {
  const { status } = useAuth();

  return (
    <section id="personal" className="scroll-mt-4">
      <MuseumSectionHeader label="Your favorites" />
      {status === "authenticated" ? (
        <PersonalFavoritesBody />
      ) : (
        <div className="rounded-xl bg-[var(--color-canvas)]/80 px-4 py-6 text-center">
          <EmptyState
            title="Sign in to see your music"
            description="Favorites, play history, and saved collections live in your account."
          />
          <Link to="/login" className="text-sm text-white hover:underline">Sign in</Link>
        </div>
      )}
    </section>
  );
}
