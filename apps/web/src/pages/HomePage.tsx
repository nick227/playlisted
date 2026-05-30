import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Pause, Play } from "lucide-react";
import type { components, LibrarySong, TopSongItem } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { ChartSongCard } from "@/components/cards/ChartSongCard";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { HeroSpotlight } from "@/components/discovery/HeroSpotlight";
import { RowSkeleton } from "@/components/feedback/Skeleton";
import { Skeleton } from "@/components/feedback/Skeleton";
import { useHomepage } from "@/hooks/useHomepage";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { useLibrarySongs } from "@/hooks/useLibrary";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import {
  chartItemPlaybackContext,
  librarySongToQueueTrack,
  topSongToQueueTrack,
} from "@/lib/queueTrack";
import { coverFallback, playlistPath, profilePath, resolveItemPath } from "@/lib/routes";
import { formatPlayCount } from "@/lib/format";
import { recordingShareUrl } from "@/lib/shareContent";

type HomepageItem = components["schemas"]["HomepageItem"];

const CHART_RANGE_LABELS: Record<"7d" | "30d" | "all", string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all time",
};

// ── layout helpers ────────────────────────────────────────────────────────────

function usernameFromHomepageUser(item: HomepageItem): string {
  const match = item.href.match(/^\/@\/?([^/]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return item.subtitle?.replace(/^@/, "") ?? item.id;
}

function HomeSection({
  title,
  subtitle,
  viewAllHref,
  cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllHref?: string;
  cols?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          {viewAllHref ? (
            <Link to={viewAllHref} className="text-xl font-bold tracking-tight text-white hover:underline">
              {title}
            </Link>
          ) : (
            <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          )}
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="shrink-0 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-white"
          >
            Show all
          </Link>
        )}
      </div>
      <div className={`grid gap-4 ${cols}`}>{children}</div>
    </section>
  );
}

// ── inline song row (genre sections) ─────────────────────────────────────────

function HomeSongRow({
  song,
  onPlay,
}: {
  song: LibrarySong;
  onPlay: () => void;
}) {
  const { isActive, isPlaying } = useTrackPlayback(song.id);

  const songHref = `${playlistPath({ id: song.playlist.id, username: song.uploader.username, slug: song.playlist.slug })}#track-${song.id}`;
  const artistHref = profilePath(song.uploader.username);

  return (
    <div
      className={[
        "group/card flex w-full items-center gap-1 rounded-lg px-2 py-2 transition",
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.05]",
      ].join(" ")}
    >
      {/* Artwork — play button */}
      <button
        type="button"
        onClick={onPlay}
        aria-label={isActive ? (isPlaying ? "Pause" : "Resume") : "Play"}
        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md"
      >
        {song.artworkUrl ? (
          <img src={song.artworkUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(song.title) }}
            aria-hidden
          />
        )}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center bg-black/60 transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover/card:opacity-100",
          ].join(" ")}
        >
          {isPlaying ? (
            <Pause size={12} fill="currentColor" className="text-white" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-px text-white" />
          )}
        </div>
        {isActive && (
          <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-[var(--color-brand)]" />
        )}
      </button>

      {/* Track info — links */}
      <div className="min-w-0 flex-1 px-2">
        <Link
          to={songHref}
          className={[
            "block truncate text-sm font-semibold leading-snug hover:underline",
            isActive ? "text-[var(--color-brand)]" : "text-white",
          ].join(" ")}
        >
          {song.title}
        </Link>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          <Link to={artistHref} className="hover:underline">
            {song.uploader.displayName}
          </Link>
          {song.playCount > 0 ? (
            <>
              <span className="mx-1 text-white/20">·</span>
              {formatPlayCount(song.playCount)} plays
            </>
          ) : null}
        </p>
      </div>

      {/* Play/pause indicator */}
      <button
        type="button"
        onClick={onPlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="shrink-0 pr-1"
      >
        {isPlaying ? (
          <Pause size={15} fill="currentColor" className="text-[var(--color-brand)]" />
        ) : (
          <Play
            size={15}
            fill="currentColor"
            className="text-white/30 transition group-hover/card:text-white/80"
          />
        )}
      </button>

      <RecordingActionMenu
        className="shrink-0"
        recordingId={song.id}
        title={song.title}
        queueTrack={librarySongToQueueTrack(song)}
        shareUrl={recordingShareUrl({
          playlistId: song.playlist.id,
          recordingId: song.id,
          username: song.uploader.username,
          slug: song.playlist.slug,
        })}
      />

      <FavoriteHeartButton target="recording" id={song.id} variant="inline" />
    </div>
  );
}

