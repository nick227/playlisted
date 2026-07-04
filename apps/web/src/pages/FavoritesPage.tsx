import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Play, Pause } from "lucide-react";
import type { FavoriteRecordingItem, MostPlayedItem, RecentlyPlayedItem } from "@playlisted/client-sdk";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { ArtistCard } from "@/components/cards/ArtistCard";
import { ChartsFilterBar } from "@/components/charts/ChartsFilterBar";
import { ChartsList } from "@/components/charts/ChartsList";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { LibraryBrowseLayout } from "@/components/library/LibraryBrowseLayout";
import { PanelHeader } from "@/components/library/libraryPanels";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { coverFallback, playlistPath, playlistRecordingPath, profilePath } from "@/lib/routes";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { personalTrackToQueueTrack } from "@/lib/queueTrack";
import { recordingShareUrl } from "@/lib/shareContent";
import { favoritesBrowseCrumbs } from "@/lib/browsePaths";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useLibraryGenres } from "@/hooks/useLibrary";
import {
  useFavoriteRecordings,
  useFavoriteArtists,
  useFavoritePlaylists,
  useMostPlayed,
  useRecentlyPlayed,
} from "@/hooks/useFavorites";
import {
  chartsPageSearchParams,
  parseChartsPageState,
  type ChartsPageState,
} from "@/lib/chartsPageState";

// ── helpers ───────────────────────────────────────────────────────────────────

type AnyTrack = FavoriteRecordingItem | MostPlayedItem | RecentlyPlayedItem;
const FAVORITES_CHART_ITEM_LIMIT = 10;
type FavoritesView = "charts" | "personal";

function parseFavoritesView(params: URLSearchParams): FavoritesView {
  return params.get("view") === "personal" ? "personal" : "charts";
}

function FavoritesViewToggle({
  activeView,
  onChange,
}: {
  activeView: FavoritesView;
  onChange: (view: FavoritesView) => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-white/[0.025] p-2">
      {(["charts", "personal"] as const).map((view) => {
        const isActive = activeView === view;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(view)}
            className={[
              "min-h-24 rounded-lg border px-4 py-4 text-left transition sm:min-h-28 sm:px-6",
              isActive
                ? "border-[var(--color-brand)]/60 bg-[var(--color-brand)]/15 text-white"
                : "border-transparent text-[var(--color-text-muted)] hover:border-white/10 hover:bg-white/[0.04] hover:text-white",
            ].join(" ")}
          >
            <span className="block text-3xl font-black uppercase leading-none tracking-normal sm:text-5xl">
              {view === "charts" ? "Charts" : "Personal"}
            </span>
            <span className="mt-2 block text-xs font-medium uppercase tracking-normal opacity-75 sm:text-sm">
              {view === "charts" ? "Top ten lists" : "Your favorites"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.04] bg-[--cover-canvas]/90",
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
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <section className={["mb-8 last:mb-0", className].join(" ")}>
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
  const [params, setSearchParams] = useSearchParams();
  const chartState = useMemo(() => parseChartsPageState(params), [params]);
  const activeView = useMemo(() => parseFavoritesView(params), [params]);
  const { data: genreData } = useLibraryGenres();
  const genres = genreData?.data ?? [];
  const { status } = useAuth();
  const isAuthed = status === "authenticated";

  usePageMeta({ title: "Favorites", description: "Top charts and your liked tracks, playlists, and artists." });

  const favorites = useFavoriteRecordings();
  const favoritePlaylists = useFavoritePlaylists();
  const favoriteArtists = useFavoriteArtists();
  const mostPlayed = useMostPlayed(20);
  const recentlyPlayed = useRecentlyPlayed(20);

  const updateChartState = useCallback(
    (patch: Partial<ChartsPageState>) => {
      const next = { ...chartState, ...patch };
      if (next.tab !== "songs") next.genre = null;
      const nextParams = chartsPageSearchParams(next);
      if (activeView === "personal") nextParams.set("view", "personal");
      setSearchParams(nextParams, { replace: true });
    },
    [activeView, chartState, setSearchParams],
  );

  const updateActiveView = useCallback(
    (view: FavoritesView) => {
      const nextParams = new URLSearchParams(params);
      if (view === "personal") nextParams.set("view", "personal");
      else nextParams.delete("view");
      setSearchParams(nextParams, { replace: true });
    },
    [params, setSearchParams],
  );

  const chartsSection = (
    <Section title="Charts" subtitle="The top ten across Playlisted" className="mt-8">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
        <ChartsFilterBar
          tab={chartState.tab}
          range={chartState.range}
          genre={chartState.genre}
          genres={genres}
          onTabChange={(tab) => updateChartState({ tab })}
          onRangeChange={(range) => updateChartState({ range })}
          onGenreChange={(genre) => updateChartState({ genre })}
        />
        <ChartsList
          tab={chartState.tab}
          range={chartState.range}
          genre={chartState.genre}
          limit={FAVORITES_CHART_ITEM_LIMIT}
        />
      </div>
    </Section>
  );

  if (!isAuthed) {
    return (
      <LibraryBrowseLayout crumbs={favoritesBrowseCrumbs()}>
        <PanelHeader label="Favorites" />
        <FavoritesViewToggle activeView={activeView} onChange={updateActiveView} />
        {activeView === "charts" ? (
          chartsSection
        ) : (
          <div className="flex min-h-[35vh] items-center justify-center">
            <div className="text-center">
              <EmptyState
                title="Sign in to see your music"
                description="Favorites, play history, and recommendations are saved to your account."
              />
              <Link to="/login" className="text-sm text-white hover:underline">Sign in</Link>
            </div>
          </div>
        )}
      </LibraryBrowseLayout>
    );
  }

  const favTracks = favorites.data?.data ?? [];
  const favPlaylistItems = favoritePlaylists.data?.data ?? [];
  const favArtistItems = favoriteArtists.data?.data ?? [];
  const mostPlayedTracks = mostPlayed.data?.data ?? [];
  const recentTracks = recentlyPlayed.data?.data ?? [];

  return (
    <LibraryBrowseLayout crumbs={favoritesBrowseCrumbs()}>
      <PanelHeader label="Favorites" />
      <FavoritesViewToggle activeView={activeView} onChange={updateActiveView} />
      {activeView === "charts" ? chartsSection : (
        <>
          <Section
            title="Collections"
            className="mt-8"
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
            </Section>
          )}

          <Section
            title="Favorites"
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
        </>
      )}
    </LibraryBrowseLayout>
  );
}
