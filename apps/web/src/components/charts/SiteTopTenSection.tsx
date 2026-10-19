import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ChartsFilterBar } from "@/components/charts/ChartsFilterBar";
import { ChartsList } from "@/components/charts/ChartsList";
import { MuseumSectionHeader } from "@/components/library/museum/museumUi";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { parseChartsPageState, type ChartsPageState } from "@/lib/chartsPageState";

const SITE_TOP_TEN_LIMIT = 10;

/**
 * Site-wide top ten (songs / artists / playlists). Filter state is seeded from
 * the URL once (legacy `/favorites?tab=…` links) and then kept local, so
 * changing filters never triggers the shell's route scroll reset.
 */
export function SiteTopTenSection() {
  const [params] = useSearchParams();
  const [chartState, setChartState] = useState<ChartsPageState>(() => parseChartsPageState(params));
  const { data: genreData } = useLibraryGenres();
  const genres = genreData?.data ?? [];

  const updateChartState = useCallback((patch: Partial<ChartsPageState>) => {
    setChartState((current) => {
      const next = { ...current, ...patch };
      if (next.tab !== "songs") next.genre = null;
      return next;
    });
  }, []);

  return (
    <section id="charts" className="scroll-mt-4">
      <MuseumSectionHeader label="Top ten" />
      <div className="overflow-hidden rounded-xl bg-[var(--color-canvas)]/80">
        <ChartsFilterBar
          tab={chartState.tab}
          range={chartState.range}
          genre={chartState.genre}
          genres={genres}
          onTabChange={(tab) => updateChartState({ tab })}
          onRangeChange={(range) => updateChartState({ range })}
          onGenreChange={(genre) => updateChartState({ genre })}
        />
        <ChartsList
          tab={chartState.tab}
          range={chartState.range}
          genre={chartState.genre}
          limit={SITE_TOP_TEN_LIMIT}
        />
      </div>
    </section>
  );
}
