import { Link } from "react-router-dom";
import type { components, TopArtistItem } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { Skeleton } from "@/components/feedback/Skeleton";
import { coverFallback, profilePath } from "@/lib/routes";

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

/** Daily-rotated admin FEATURED_ARTIST selection first; otherwise daily-rotated chart artists. */
export function pickGreetingsFeaturedArtist(
  curatedArtists: HomepageItem[],
  chartArtists: TopArtistItem[],
): BannerFeaturedArtist | null {
  const curatedArtist = stableShuffleByDay(curatedArtists)[0];
  if (curatedArtist) return toBannerArtistFromHomepage(curatedArtist);

  const picked = stableShuffleByDay(chartArtists)[0];
  return picked ? toBannerArtistFromChart(picked) : null;
}

export function FeaturedArtist({
  featuredArtist,
  artistLoading,
}: {
  firstName?: string;
  isGuest: boolean;
  featuredArtist: BannerFeaturedArtist | null;
  artistLoading?: boolean;
}) {
  const heroBg = featuredArtist?.heroImageUrl ?? featuredArtist?.avatarUrl;

  return (
    <div className={`mb-10 grid items-stretch gap-4`}>
        <section className="relative min-h-[320px] overflow-hidden rounded-2xl">
          {artistLoading && !featuredArtist ? (
            <Skeleton className="absolute inset-0 h-full w-full rounded-2xl" />
          ) : featuredArtist ? (
            <>
              {heroBg ? (
                <img
                  src={heroBg}
                  alt=""
                  loading="lazy"
                  decoding="async"
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
              <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-end px-6 py-8 md:px-10 md:py-10">
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
        </div>
  );
}
