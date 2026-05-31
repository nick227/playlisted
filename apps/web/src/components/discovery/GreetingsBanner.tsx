import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { components, TopArtistItem } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { Skeleton } from "@/components/feedback/Skeleton";
import { coverFallback, profilePath } from "@/lib/routes";

import { GreetingSky } from "./greeting/GreetingSky";
import { getTimeTheme } from "./greeting/getTimeTheme";

type HomepageItem = components["schemas"]["HomepageItem"];

export type BannerFeaturedArtist = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  heroImageUrl?: string | null;
  subtitle?: string | null;
};

function usernameFromHomepageUser(item: HomepageItem): string {
  const match = item.href.match(/^\/@\/?([^/]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);
  return item.subtitle?.replace(/^@/, "") ?? item.id;
}

function toBannerArtistFromHomepage(item: HomepageItem): BannerFeaturedArtist {
  return {
    id: item.id,
    username: usernameFromHomepageUser(item),
    displayName: item.title,
    avatarUrl: item.imageUrl,
    heroImageUrl: item.imageUrl,
    subtitle: item.subtitle ?? item.description ?? null,
  };
}

function toBannerArtistFromChart(item: TopArtistItem): BannerFeaturedArtist {
  return {
    id: item.userId,
    username: item.username,
    displayName: item.displayName,
    avatarUrl: item.avatarUrl,
    heroImageUrl: item.heroImageUrl ?? item.avatarUrl,
    subtitle: `${item.playCount.toLocaleString()} plays`,
  };
}

function stableShuffleByDay<T>(arr: T[]): T[] {
  const seed = Math.floor(Date.now() / 86_400_000);
  return [...arr]
    .map((item, i) => ({ item, sort: Math.sin(seed + i * 127) }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

/** Admin-curated FEATURED_ARTIST (position 0) first; otherwise daily-rotated chart artists. */
export function pickGreetingsFeaturedArtist(
  curatedArtist: HomepageItem | null | undefined,
  chartArtists: TopArtistItem[],
): BannerFeaturedArtist | null {
  if (curatedArtist) return toBannerArtistFromHomepage(curatedArtist);
  const picked = stableShuffleByDay(chartArtists)[0];
  return picked ? toBannerArtistFromChart(picked) : null;
}

export function GreetingsBanner({
  firstName,
  isGuest,
  featuredArtist,
  artistLoading,
}: {
  firstName?: string;
  isGuest: boolean;
  featuredArtist: BannerFeaturedArtist | null;
  artistLoading?: boolean;
}) {
  const theme = useMemo(() => getTimeTheme(), []);
  const headline =
    !isGuest && firstName ? `${theme.greeting}, ${firstName}` : theme.greeting;
  const showArtistPanel = Boolean(featuredArtist || artistLoading);
  const heroBg = featuredArtist?.heroImageUrl ?? featuredArtist?.avatarUrl;

  return (
    <div className={`mb-10 grid gap-4 ${showArtistPanel ? "lg:grid-cols-2" : ""}`}>
      <section className="relative min-h-[420px] overflow-hidden rounded-2xl px-8 py-12 md:px-14">
        <GreetingSky theme={theme} />
        <div className="relative z-10 mt-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]">
            Playlisted
          </p>
          <h1 className="max-w-lg text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
            {headline}
          </h1>
          <p
            className="mt-4 max-w-md text-sm leading-relaxed text-white"
            style={{ opacity: theme.textMutedOpacity }}
          >
            {isGuest
              ? "Discover independent artists, playlists, and charts curated for the community."
              : "Browse charts or upload new tracks."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/library"
              className="inline-flex items-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Browse music
            </Link>
            {isGuest ? (
              <Link
                to="/register"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Join free
              </Link>
            ) : (
              <Link
                to="/studio/collections"
                className="inline-flex items-center rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Upload
              </Link>
            )}
          </div>
        </div>
      </section>

      {showArtistPanel ? (
        <section className="relative min-h-[420px] overflow-hidden rounded-2xl">
          {artistLoading && !featuredArtist ? (
            <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
          ) : featuredArtist ? (
            <>
              {heroBg ? (
                <img
                  src={heroBg}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: coverFallback(featuredArtist.displayName) }}
                  aria-hidden
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/25" />
              <div className="relative z-10 flex min-h-[420px] flex-col justify-end px-8 py-12 md:px-14 mt-4 ">
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-brand)]">
                  Featured artist
                </p>
                <ArtistCard
                  id={featuredArtist.id}
                  username={featuredArtist.username}
                  displayName={featuredArtist.displayName}
                  avatarUrl={featuredArtist.avatarUrl}
                  subtitle={featuredArtist.subtitle}
                  className="w-full max-w-xs"
                />
                <Link
                  to={profilePath(featuredArtist.username)}
                  className="mt-5 inline-flex text-sm font-medium text-white/80 transition hover:text-white"
                >
                  View profile →
                </Link>
              </div>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
