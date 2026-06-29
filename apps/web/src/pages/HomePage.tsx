import { lazy, Suspense } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";

const RadioPage = lazy(() =>
  import("@/pages/RadioPage").then((mod) => ({ default: mod.RadioPage })),
);

export function HomePage() {
  usePageMeta({
    title: "Home",
    description: "Music charts and curated playlists for independent artists.",
  });

  return (
    <div className="mx-auto max-w-[var(--size-container-max,90rem)]">
      <Suspense fallback={null}>
        <div className="">
          <RadioPage isEmbedded />
        </div>
      </Suspense>
    </div>
  );
}
