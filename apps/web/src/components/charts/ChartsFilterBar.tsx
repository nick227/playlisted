import type { ChartRange } from "@playlisted/client-sdk";

import { CHARTS_PAGE_RANGE_OPTIONS } from "./chartConfig";

const filterChipClass =
  "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white/90 data-[active=true]:border-[var(--color-brand)]/50 data-[active=true]:bg-[var(--color-brand)]/15 data-[active=true]:text-white";

interface ChartsFilterBarProps {
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
}

export function ChartsFilterBar({ range, onRangeChange }: ChartsFilterBarProps) {
  return (
    <div className="border-b border-[var(--color-border)] px-4 py-3">
      <div className="mt-3 flex flex-wrap items-center gap-2">
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
    </div>
  );
}
