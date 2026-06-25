import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Play, Pause } from "lucide-react";
import type { FavoriteRecordingItem, MostPlayedItem, RecentlyPlayedItem } from "@playlisted/client-sdk";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { ContentRow } from "@/components/discovery/ContentRow";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { coverFallback, playlistPath, playlistRecordingPath, profilePath } from "@/lib/routes";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { personalTrackToQueueTrack } from "@/lib/queueTrack";
import { recordingShareUrl } from "@/lib/shareContent";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  useFavoriteRecordings,
  useFavoriteArtists,
  useFavoritePlaylists,
  useMostPlayed,
  useRecentlyPlayed,
} from "@/hooks/useFavorites";
import { useTopPlaylists } from "@/hooks/useCharts";

// ── helpers ───────────────────────────────────────────────────────────────────

type AnyTrack = FavoriteRecordingItem | MostPlayedItem | RecentlyPlayedItem;

// ── personal track row ────────────────────────────────────────────────────────

interface PersonalTrackRowProps {
  track: AnyTrack;
  badge?: string;
  badgeColor?: string;
  allTracks: AnyTrack[];
}

function PersonalTrackRow({
  track,
  badge,
  badgeColor = "text-[var(--color-text-muted)]",
  allTracks,
}: PersonalTrackRowProps) {
  const { playTrack, togglePlay } = useAudioPlayer();
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
      togglePlay();
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
        "group/card flex items-center gap-2 rounded-xl px-3 py-2.5 transition",
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
      ].join(" ")}
    >
      <PlaybackBars active={isActive} playing={isPlaying} />
      {/* artwork + play */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
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
            ? <Pause size={14} className="text-white" fill="currentColor" />
            : <Play size={14} className="text-white" fill="currentColor" />}
        </button>
      </div>

      {/* title + artist + playlist */}
      <div className="min-w-0 flex-1">
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
          <Link to={artistHref} className="hover:underline">
            {track.uploader.displayName}
          </Link>
          <span className="mx-1 text-white/20" aria-hidden>·</span>
          <Link to={playlistHref} className="hover:underline">
            {track.playlist.title}
          </Link>
        </p>
      </div>

      {/* badge (play count / time ago) */}
      {badge && (
        <span className={`shrink-0 text-xs font-medium ${badgeColor}`}>{badge}</span>
      )}

      {/* duration */}
      <span className="w-10 shrink-0 text-right text-xs text-[var(--color-text-muted)]">
        {formatDuration(track.durationSeconds)}
      </span>

      <RecordingActionMenu
        className="shrink-0"
        recordingId={track.id}
        title={track.title}
        queueTrack={personalTrackToQueueTrack(track)}
        shareUrl={recordingShareUrl({
          playlistId: track.playlist.id,
          recordingId: track.id,
          title: track.title,
          username: track.uploader.username,
          slug: track.playlist.slug,
        })}
      />

      <FavoriteHeartButton target="recording" id={track.id} variant="inline" className="!opacity-100" />
    </div>
  );
}

// ── section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
  empty,
  loading,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: string;
  loading?: boolean;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {loading ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
        </div>
      ) : empty ? (
        <EmptyState title={empty} />
      ) : (
        children
      )}
    </section>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function FavoritesPage() {
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  usePageMeta({ title: "Favorites", description: "Your liked tracks, playlists, and artists." });

  const favorites = useFavoriteRecordings();
  const favoritePlaylists = useFavoritePlaylists();
  const favoriteArtists = useFavoriteArtists();
  const mostPlayed = useMostPlayed(20);
  const recentlyPlayed = useRecentlyPlayed(20);
  const topPlaylists = useTopPlaylists("30d", 12);

  const recommended = useMemo(() => {
    const list = topPlaylists.data?.data ?? [];
    return [...list].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [topPlaylists.data]);

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-4xl h-screen flex items-center justify-center">
        <div className="text-center">
        <EmptyState
          title="Sign in to see your music"
          description="Favorites, play history, and recommendations are saved to your account."
        />
        <Link to="/login" className="text-sm text-white hover:underline">Sign in</Link>
        </div>
      </div>
    );
  }

  const favTracks = favorites.data?.data ?? [];
  const favPlaylistItems = favoritePlaylists.data?.data ?? [];
  const favArtistItems = favoriteArtists.data?.data ?? [];
  const mostPlayedTracks = mostPlayed.data?.data ?? [];
  const recentTracks = recentlyPlayed.data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl">

      <Section
        title="Favorite playlists"
        subtitle="Collections you've saved"
        loading={favoritePlaylists.isLoading}
        empty={
          favPlaylistItems.length === 0
            ? "No favorite playlists yet — heart a collection to save it here"
            : undefined
        }
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
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
      </Section>

{favArtistItems.length > 0 && (
      <Section
        title="Favorite artists"
        subtitle="Artists you've hearted"
        loading={favoriteArtists.isLoading}
        empty={
          favArtistItems.length === 0
            ? "No favorite artists yet — heart an artist to save them here"
            : undefined
        }
      >
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
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
      </Section>)}

      <Section
        title="Favorites"
        subtitle="Songs you've hearted"
        loading={favorites.isLoading}
        empty={favTracks.length === 0 ? "No favorites yet — heart a song to save it here" : undefined}
      >
        <div className="flex flex-col gap-0.5">
          {favTracks.map((track) => (
            <PersonalTrackRow
              key={track.id}
              track={track}
              badge={`${formatPlayCount(track.playCount)} plays`}
              allTracks={favTracks}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Most played"
        subtitle="Your personal top songs"
        loading={mostPlayed.isLoading}
        empty={mostPlayedTracks.length === 0 ? "Play some songs to see your top tracks" : undefined}
      >
        <div className="flex flex-col gap-0.5">
          {mostPlayedTracks.map((track) => (
            <PersonalTrackRow
              key={track.id}
              track={track}
              badge={`${formatPlayCount(track.userPlayCount)} plays`}
              badgeColor="text-emerald-400"
              allTracks={mostPlayedTracks}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Recently played"
        subtitle="Yo."
        loading={recentlyPlayed.isLoading}
        empty={recentTracks.length === 0 ? "Your listening history will appear here" : undefined}
      >
        <div className="flex flex-col gap-0.5">
          {recentTracks.map((track) => (
            <PersonalTrackRow
              key={track.id}
              track={track}
              badge={`${formatPlayCount(track.playCount)} plays`}
              allTracks={recentTracks}
            />
          ))}
        </div>
      </Section>

      <ContentRow title="Recommended for you" subtitle="Playlists you might like">
        {topPlaylists.isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex w-40 shrink-0 flex-col gap-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))
          : recommended.map((item) => (
              <SmartPlaylistCard
                key={item.playlistId}
                id={item.playlistId}
                title={item.title}
                creatorName={item.owner.displayName}
                coverArtUrl={item.coverArtUrl}
                ownerUsername={item.owner.username}
                slug={item.slug}
                className="w-40 shrink-0"
              />
            ))}
      </ContentRow>
    </div>
  );
}
