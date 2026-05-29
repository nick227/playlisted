import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart2, Headphones, Mic2, Pause, Play } from "lucide-react";
import type { components, LibrarySong, TopSongItem } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { ChartSongCard } from "@/components/cards/ChartSongCard";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { HeroSpotlight } from "@/components/discovery/HeroSpotlight";
import { RowSkeleton } from "@/components/feedback/Skeleton";
import { useHomepage } from "@/hooks/useHomepage";
import { useTopArtists, useTopPlaylists, useTopSongs } from "@/hooks/useCharts";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { useLibrarySongs } from "@/hooks/useLibrary";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { RecordingActionMenu } from "@/components/media/RecordingActionMenu";
import {
  chartItemPlaybackContext,
  librarySongToQueueTrack,
  topSongToQueueTrack,
} from "@/lib/queueTrack";
import { coverFallback, resolveItemPath } from "@/lib/routes";
import { recordingShareUrl } from "@/lib/shareContent";

type HomepageItem = components["schemas"]["HomepageItem"];

const CHART_RANGE_LABELS: Record<"7d" | "30d" | "all", string> = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all time",
};

// ── layout helpers ────────────────────────────────────────────────────────────

function usernameFromHomepageUser(item: HomepageItem): string {
  const match = item.href.match(/^\/@\/([^/]+)/);
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
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
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

  return (
    <div
      className={[
        "group/card flex w-full items-center gap-1 rounded-lg px-2 py-2 transition",
        isActive ? "bg-white/[0.08]" : "hover:bg-white/[0.05]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={isActive ? (isPlaying ? "Pause" : "Resume") : "Play"}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {/* Artwork with play overlay */}
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md">
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
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={[
              "truncate text-sm font-semibold leading-snug",
              isActive ? "text-[var(--color-brand)]" : "text-white",
            ].join(" ")}
          >
            {song.title}
          </p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {song.uploader.displayName}
          </p>
        </div>

        <span className="shrink-0 pr-1">
          {isPlaying ? (
            <Pause size={15} fill="currentColor" className="text-[var(--color-brand)]" />
          ) : (
            <Play
              size={15}
              fill="currentColor"
              className="text-white/30 transition group-hover/card:text-white/80"
            />
          )}
        </span>
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
        Real plays, real rankings. Discover what's trending this week, follow the artists
        making it happen, and if you make music — your analytics live here.
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

const PILLARS = [
  {
    icon: BarChart2,
    title: "Weekly charts",
    body: "See what's actually being played. Ranked by real listeners, updated every week.",
    color: "#06b6d4",
  },
  {
    icon: Headphones,
    title: "Editorial taste",
    body: "Curated picks from people who listen obsessively. No algorithm. No pay-to-play.",
    color: "#8b5cf6",
  },
  {
    icon: Mic2,
    title: "Artist tools",
    body: "Upload your music, track your plays, and own your analytics from day one.",
    color: "#10b981",
  },
] as const;

function FeaturePillars() {
  return (
    <section className="mb-10 grid gap-4 sm:grid-cols-3">
      {PILLARS.map(({ icon: Icon, title, body, color }) => (
        <div
          key={title}
          className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[var(--color-surface)] p-6"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: `${color}22` }}
          >
            <Icon size={20} style={{ color }} />
          </div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{body}</p>
        </div>
      ))}
    </section>
  );
}

function CreatorCTA() {
  return (
    <section className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-[var(--color-brand)]/20 bg-[var(--color-brand)]/5 px-7 py-6 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-bold text-white">Make music?</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          Get your own analytics dashboard, track plays, and reach new listeners.
        </p>
      </div>
      <Link
        to="/register"
        className="shrink-0 rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Upload your music →
      </Link>
    </section>
  );
}

// ── news card ─────────────────────────────────────────────────────────────────

function NewsCard({
  category,
  title,
  blurb,
  href,
}: {
  category: string;
  title: string;
  blurb: string;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[var(--color-surface)] p-5 transition hover:border-white/[0.14]">
      <span className="w-fit rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-text-muted)]">
        {category}
      </span>
      <p className="text-sm font-bold leading-snug text-white">{title}</p>
      <p className="mt-auto text-xs leading-relaxed text-[var(--color-text-muted)]">{blurb}</p>
    </div>
  );
  if (href && !href.startsWith("/news")) {
    return <Link to={href} className="block h-full">{inner}</Link>;
  }
  return inner;
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

// ── page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { status, user } = useAuth();
  const isGuest = status === "guest";
  const isCreator = user?.role === "CREATOR";

  const [chartsRange, setChartsRange] = useState<"7d" | "30d" | "all">("7d");

  const editorial = useHomepage();
  const topSongs = useTopSongs(chartsRange, 12);
  const topPlaylists = useTopPlaylists(chartsRange, 10);
  const topArtists = useTopArtists(chartsRange, 10);
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

  // Hero: prefer EDITOR_PICK, fall back to first item of any section
  const heroItem = useMemo(() => {
    const ep = sectionMap["EDITOR_PICK"] ?? [];
    if (ep.length > 0) return ep[0];
    for (const s of editorial.data?.sections ?? []) {
      if (s.items.length > 0) return s.items[0];
    }
    return null;
  }, [sectionMap, editorial.data]);

  // Featured playlists
  const editorialFeaturedPlaylists = sectionMap["FEATURED_PLAYLIST"] ?? [];
  const fallbackFeaturedPlaylists = useMemo(
    () => stableShuffleByDay(allTimeFeatured.data?.data ?? []).slice(0, 8),
    [allTimeFeatured.data],
  );

  // Featured artists
  const editorialFeaturedArtists = sectionMap["NEW_ARTIST"] ?? [];

  // Other editorial (editor picks minus hero, new releases, custom mixes)
  const otherEditorial = useMemo(() => {
    const heroId = heroItem?.id;
    return [
      ...(sectionMap["EDITOR_PICK"] ?? []).filter((i) => i.id !== heroId),
      ...(sectionMap["NEW_RELEASE"] ?? []),
      ...(sectionMap["CUSTOM_MIX"] ?? []),
    ];
  }, [sectionMap, heroItem]);

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

  // Site news
  const siteNewsItems = sectionMap["SITE_NEWS"] ?? [];

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
      queue.slice(idx).map((s) => librarySongToQueueTrack(s, context)),
      { sourceContext: "genre" },
    );
  }

  function handleChartSongPlay(item: TopSongItem, siblings: TopSongItem[], sectionName: string) {
    if (currentTrack?.id === item.recordingId) {
      togglePlay();
      return;
    }
    const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
    if (idx < 0) return;
    const queue = siblings.slice(idx).map((s) => topSongToQueueTrack(s, sectionName));
    playTrack(topSongToQueueTrack(item, sectionName), queue, chartItemPlaybackContext(item));
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
                <SmartPlaylistCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  creatorName={item.subtitle}
                  coverArtUrl={item.imageUrl}
                  className="w-full"
                />
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
                  username={item.username}
                  displayName={item.displayName}
                  avatarUrl={item.avatarUrl}
                  subtitle={`${item.playCount.toLocaleString()} plays`}
                  className="w-full"
                />
              ))}
        </HomeSection>
      )}

      {/* ── OTHER EDITORIAL ──────────────────────────────────── */}

      {otherEditorial.length > 0 && (
        <HomeSection
          title="Editor Picks"
          cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        >
          {otherEditorial.map((item) =>
            item.targetType === "USER" ? (
              <ArtistCard
                key={item.id}
                username={usernameFromHomepageUser(item)}
                displayName={item.title}
                avatarUrl={item.imageUrl}
                subtitle={item.subtitle}
                className="w-full"
              />
            ) : (
              <SmartPlaylistCard
                key={item.id}
                id={item.id}
                title={item.title}
                creatorName={item.subtitle}
                coverArtUrl={item.imageUrl}
                className="w-full"
              />
            ),
          )}
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
        const limited = songs.slice(0, 12);
        return (
          <HomeSection
            key={slug}
            title={name}
            subtitle={`${songs.length} song${songs.length !== 1 ? "s" : ""}`}
            viewAllHref={`/library?view=genres&genre=${slug}`}
            cols="grid-cols-1 sm:grid-cols-2"
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

      {/* ── SITE NEWS ────────────────────────────────────────── */}

      {siteNewsItems.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">What's new</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Updates from the Playlisted team
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {siteNewsItems.map((item) => (
              <NewsCard
                key={item.id}
                category="News"
                title={item.title}
                blurb={item.description ?? item.subtitle ?? ""}
                href={item.href}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURE PILLARS ──────────────────────────────────── */}

      {!chartsLoading && <FeaturePillars />}

      {/* ── CREATOR CTA ──────────────────────────────────────── */}

      {(isGuest || (!isCreator && status === "authenticated")) && <CreatorCTA />}
    </div>
  );
}
