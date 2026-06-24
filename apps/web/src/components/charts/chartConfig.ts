import type { ChartRange } from "@playlisted/client-sdk";

export const HOME_CHART_RANGE: ChartRange = "7d";

export const HOME_CHART_RANGE_LABEL: Record<ChartRange, string> = {
  today: "today",
  "7d": "last 7 days",
  "30d": "last 30 days",
  all: "all time",
};

export const HOME_CHART_SONG_SECTION = "top-songs";
export const HOME_CHART_ITEM_LIMIT = 10;
export const HOME_CHART_PLAYLIST_LIMIT = { mobile: 4, desktop: 6 } as const;

export const CHART_PANELS_GRID_CLASS = "mb-10 grid gap-4 lg:grid-cols-3";
