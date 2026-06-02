import { Skeleton } from "@/components/feedback/Skeleton";

import { CHART_PANELS_GRID_CLASS } from "./chartConfig";
import { ChartPanelContainer } from "./ChartPanelContainer";

const PLACEHOLDER_TITLES = ["Top Songs", "Top Playlists", "Top Artists"] as const;

function SkeletonRow() {
  return (
    <li className="grid grid-cols-[auto_auto_auto_1fr_auto] items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 w-8" />
      <Skeleton className="h-10 w-10 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="flex items-center gap-2">
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
