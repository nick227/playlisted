import { useMemo } from "react";
import { Link } from "react-router-dom";
import type {
  components,
  TopArtistItem,
  TopPlaylistItem,
} from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { MediaCover } from "@/components/cards/MediaCover";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { HomeChartsSection } from "@/components/charts/HomeChartsSection";
import { HomeGenreSongsSection } from "@/components/charts/HomeGenreSongsSection";
import {
  GreetingsBanner,
  pickGreetingsFeaturedArtist,
} from "@/components/discovery/GreetingsBanner";
import { SpotlightBanner } from "@/components/discovery/SpotlightBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useHomepage } from "@/hooks/useHomepage";
import { useIsMdUp } from "@/hooks/useIsMdUp";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTrackPlayback } from "@/hooks/useTrackPlayback";
import { useTopArtists, useTopPlaylists } from "@/hooks/useCharts";
import { formatDuration } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { homeGridPlaylistOrigin } from "@/lib/playbackOrigin";
import { coverFallback, resolveItemPath } from "@/lib/routes";

type HomepageItem = components["schemas"]["HomepageItem"];
type HomepageRecordingItem = HomepageItem & {
  targetType: "RECORDING";
  uploaderId: string;
  publishedPlaylistId: string;
  audioUrl: string;
  durationSeconds?: number | null;
  recordingType: components["schemas"]["RecordingType"];
  visibility: components["schemas"]["Visibility"];
  status: components["schemas"]["PublishStatus"];
  explicit: boolean;
  playCount: number;
  createdAt: string;
  updatedAt: string;
  playlistTitle: string;
  playlistSlug: string;
  playlistOwnerUsername: string;
};

/** Item counts and fetch sizes for home sections (mobile vs md+). */
const HOME_LIMITS = {
  gridMobile: 4,
  gridDesktop: 8,
  featuredArtists: 6,
  discoverMobile: 4,
  discoverDesktop: 10,
  discoverPoolFetch: 30,
  featuredPlaylistsFetch: 8,
  pinnedArtistsFetch: 8,
  genreGroupsMax: 4,
  genreMinSongs: 3,
  newReleases: 8,
} as const;

const HOME_SECTION_COLS = {
  discover: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
  featuredPlaylists: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4",
  featuredArtists: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
  editorPicks: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  newReleases: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
  siteNews: "grid-cols-1 sm:grid-cols-2",
} as const;

function viewportLimit(mobile: number, desktop: number, isMdUp: boolean): number {
  return isMdUp ? desktop : mobile;
}

/** Editorial / featured grids: 4 on mobile, up to 8 on md+ when enough items exist. */
function homeGridItemLimit(available: number, isMdUp: boolean): number {
  const max = viewportLimit(HOME_LIMITS.gridMobile, HOME_LIMITS.gridDesktop, isMdUp);
  const n = Math.min(available, max);
  if (isMdUp && n >= HOME_LIMITS.gridDesktop) return HOME_LIMITS.gridDesktop;
  if (n >= HOME_LIMITS.gridMobile) return HOME_LIMITS.gridMobile;
  return n;
}

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