// ── static content ────────────────────────────────────────────────────────────

function GuestBanner() {
  return (
    <section
      className="relative mb-10 overflow-hidden rounded-2xl px-8 py-12 md:px-14"
      style={{
        background:
          "linear-gradient(135deg, hsl(260 60% 14%) 0%, hsl(240 50% 10%) 60%, hsl(220 40% 8%) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: "hsl(265 80% 55%)" }}
        aria-hidden
      />
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]">
        Playlisted
      </p>
      <h1 className="max-w-lg text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
        The charts platform for independent music.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
        Hey what is up with you.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          to="/library"
          className="inline-flex items-center rounded-full bg-[var(--color-brand)] px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Start listening
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Join free
        </Link>
      </div>
    </section>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function stableShuffleByDay<T>(arr: T[]): T[] {
  const seed = Math.floor(Date.now() / 86_400_000);
  return [...arr]
    .map((item, i) => ({ item, sort: Math.sin(seed + i * 127) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function stableShuffleForUser<T>(arr: T[], userId: string): T[] {
  const day = Math.floor(Date.now() / 86_400_000);
  let seed = day;
  for (const ch of userId) seed = ((seed * 31) + ch.charCodeAt(0)) & 0xffffffff;
  return [...arr]
    .map((item, i) => ({ item, sort: Math.sin(seed + i * 127) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Editor Picks grid: up to 8 when available, otherwise 4 (if at least 4 exist). */
function editorPicksGridLimit(available: number): number {
  if (available >= 8) return 8;
  if (available >= 4) return 4;
  return available;
}

function mergeUniqueHomepageItems(...lists: HomepageItem[][]): HomepageItem[] {
  const seen = new Set<string>();
  const merged: HomepageItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

function completeRows<T>(items: T[], columns: number): T[] {
  return items.slice(0, items.length - (items.length % columns));
}

function SiteNewsCard({ item }: { item: HomepageItem }) {
  return (
    <Link
      to={item.href}
      className="group flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:bg-white/[0.04]"
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white transition group-hover:text-[var(--color-brand)]">
          {item.title}
        </p>
        {item.subtitle && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{item.subtitle}</p>
        )}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-muted)]">
            {item.description}
          </p>
        )}
      </div>
    </Link>
  );
}

function EditorialPickCard({ item }: { item: HomepageItem }) {
  return (
    <Link
      to={resolveItemPath(item)}
      className="group flex w-full flex-col gap-2 transition-opacity hover:opacity-90"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(item.title) }}
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{item.title}</p>
        {item.subtitle ? (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{item.subtitle}</p>
        ) : null}
      </div>
    </Link>
  );
}

function HomepageEditorialCard({ item }: { item: HomepageItem }) {
  if (item.targetType === "USER") {
    return (
      <ArtistCard
        id={item.id}
        username={usernameFromHomepageUser(item)}
        displayName={item.title}
        avatarUrl={item.imageUrl}
        subtitle={item.subtitle}
        className="w-full"
      />
    );
  }

  if (item.targetType === "EDITORIAL_POST") {
    return <EditorialPickCard item={item} />;
  }

  return (
    <SmartPlaylistCard
      id={item.id}
      title={item.title}
      creatorName={item.subtitle}
      coverArtUrl={item.imageUrl}
      className="w-full"
    />
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { status, user } = useAuth();
  const isGuest = status === "guest";

  usePageMeta({
    title: "Home",
    description: "Music charts and curated playlists for independent artists.",
  });

  const [chartsRange, setChartsRange] = useState<"7d" | "30d" | "all">("7d");

  const editorial = useHomepage();
  const topSongs = useTopSongs(chartsRange, 12);
  const topPlaylists = useTopPlaylists(chartsRange, 10);
  const topArtists = useTopArtists(chartsRange, 6);
  const discoverPool = useTopPlaylists("30d", 30);
  const allTimeFeatured = useTopPlaylists("all", 8);
  const pinnedArtists = useTopArtists("30d", 8);
  const songsQuery = useLibrarySongs();

  const { playTrack, currentTrack, togglePlay } = useAudioPlayer();

  // Parse editorial sections into a keyed map
  const sectionMap = useMemo(() => {
    const map: Record<string, HomepageItem[]> = {};
    for (const s of editorial.data?.sections ?? []) map[s.section] = s.items;
    return map;
  }, [editorial.data]);

  // Editor picks: homepage_features where section = EDITOR_PICK (API order = position)
  const editorPicks = sectionMap["EDITOR_PICK"] ?? [];

  // Hero spotlight: first editor pick, or first item from any section
  const heroItem = useMemo(() => {
    if (editorPicks.length > 0) return editorPicks[0];
    for (const s of editorial.data?.sections ?? []) {
      if (s.items.length > 0) return s.items[0];
    }
    return null;
  }, [editorPicks, editorial.data]);

  const siteNews = sectionMap["SITE_NEWS"] ?? [];
  const newReleases = sectionMap["NEW_RELEASE"] ?? [];
  const customMixes = sectionMap["CUSTOM_MIX"] ?? [];

  const editorPicksGrid = useMemo(() => {
    const heroId = heroItem?.id;
    const pool = mergeUniqueHomepageItems(
      editorPicks.filter((i) => i.id !== heroId),
      newReleases,
      customMixes,
    );
    return pool.slice(0, editorPicksGridLimit(pool.length));
  }, [editorPicks, heroItem, newReleases, customMixes]);

  const editorPickGridIds = useMemo(
    () => new Set(editorPicksGrid.map((i) => i.id)),
    [editorPicksGrid],
  );

  const newReleasesSection = useMemo(
    () => completeRows(newReleases.filter((i) => !editorPickGridIds.has(i.id)), 4),
    [newReleases, editorPickGridIds],
  );

  // Featured playlists
  const editorialFeaturedPlaylists = sectionMap["FEATURED_PLAYLIST"] ?? [];
  const fallbackFeaturedPlaylists = useMemo(
    () => stableShuffleByDay(allTimeFeatured.data?.data ?? []).slice(0, 8),
    [allTimeFeatured.data],
  );

  // Featured artists
  const editorialFeaturedArtists = sectionMap["NEW_ARTIST"] ?? [];

  // For You / Discover
  const discovered = useMemo(() => {
    const pool = discoverPool.data?.data ?? [];
    if (!isGuest && user) return stableShuffleForUser(pool, user.id).slice(0, 10);
    return stableShuffleByDay(pool).slice(0, 10);
  }, [discoverPool.data, isGuest, user]);

  // Genre groups from library songs
  const genreGroups = useMemo(() => {
    const allSongs = songsQuery.data?.data ?? [];
    const map = new Map<string, { name: string; slug: string; songs: LibrarySong[] }>();
    for (const song of allSongs) {
      for (const genre of song.genres) {
        if (!map.has(genre.slug)) {
          map.set(genre.slug, { name: genre.name, slug: genre.slug, songs: [] });
        }
        map.get(genre.slug)!.songs.push(song);
      }
    }
    return Array.from(map.values())
      .filter((g) => g.songs.length >= 3)
      .sort((a, b) => b.songs.length - a.songs.length)
      .slice(0, 4);
  }, [songsQuery.data]);

  const chartsLoading = topSongs.isLoading || topPlaylists.isLoading || topArtists.isLoading;

  const firstName = user?.displayName?.split(" ")[0];

  function handleSongPlay(song: LibrarySong, queue: LibrarySong[], context: string) {
    if (currentTrack?.id === song.id) {
      togglePlay();
      return;
    }
    const idx = queue.findIndex((s) => s.id === song.id);
    if (idx < 0) return;
    playTrack(
      librarySongToQueueTrack(song, context),
      queue.map((s) => librarySongToQueueTrack(s, context)),
      { sourceContext: "genre" },
      { segmentLabel: context },
    );
  }

  function handleChartSongPlay(item: TopSongItem, siblings: TopSongItem[], sectionName: string) {
    if (currentTrack?.id === item.recordingId) {
      togglePlay();
      return;
    }
    const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
    if (idx < 0) return;
    const tracks = siblings.map((s) => topSongToQueueTrack(s, sectionName));
    playTrack(topSongToQueueTrack(item, sectionName), tracks, chartItemPlaybackContext(item), {
      segmentLabel: sectionName,
    });
  }

  return (
    <div className="mx-auto max-w-[var(--size-container-max,90rem)]">

      {/* Greeting / banner */}
      {isGuest ? (
        <GuestBanner />
      ) : (
        <p className="mb-6 text-2xl font-bold md:text-3xl">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </p>
      )}

      {/* Hero */}
      {heroItem ? (
        <HeroSpotlight
          title={heroItem.title}
          summary={heroItem.description ?? heroItem.subtitle}
          imageUrl={heroItem.imageUrl}
          href={resolveItemPath(heroItem)}
        />
      ) : null}

      {/* ── CHARTS ───────────────────────────────────────────── */}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-white">Charts</h2>
        <div className="flex rounded-full border border-white/[0.12] bg-[var(--color-surface)] p-1">
          {(
            [
              ["7d", "This week"],
              ["30d", "This month"],
              ["all", "All time"],
            ] as const
          ).map(([range, label]) => (
            <button
              key={range}
              type="button"
              onClick={() => setChartsRange(range)}
              className={[
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                chartsRange === range
                  ? "bg-white text-black"
                  : "text-[var(--color-text-muted)] hover:text-white",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {chartsLoading ? (
        <>
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </>
      ) : (
        <>
          {(topSongs.data?.data.length ?? 0) > 0 && (
            <HomeSection
              title="Top Songs"
              subtitle={`Most-played — ${CHART_RANGE_LABELS[chartsRange]}`}
              cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            >
              {topSongs.data!.data.map((item) => (
                <ChartSongCard
                  key={item.recordingId}
                  item={item}
                  className="w-full"
                  actionSlot={
                    <RecordingActionMenu
                      recordingId={item.recordingId}
                      title={item.title}
                      queueTrack={topSongToQueueTrack(item)}
                      shareUrl={recordingShareUrl({
                        playlistId: item.playlist.id,
                        recordingId: item.recordingId,
                        username: item.playlist.owner.username,
                        slug: item.playlist.slug,
                      })}
                    />
                  }
                  onPlay={() =>
                    handleChartSongPlay(item, topSongs.data!.data, "Top Songs")
                  }
                />
              ))}
            </HomeSection>
          )}

          {(topPlaylists.data?.data.length ?? 0) > 0 && (
            <HomeSection
              title="Top Playlists"
              subtitle={`Most-played collections — ${CHART_RANGE_LABELS[chartsRange]}`}
              cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            >
              {topPlaylists.data!.data.map((item) => (
                <SmartPlaylistCard
                  key={item.playlistId}
                  id={item.playlistId}
                  title={item.title}
                  creatorName={item.owner.displayName}
                  coverArtUrl={item.coverArtUrl}
                  ownerUsername={item.owner.username}
                  slug={item.slug}
                  meta={`${item.playCount.toLocaleString()} plays`}
                  className="w-full"
                  actionSlot={
                    <PlaylistActionMenu
                      playlistId={item.playlistId}
                      title={item.title}
                      ownerUsername={item.owner.username}
                      slug={item.slug}
                    />
                  }
                />
              ))}
            </HomeSection>
          )}

          {(topArtists.data?.data.length ?? 0) > 0 && (
            <HomeSection
              title="Top Artists"
              subtitle={`Creators driving the most plays — ${CHART_RANGE_LABELS[chartsRange]}`}
              cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
            >
              {topArtists.data!.data.map((item) => (
                <ArtistCard
                  key={item.userId}
                  id={item.userId}
                  username={item.username}
                  displayName={item.displayName}
                  avatarUrl={item.avatarUrl}
                  subtitle={`${item.playCount.toLocaleString()} plays`}
                  className="w-full"
                />
              ))}
            </HomeSection>
          )}
        </>
      )}

      {/* ── FEATURED PLAYLISTS ───────────────────────────────── */}

      {(editorialFeaturedPlaylists.length > 0 || fallbackFeaturedPlaylists.length > 0) && (
        <HomeSection
          title="Featured Playlists"
          subtitle="Handpicked by the team"
          cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {editorialFeaturedPlaylists.length > 0
            ? editorialFeaturedPlaylists.map((item) => (
                <HomepageEditorialCard key={item.id} item={item} />
              ))
            : fallbackFeaturedPlaylists.map((item) => (
                <SmartPlaylistCard
                  key={item.playlistId}
                  id={item.playlistId}
                  title={item.title}
                  creatorName={item.owner.displayName}
                  coverArtUrl={item.coverArtUrl}
                  ownerUsername={item.owner.username}
                  slug={item.slug}
                  className="w-full"
                />
              ))}
        </HomeSection>
      )}

      {/* ── FEATURED ARTISTS ────────────────────────────────── */}

      {(editorialFeaturedArtists.length > 0 || (pinnedArtists.data?.data.length ?? 0) > 0) && (
        <HomeSection
          title="Featured Artists"
          subtitle="Artists to know right now"
          cols="grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
        >
          {editorialFeaturedArtists.length > 0
            ? editorialFeaturedArtists.map((item) => (
                <ArtistCard
                  key={item.id}
                  id={item.id}
                  username={usernameFromHomepageUser(item)}
                  displayName={item.title}
                  avatarUrl={item.imageUrl}
                  subtitle={item.subtitle}
                  className="w-full"
                />
              ))
            : (pinnedArtists.data?.data ?? []).map((item) => (
                <ArtistCard
                  key={item.userId}
                  id={item.userId}
                  username={item.username}
                  displayName={item.displayName}
                  avatarUrl={item.avatarUrl}
                  subtitle={`${item.playCount.toLocaleString()} plays`}
                  className="w-full"
                />
              ))}
        </HomeSection>
      )}

      {/* ── SITE NEWS ────────────────────────────────────────────── */}

      {siteNews.length > 0 && (
        <HomeSection
          title="Site News"
          subtitle="Updates from the team"
          cols="grid-cols-1 sm:grid-cols-2"
        >
          {siteNews.map((item) => (
            <SiteNewsCard key={item.id} item={item} />
          ))}
        </HomeSection>
      )}

      {/* ── EDITOR PICKS (homepage_features.section = EDITOR_PICK) ── */}

      {editorPicksGrid.length > 0 && (
        <HomeSection
          title="Editor Picks"
          cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        >
          {editorPicksGrid.map((item) => (
            <HomepageEditorialCard key={item.id} item={item} />
          ))}
        </HomeSection>
      )}

      {newReleasesSection.length > 0 && (
        <HomeSection title="New Releases" cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {newReleasesSection.map((item) => (
            <HomepageEditorialCard key={item.id} item={item} />
          ))}
        </HomeSection>
      )}

      {/* ── FOR YOU / DISCOVER ───────────────────────────────── */}

      {discovered.length > 0 && (
        <HomeSection
          title={!isGuest ? "Picked for you" : "Discover Something New"}
          subtitle={!isGuest ? "Updated daily based on your taste" : "Fresh picks — updated daily"}
          cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {discovered.map((item) => (
            <SmartPlaylistCard
              key={item.playlistId}
              id={item.playlistId}
              title={item.title}
              creatorName={item.owner.displayName}
              coverArtUrl={item.coverArtUrl}
              ownerUsername={item.owner.username}
              slug={item.slug}
              className="w-full"
            />
          ))}
        </HomeSection>
      )}

      {/* ── MUSIC BY GENRE ───────────────────────────────────── */}

      {genreGroups.map(({ name, slug, songs }) => {
        const limited = songs.slice(0, 2);
        return (
          <HomeSection
            key={slug}
            title={name}
            subtitle={`${songs.length} song${songs.length !== 1 ? "s" : ""}`}
            viewAllHref={`/library?genre=${encodeURIComponent(slug)}`}
            cols="w-full"
          >
            {limited.map((song) => (
              <HomeSongRow
                key={song.id}
                song={song}
                onPlay={() => handleSongPlay(song, limited, name)}
              />
            ))}
          </HomeSection>
        );
      })}
      
    </div>
  );
}
