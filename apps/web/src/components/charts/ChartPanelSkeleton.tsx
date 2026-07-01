import { Skeleton } from "@/components/feedback/Skeleton";

import { CHART_PANELS_GRID_CLASS } from "./chartConfig";
import { ChartPanelContainer } from "./ChartPanelContainer";

const PLACEHOLDER_TITLES = ["Top Songs", "Top Playlists", "Top Artists"] as const;

export function SkeletonRow() {
  return (
    <li className="flex items-center gap-2 px-3 py-2.5 sm:gap-3">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    </li>
  );
}

export function ChartPanelSkeleton() {
  return (
    <div className={CHART_PANELS_GRID_CLASS}>
      {PLACEHOLDER_TITLES.map((title) => (
        <ChartPanelContainer key={title} title={title}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </ChartPanelContainer>
      ))}
    </div>
  );
}
