import { lazy, Suspense } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";

const RadioPage = lazy(() =>
  import("@/pages/RadioPage").then((mod) => ({ default: mod.RadioPage })),
);

function EmbeddedRadioFallback() {
  return (
    <div
      className="relative isolate -mx-4 flex h-[calc(100dvh-var(--spacing-topbar)-1rem-1.5rem)] max-h-[calc(100dvh-var(--spacing-topbar)-1rem-1.5rem)] items-center justify-center px-4 py-3 sm:-mx-6 sm:px-6 sm:py-6 lg:-mx-8 lg:px-8"
      aria-busy="true"
      aria-label="Loading radio"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[30rem] flex-col items-center justify-between gap-2 sm:justify-center sm:gap-0">
        <div className="h-8 w-28 shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035]" />
        <div className="relative flex min-h-0 w-full max-w-[min(74vw,23rem)] items-center justify-center">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-white/[0.025] blur-xl" />
          <div className="aspect-square max-h-full w-full max-w-full rounded-[1.4rem] border border-white/[0.08] bg-white/[0.04] shadow-[0_26px_80px_rgba(0,0,0,0.34)]" />
        </div>
        <div className="flex w-full shrink-0 flex-col items-center justify-start text-center sm:mt-7 sm:min-h-[9.35rem]">
          <div className="mb-1 h-5 w-36 rounded-full bg-white/[0.035] sm:mb-3" />
          <div className="h-16 w-full max-w-[22rem] rounded-lg bg-white/[0.04]" />
          <div className="mt-1 h-7 w-52 rounded-sm bg-white/[0.035] sm:mt-3" />
        </div>
        <div className="w-full max-w-[min(74vw,23rem)] shrink-0 sm:mt-1">
          <div className="h-5" />
          <div className="mt-1 h-1.5 rounded-full bg-white/10" />
        </div>
        <div className="flex h-16 shrink-0 items-center justify-center gap-4 sm:mt-8">
          <div className="h-11 w-11 rounded-full bg-white/[0.04]" />
          <div className="h-16 w-16 rounded-full bg-white/[0.055]" />
          <div className="h-11 w-11 rounded-full bg-white/[0.04]" />
        </div>
        <div className="flex shrink-0 items-center justify-center gap-2 sm:mt-8">
          <div className="h-11 w-11 rounded-full bg-white/[0.04]" />
          <div className="h-11 w-11 rounded-full bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  usePageMeta({
    title: "Home",
    description: "Music charts and curated playlists for independent artists.",
  });

  return (
    <div className="mx-auto max-w-[var(--size-container-max,90rem)] overflow-hidden">
      <Suspense fallback={<EmbeddedRadioFallback />}>
        <RadioPage isEmbedded />
      </Suspense>
    </div>
  );
}
