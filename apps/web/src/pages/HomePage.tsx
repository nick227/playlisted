import type { components } from "@playlisted/client-sdk";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { FeatureCard } from "@/components/cards/FeatureCard";
import { PlaylistCard } from "@/components/cards/PlaylistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { HeroSpotlight } from "@/components/discovery/HeroSpotlight";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RowSkeleton } from "@/components/feedback/Skeleton";
import { useHomepage } from "@/hooks/useHomepage";
import { resolveItemPath } from "@/lib/routes";

type HomepageItem = components["schemas"]["HomepageItem"];
type HomepageSection = components["schemas"]["HomepageSection"];

function sectionLayout(section: HomepageSection["section"]): "square" | "circle" | "feature" {
  if (section === "NEW_ARTIST") return "circle";
  if (section === "EDITOR_PICK" || section === "SITE_NEWS") return "feature";
  return "square";
}

function SectionItems({ section }: { section: HomepageSection }) {
  const layout = sectionLayout(section.section);

  return (
    <>
      {section.items.map((item) => (
        <SectionItem key={item.id} item={item} layout={layout} />
      ))}
    </>
  );
}

function SectionItem({ item, layout }: { item: HomepageItem; layout: string }) {
  const href = resolveItemPath(item);

  if (layout === "circle" || item.targetType === "USER") {
    return (
      <ArtistCard
        username={item.subtitle?.replace(/^@/, "") ?? item.id}
        displayName={item.title}
        subtitle={item.subtitle}
        avatarUrl={item.imageUrl}
      />
    );
  }

  if (layout === "feature" || item.targetType === "EDITORIAL_POST") {
    return (
      <FeatureCard
        title={item.title}
        summary={item.description ?? item.subtitle}
        imageUrl={item.imageUrl}
        href={href}
      />
    );
  }

  return (
    <PlaylistCard
      id={item.id}
      title={item.title}
      creatorName={item.subtitle}
      coverArtUrl={item.imageUrl}
    />
  );
}

export function HomePage() {
  const { data, isLoading, isError, refetch } = useHomepage();

  if (isLoading) {
    return (
      <div>
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="Could not load homepage"
        description="Make sure the API is running (currently proxied to port 4001)."
        action={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
          >
            Retry
          </button>
        }
      />
    );
  }

  const heroSection = data.sections[0];
  const heroItem = heroSection?.items[0];
  const restSections = heroItem ? data.sections.slice(1) : data.sections;

  return (
    <div className="mx-auto max-w-[var(--size-container-max,90rem)]">
      <p className="mb-6 text-2xl font-bold md:text-3xl">Good evening</p>

      {heroItem ? (
        <HeroSpotlight
          title={heroItem.title}
          summary={heroItem.description ?? heroItem.subtitle}
          imageUrl={heroItem.imageUrl}
          href={resolveItemPath(heroItem)}
        />
      ) : null}

      {restSections.map((section) => (
        <ContentRow key={section.section} title={section.title}>
          <SectionItems section={section} />
        </ContentRow>
      ))}

      {data.sections.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Seed the database to populate homepage rows." />
      ) : null}
    </div>
  );
}
