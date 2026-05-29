import { useMemo } from "react";
import { Heart, Play, Pause } from "lucide-react";
import type { FavoriteRecordingItem, MostPlayedItem, RecentlyPlayedItem } from "@playlisted/client-sdk";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { ContentRow } from "@/components/discovery/ContentRow";
import { coverFallback } from "@/lib/routes";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { personalTrackToQueueTrack } from "@/lib/queueTrack";
import { recordingShareUrl } from "@/lib/shareContent";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";
import {
  useFavoriteRecordings,
  useFavoriteIds,
  useToggleFavorite,
  useMostPlayed,
  useRecentlyPlayed,
} from "@/hooks/useFavorites";
import { useTopPlaylists } from "@/hooks/useCharts";

// ── helpers ───────────────────────────────────────────────────────────────────

type AnyTrack = FavoriteRecordingItem | MostPlayedItem | RecentlyPlayedItem;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ── personal track row ────────────────────────────────────────────────────────

interface PersonalTrackRowProps {
  track: AnyTrack;
  badge?: string;
  badgeColor?: string;
  allTracks: AnyTrack[];
  isFavorited: boolean;
  onToggleFavorite: () => void;
}

function PersonalTrackRow({
  track,
  badge,
  badgeColor = "text-[var(--color-text-muted)]",
  allTracks,
  isFavorited,
  onToggleFavorite,
}: PersonalTrackRowProps) {
  const { playTrack, togglePlay } = useAudioPlayer();
  const { isActive, isPlaying } = useTrackPlayback(track.id);

  function handlePlay() {
    if (isActive) {
      togglePlay();
    } else {
      const queue = allTracks.map(personalTrackToQueueTrack);
      const idx = allTracks.findIndex((t) => t.id === track.id);
      playTrack(personalTrackToQueueTrack(track), queue.slice(idx), { sourceContext: "library" });
    }
  }

  return (
    <div
      className={[
        "group/card flex items-center gap-2 rounded-xl px-3 py-2.5 transition",
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
      ].join(" ")}
    >
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

      {/* title + artist */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handlePlay}
          className={[
            "block truncate text-left text-sm font-semibold transition hover:text-white",
            isActive ? "text-[var(--color-brand)]" : "text-white",
          ].join(" ")}
        >
          {track.title}
        </button>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {track.uploader.displayName}
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
          playlistId: track.publishedPlaylistId,
          recordingId: track.id,
          username: track.uploader.username,
        })}
      />

      {/* heart */}
      <button
        type="button"
        onClick={onToggleFavorite}
        className={[
          "shrink-0 rounded-full p-1.5 transition",
          isFavorited
            ? "text-rose-500 hover:text-rose-400"
            : "text-white/20 opacity-0 hover:text-white group-hover/card:opacity-100",
        ].join(" ")}
        aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart size={15} fill={isFavorited ? "currentColor" : "none"} />
      </button>
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

  const favorites = useFavoriteRecordings();
  const { ids: favIds } = useFavoriteIds();
  const { add, remove } = useToggleFavorite();
  const mostPlayed = useMostPlayed(20);
  const recentlyPlayed = useRecentlyPlayed(20);
  const topPlaylists = useTopPlaylists("30d", 12);

  // Shuffle top playlists for recommendations (stable per session)
  const recommended = useMemo(() => {
    const list = topPlaylists.data?.data ?? [];
    return [...list].sort(() => Math.random() - 0.5).slice(0, 10);
  }, [topPlaylists.data]);

  function toggleFavorite(recordingId: string) {
    if (favIds.has(recordingId)) {
      remove.mutate(recordingId);
    } else {
      add.mutate(recordingId);
    }
  }

  if (!isAuthed) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-4xl font-extrabold tracking-tight text-white">Your music</h1>
        <EmptyState
          title="Sign in to see your music"
          description="Favorites, play history, and recommendations are saved to your account."
        />
      </div>
    );
  }

  const favTracks = favorites.data?.data ?? [];
  const mostPlayedTracks = mostPlayed.data?.data ?? [];
  const recentTracks = recentlyPlayed.data?.data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-4xl font-extrabold tracking-tight text-white">Your music</h1>

      {/* ── Favorites ─────────────────────────────────────── */}
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
              badge={new Date(track.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              allTracks={favTracks}
              isFavorited={favIds.has(track.id)}
              onToggleFavorite={() => toggleFavorite(track.id)}
            />
          ))}
        </div>
      </Section>

      {/* ── Most Played ───────────────────────────────────── */}
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
              isFavorited={favIds.has(track.id)}
              onToggleFavorite={() => toggleFavorite(track.id)}
            />
          ))}
        </div>
      </Section>

      {/* ── Recently Played ───────────────────────────────── */}
      <Section
        title="Recently played"
        subtitle="Pick up where you left off"
        loading={recentlyPlayed.isLoading}
        empty={recentTracks.length === 0 ? "Your listening history will appear here" : undefined}
      >
        <div className="flex flex-col gap-0.5">
          {recentTracks.map((track) => (
            <PersonalTrackRow
              key={track.id}
              track={track}
              badge={relativeTime(track.lastPlayedAt)}
              allTracks={recentTracks}
              isFavorited={favIds.has(track.id)}
              onToggleFavorite={() => toggleFavorite(track.id)}
            />
          ))}
        </div>
      </Section>

      {/* ── Recommended ───────────────────────────────────── */}
      <ContentRow
        title="Recommended for you"
        subtitle="Playlists you might like"
      >
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
