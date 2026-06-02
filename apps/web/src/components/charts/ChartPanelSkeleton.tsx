import { Skeleton } from "@/components/feedback/Skeleton";

import { ChartPanelContainer } from "./ChartPanelContainer";

const PLACEHOLDER_TITLES = ["Top Songs", "Top Playlists", "Top Artists"] as const;

function SkeletonRow() {
  return (
    <li className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-10 w-10 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-10" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </li>
  );
}

export function ChartPanelSkeleton() {
  return (
    <div className="mb-10 grid gap-4 lg:grid-cols-3">
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
