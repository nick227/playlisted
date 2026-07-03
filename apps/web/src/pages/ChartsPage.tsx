import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { ChartsFilterBar } from "@/components/charts/ChartsFilterBar";
import { ChartsList } from "@/components/charts/ChartsList";
import { LibraryBrowseLayout } from "@/components/library/LibraryBrowseLayout";
import { PanelHeader } from "@/components/library/libraryPanels";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  chartsPageSearchParams,
  parseChartsPageState,
  type ChartsPageState,
} from "@/lib/chartsPageState";
import { chartsBrowseCrumbs } from "@/lib/browsePaths";

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
    <LibraryBrowseLayout crumbs={chartsBrowseCrumbs()}>
      <PanelHeader label="Charts" />

      <div className="mt-10 overflow-hidden rounded-xl border border-[var(--color-border)]">
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
    </LibraryBrowseLayout>
  );
}
