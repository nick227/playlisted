import type { ChartRange } from "@playlisted/client-sdk";

export type ChartsTab = "songs" | "artists" | "playlists";

export interface ChartsPageState {
  tab: ChartsTab;
  range: ChartRange;
  genre: string | null;
}

const TABS: ChartsTab[] = ["songs", "artists", "playlists"];
const RANGES: ChartRange[] = ["today", "7d", "30d", "all"];

export function parseChartsPageState(params: URLSearchParams): ChartsPageState {
  const rawTab = params.get("tab");
  const tab = TABS.includes(rawTab as ChartsTab) ? (rawTab as ChartsTab) : "songs";

  const rawRange = params.get("range");
  const range = RANGES.includes(rawRange as ChartRange) ? (rawRange as ChartRange) : "30d";

  const genre = params.get("genre")?.trim() || null;

  return { tab, range, genre };
}

export function chartsPageSearchParams(state: ChartsPageState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.tab !== "songs") params.set("tab", state.tab);
  if (state.range !== "30d") params.set("range", state.range);
  if (state.genre) params.set("genre", state.genre);
  return params;
}

export function chartsPageHref(state: ChartsPageState, basePath: string): string {
  const query = chartsPageSearchParams(state).toString();
  return query ? `${basePath}?${query}` : basePath;
}
