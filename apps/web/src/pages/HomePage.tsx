import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { components, TopArtistItem } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { SiteFooter } from "@/components/site/SiteFooter";
import { useHomepage } from "@/hooks/useHomepage";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTopArtists } from "@/hooks/useCharts";

const RadioPage = lazy(() =>
  import("@/pages/RadioPage").then((mod) => ({ default: mod.RadioPage })),
);

type HomepageItem = components["schemas"]["HomepageItem"];
type HomepageSection = components["schemas"]["HomepageSection"];

const HOME_LIMITS = {
  featuredArtists: 6,
  pinnedArtistsFetch: 8,
} as const;

const HOME_SECTION_COLS = {
  featuredArtists: "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
} as const;

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
  children: ReactNode;
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

function DeferredHomeSection({
  children,
  minHeight = 260,
  rootMargin = "160px 0px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const [shouldMount, setShouldMount] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldMount) return;
    const node = ref.current;
    if (!node || !("IntersectionObserver" in window)) {
      const timer = window.setTimeout(() => setShouldMount(true), 1200);
      return () => window.clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin, shouldMount]);

  return (
    <div ref={ref} style={shouldMount ? undefined : { minHeight }}>
      {shouldMount ? children : null}
    </div>
  );
}

function HomeFeaturedArtistsSection({
  editorialFeaturedArtists,
}: {
  editorialFeaturedArtists: HomepageItem[];
}) {
  const pinnedArtists = useTopArtists(
    "30d",
    HOME_LIMITS.pinnedArtistsFetch,
    editorialFeaturedArtists.length === 0,
  );

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

  if (
    featuredArtistsSection.editorial.length === 0 &&
    featuredArtistsSection.fallback.length === 0
  ) {
    return null;
  }

  return (
    <HomeSection
      title=""
      subtitle=""
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
  );
}

export function HomePage() {
  usePageMeta({
    title: "Home",
    description: "Music charts and curated playlists for independent artists.",
  });

  const editorial = useHomepage();

  const editorialFeaturedArtists = useMemo(() => {
    const section = editorial.data?.sections?.find((s: HomepageSection) => s.section === "NEW_ARTIST");
    return section?.items ?? [];
  }, [editorial.data]);

  return (
    <div className="mx-auto max-w-[var(--size-container-max,90rem)]">
      <Suspense fallback={null}>
        <div className="">
          <RadioPage isEmbedded />
        </div>
      </Suspense>

      <DeferredHomeSection minHeight={260}>
        <HomeFeaturedArtistsSection editorialFeaturedArtists={editorialFeaturedArtists} />
      </DeferredHomeSection>

      <div className="mt-20 mb-4">
        <SiteFooter />
      </div>
    </div>
  );
}