function SiteNewsCard({ item }: { item: HomepageItem }) {
  return (
    <div className="group flex gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition hover:bg-white/[0.04] ">
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
    </div>
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

function HomepageEditorialCard({
  item,
  sectionKey,
}: {
  item: HomepageItem;
  sectionKey: string;
}) {
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
      playbackOrigin={homeGridPlaylistOrigin(sectionKey, item.id)}
    />
  );
}

function isHomepageRecordingItem(item: HomepageItem): item is HomepageRecordingItem {
  return item.targetType === "RECORDING";
}

function releaseItemToQueueTrack(item: HomepageRecordingItem): QueueTrack {
  return {
    id: item.id,
    uploaderId: item.uploaderId,
    publishedPlaylistId: item.publishedPlaylistId,
    title: item.title,
    description: item.description ?? null,
    audioUrl: item.audioUrl,
    audioMimeType: null,
    audioBytes: null,
    durationSeconds: item.durationSeconds ?? null,
    artworkUrl: item.imageUrl ?? null,
    trackNumber: null,
    episodeNumber: null,
    recordingType: item.recordingType,
    visibility: item.visibility,
    status: item.status,
    explicit: item.explicit,
    playCount: item.playCount,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ownerName: item.subtitle ?? undefined,
    ownerUsername: item.playlistOwnerUsername,
    playlistTitle: item.playlistTitle,
    playlistSlug: item.playlistSlug,
  };
}

function newReleaseOrigin(recordingId: string): string {
  return `home:new-releases:${recordingId}`;
}

function NewReleaseSongCard({
  item,
  queueTracks,
}: {
  item: HomepageRecordingItem;
  queueTracks: QueueTrack[];
}) {
  const playbackOrigin = newReleaseOrigin(item.id);
  const { isActive, isPlaying } = useTrackPlayback(item.id, playbackOrigin);
  const { playTrack, togglePlay } = useAudioPlayer();

  function handlePlay() {
    if (isActive) {
      togglePlay();
      return;
    }
    playTrack(releaseItemToQueueTrack(item), queueTracks, { sourceContext: "home" }, {
      segmentLabel: "New Releases",
      playbackOrigin,
      originScope: "track",
    });
  }

  return (
    <Link
      to={item.href}
      className="group flex w-full flex-col gap-2 transition-opacity hover:opacity-90"
    >
      <MediaCover
        title={item.title}
        imageUrl={item.imageUrl}
        onPlay={handlePlay}
        isActive={isActive}
        isPlaying={isPlaying}
        showPlaybackBars
      />
      <div className="min-w-0">
        <p className={`truncate text-sm font-medium ${isActive ? "text-[var(--color-brand)]" : "text-white"}`}>
          {item.title}
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {[item.subtitle, item.playlistTitle].filter(Boolean).join(" • ")}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
          {formatDuration(item.durationSeconds ?? null)}
        </p>
      </div>
    </Link>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { status, user } = useAuth();
  const isGuest = status === "guest";
  const isMdUp = useIsMdUp();

  usePageMeta({
    title: "Home",
    description: "Music charts and curated playlists for independent artists.",
  });

  const discoverLimit = viewportLimit(
    HOME_LIMITS.discoverMobile,
    HOME_LIMITS.discoverDesktop,
    isMdUp,
  );

  const editorial = useHomepage();
  const topArtists = useTopArtists("7d", 6);
  const discoverPool = useTopPlaylists("30d", HOME_LIMITS.discoverPoolFetch);
  const allTimeFeatured = useTopPlaylists("all", HOME_LIMITS.featuredPlaylistsFetch);
  const pinnedArtists = useTopArtists("30d", HOME_LIMITS.pinnedArtistsFetch);

  // Parse editorial sections into a keyed map
  const sectionMap = useMemo(() => {
    const map: Record<string, HomepageItem[]> = {};
    for (const s of editorial.data?.sections ?? []) map[s.section] = s.items;
    return map;
  }, [editorial.data]);

  // Spotlight: first active item in SPOTLIGHT section
  const spotlightItem = sectionMap["SPOTLIGHT"]?.[0] ?? null;

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
      customMixes,
    );
    return pool.slice(0, homeGridItemLimit(pool.length, isMdUp));
  }, [editorPicks, heroItem, customMixes, isMdUp]);

  const editorPickGridIds = useMemo(
    () => new Set(editorPicksGrid.map((i) => i.id)),
    [editorPicksGrid],
  );

  const newReleasesSection = useMemo(
    () =>
      newReleases
        .filter((i) => !editorPickGridIds.has(i.id))
        .slice(0, HOME_LIMITS.newReleases),
    [newReleases, editorPickGridIds],
  );
  const newReleaseSongs = useMemo(
    () => newReleasesSection.filter(isHomepageRecordingItem),
    [newReleasesSection],
  );
  const newReleaseQueueTracks = useMemo(
    () => newReleaseSongs.map(releaseItemToQueueTrack),
    [newReleaseSongs],
  );

  // Featured playlists — same 4/8 cap as editor picks grid
  const editorialFeaturedPlaylists = sectionMap["FEATURED_PLAYLIST"] ?? [];
  const featuredPlaylistsSection = useMemo((): {
    editorial: HomepageItem[];
    fallback: TopPlaylistItem[];
  } => {
    if (editorialFeaturedPlaylists.length > 0) {
      const limit = homeGridItemLimit(editorialFeaturedPlaylists.length, isMdUp);
      return {
        editorial: editorialFeaturedPlaylists.slice(0, limit),
        fallback: [],
      };
    }
    const pool = stableShuffleByDay<TopPlaylistItem>(allTimeFeatured.data?.data ?? []);
    const limit = homeGridItemLimit(pool.length, isMdUp);
    return { editorial: [], fallback: pool.slice(0, limit) };
  }, [editorialFeaturedPlaylists, allTimeFeatured.data, isMdUp]);

  // Featured artists grid (NEW_ARTIST) vs greetings banner slot (FEATURED_ARTIST)
  const editorialFeaturedArtists = sectionMap["NEW_ARTIST"] ?? [];
  const greetingsCuratedArtist = sectionMap["FEATURED_ARTIST"]?.[0] ?? null;

  const greetingsFeaturedArtist = useMemo(
    () =>
      pickGreetingsFeaturedArtist(
        greetingsCuratedArtist,
        pinnedArtists.data?.data ?? topArtists.data?.data ?? [],
      ),
    [greetingsCuratedArtist, pinnedArtists.data, topArtists.data],
  );

  const greetingsArtistLoading =
    !greetingsCuratedArtist &&
    pinnedArtists.isLoading &&
    !greetingsFeaturedArtist;

  const featuredArtistsSection = useMemo((): {
    editorial: HomepageItem[];
    fallback: TopArtistItem[];
  } => {
    const cap = HOME_LIMITS.featuredArtists;
    if (editorialFeaturedArtists.length > 0) {
      return { editorial: editorialFeaturedArtists.slice(0, cap), fallback: [] };
    }
    return {
      editorial: [],
      fallback: (pinnedArtists.data?.data ?? []).slice(0, cap),
    };
  }, [editorialFeaturedArtists, pinnedArtists.data]);

  // For You / Discover
  const discovered = useMemo((): TopPlaylistItem[] => {
    const pool: TopPlaylistItem[] = discoverPool.data?.data ?? [];
    if (!isGuest && user) return stableShuffleForUser(pool, user.id).slice(0, discoverLimit);
    return stableShuffleByDay(pool).slice(0, discoverLimit);
  }, [discoverPool.data, isGuest, user, discoverLimit]);

  const firstName = user?.displayName?.split(" ")[0];

  return (
    <div className="mx-auto max-w-[var(--size-container-max,90rem)]">

      {/* Greeting / banner */}
      <GreetingsBanner
        firstName={firstName}
        isGuest={isGuest}
        featuredArtist={greetingsFeaturedArtist}
        artistLoading={greetingsArtistLoading}
      />
      

      {/* ── CHARTS ────────────────────────────────────────────── */}

      <HomeChartsSection />

      {/* ── GENRE SONGS ────────────────────────────────────────────── */}

      <HomeGenreSongsSection />

      {/* ── NEW RELEASES ────────────────────────────────────────────── */}

      {newReleasesSection.length > 0 && (
        <HomeSection title="New Releases" cols={HOME_SECTION_COLS.newReleases}>
          {newReleasesSection.map((item) => (
            isHomepageRecordingItem(item) ? (
              <NewReleaseSongCard key={item.id} item={item} queueTracks={newReleaseQueueTracks} />
            ) : (
              <HomepageEditorialCard key={item.id} item={item} sectionKey="new-releases" />
            )
          ))}
        </HomeSection>
      )}

      {/* ── SITE NEWS ────────────────────────────────────────────── */}

      {siteNews.length > 0 && (
        <HomeSection
          title="Site News"
          subtitle="Updates from the team"
          cols={HOME_SECTION_COLS.siteNews}
        >
          {siteNews.map((item) => (
            <SiteNewsCard key={item.id} item={item} />
          ))}
        </HomeSection>
      )}

      {/* Spotlight — admin-curated full-width hero, shown before everything */}
      {spotlightItem && <SpotlightBanner item={spotlightItem} />}

{/* ── FOR YOU / DISCOVER ───────────────────────────────── */}

{discovered.length > 0 && (
  <HomeSection
    title={!isGuest ? "Picked for you" : "Discover Something New"}
    subtitle={!isGuest ? "Updated daily based on your taste" : "Fresh picks — updated daily"}
    cols={HOME_SECTION_COLS.discover}
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
        genre={item.genre}
        className="w-full"
        playbackOrigin={homeGridPlaylistOrigin("discover", item.playlistId)}
      />
    ))}
  </HomeSection>
)}

      {/* ── FEATURED PLAYLISTS ───────────────────────────────── */}

      {(featuredPlaylistsSection.editorial.length > 0 ||
        featuredPlaylistsSection.fallback.length > 0) && (
        <HomeSection
          title="Featured Playlists"
          subtitle="Handpicked by the team"
          cols={HOME_SECTION_COLS.featuredPlaylists}
        >
          {featuredPlaylistsSection.editorial.length > 0
            ? featuredPlaylistsSection.editorial.map((item) => (
                <HomepageEditorialCard key={item.id} item={item} sectionKey="featured-playlists" />
              ))
            : featuredPlaylistsSection.fallback.map((item) => (
                <SmartPlaylistCard
                  key={item.playlistId}
                  id={item.playlistId}
                  title={item.title}
                  creatorName={item.owner.displayName}
                  coverArtUrl={item.coverArtUrl}
                  ownerUsername={item.owner.username}
                  slug={item.slug}
                  genre={item.genre}
                  className="w-full"
                  playbackOrigin={homeGridPlaylistOrigin("featured-playlists", item.playlistId)}
                />
              ))}
        </HomeSection>
      )}

      {/* ── FEATURED ARTISTS ────────────────────────────────── */}

      {(featuredArtistsSection.editorial.length > 0 ||
        featuredArtistsSection.fallback.length > 0) && (
        <HomeSection
          title="Featured Artists"
          subtitle="Artists to know right now"
          cols={HOME_SECTION_COLS.featuredArtists}
        >
          {featuredArtistsSection.editorial.length > 0
            ? featuredArtistsSection.editorial.map((item) => (
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
            : featuredArtistsSection.fallback.map((item: TopArtistItem) => (
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

      {/* ── EDITOR PICKS (homepage_features.section = EDITOR_PICK) ── */}

      {editorPicksGrid.length > 0 && (
        <HomeSection
          title="Editor Picks"
          cols={HOME_SECTION_COLS.editorPicks}
        >
          {editorPicksGrid.map((item) => (
            <HomepageEditorialCard key={item.id} item={item} sectionKey="editor-picks" />
          ))}
        </HomeSection>
      )}

      <SiteFooter />
    </div>
  );
}
