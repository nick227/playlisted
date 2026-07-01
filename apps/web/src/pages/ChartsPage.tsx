import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { ChartsFilterBar } from "@/components/charts/ChartsFilterBar";
import { ChartsList } from "@/components/charts/ChartsList";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  chartsPageSearchParams,
  parseChartsPageState,
  type ChartsPageState,
} from "@/lib/chartsPageState";

const CHARTS_LAYOUT_CLASS = "mx-auto min-h-[72vh] max-w-5xl px-4 py-6 sm:px-6 bg-[var(--color-surface)]/80 rounded-lg p-4";

export function ChartsPage() {
  const [params, setSearchParams] = useSearchParams();
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
      setSearchParams(chartsPageSearchParams(next), { replace: true });
    },
    [setSearchParams, state],
  );

  return (
    <div className={CHARTS_LAYOUT_CLASS}>
      <header className="mb-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Charts</h1>
      </header>

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <ChartsFilterBar
          tab={state.tab}
          range={state.range}
          genre={state.genre}
          genres={genres}
          onTabChange={(tab) => updateState({ tab })}
          onRangeChange={(range) => updateState({ range })}
          onGenreChange={(genre) => updateState({ genre })}
        />
        <ChartsList tab={state.tab} range={state.range} genre={state.genre} />
      </div>
    </div>
  );
}
