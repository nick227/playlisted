import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ChartsFilterBar } from "@/components/charts/ChartsFilterBar";
import { ChartsList } from "@/components/charts/ChartsList";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import { CHARTS_PATH } from "@/lib/browsePaths";
import {
  chartsPageHref,
  parseChartsPageState,
  type ChartsPageState,
} from "@/lib/chartsPageState";

const CHARTS_LAYOUT_CLASS = "mx-auto min-h-[72vh] max-w-5xl px-4 py-6 sm:px-6";

export function ChartsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const state = useMemo(() => parseChartsPageState(params), [params]);
  const { data: genreData } = useLibraryGenres();
  const genres = genreData?.data ?? [];

  usePageMeta({
    title: "Charts",
    description: "Top songs, artists, and playlists on Playlisted.",
  });

  const updateState = useCallback(
    (patch: Partial<ChartsPageState>) => {
      const next = { ...state, ...patch };
      if (next.tab !== "songs") next.genre = null;
      navigate(chartsPageHref(next, CHARTS_PATH), { replace: true });
    },
    [navigate, state],
  );

  return (
    <div className={CHARTS_LAYOUT_CLASS}>
      <header className="mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Charts</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          What&apos;s getting the most plays on Playlisted.
        </p>
      </header>

      <ChartsFilterBar
        tab={state.tab}
        range={state.range}
        genre={state.genre}
        genres={genres}
        onTabChange={(tab) => updateState({ tab })}
        onRangeChange={(range) => updateState({ range })}
        onGenreChange={(genre) => updateState({ genre })}
      />

      <div className="mt-6">
        <ChartsList tab={state.tab} range={state.range} genre={state.genre} />
      </div>
    </div>
  );
}
