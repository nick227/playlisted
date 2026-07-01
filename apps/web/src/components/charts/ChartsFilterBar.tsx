import type { ChartRange, LibraryGenre } from "@playlisted/client-sdk";

import { CHARTS_PAGE_RANGE_OPTIONS } from "./chartConfig";
import type { ChartsTab } from "@/lib/chartsPageState";

const TAB_OPTIONS: { value: ChartsTab; label: string }[] = [
  { value: "songs", label: "Songs" },
  { value: "artists", label: "Artists" },
  { value: "playlists", label: "Playlists" },
];

const filterChipClass =
  "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90 data-[active=true]:border-[var(--color-brand)]/50 data-[active=true]:bg-[var(--color-brand)]/15 data-[active=true]:text-white";

interface ChartsFilterBarProps {
  tab: ChartsTab;
  range: ChartRange;
  genre: string | null;
  genres: LibraryGenre[];
  onTabChange: (tab: ChartsTab) => void;
  onRangeChange: (range: ChartRange) => void;
  onGenreChange: (genre: string | null) => void;
}

export function ChartsFilterBar({
  tab,
  range,
  genre,
  genres,
  onTabChange,
  onRangeChange,
  onGenreChange,
}: ChartsFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-4 border-b border-[var(--color-border)] bg-[var(--color-canvas)]/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Chart category">
        {TAB_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={tab === option.value}
            data-active={tab === option.value}
            className={filterChipClass}
            onClick={() => onTabChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--color-text-subtle)]">Period</span>
        {CHARTS_PAGE_RANGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            data-active={range === option.value}
            className={filterChipClass}
            onClick={() => onRangeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {tab === "songs" && genres.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="charts-genre" className="text-xs text-[var(--color-text-subtle)]">
            Genre
          </label>
          <select
            id="charts-genre"
            value={genre ?? ""}
            onChange={(e) => onGenreChange(e.target.value || null)}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[var(--color-brand)]/50"
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
