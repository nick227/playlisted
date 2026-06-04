import {
  HOME_CHART_ITEM_LIMIT,
  HOME_CHART_PLAYLIST_LIMIT,
} from "@/components/charts/chartConfig";

/** Rows already shown in HomeChartsSection (desktop playlist cap). */
export const HOME_BENTO_CHART_SKIP = {
  songs: HOME_CHART_ITEM_LIMIT,
  playlists: HOME_CHART_PLAYLIST_LIMIT.desktop,
  artists: HOME_CHART_ITEM_LIMIT,
} as const;

export type HomeBentoExcludeIds = {
  recordingIds?: Iterable<string>;
  playlistIds?: Iterable<string>;
  userIds?: Iterable<string>;
};

function toSet(ids?: Iterable<string>): Set<string> {
  if (!ids) return new Set();
  return new Set(ids);
}

/** Take items after skip, drop excluded ids, backfill from earlier ranks if needed. */
export function pickBentoChartPool<T>(
  items: T[],
  limit: number,
  skip: number,
  getId: (item: T) => string,
  exclude?: Set<string>,
): T[] {
  if (limit <= 0) return [];

  const blocked = exclude ?? new Set<string>();
  const picked: T[] = [];

  const consider = (pool: T[]) => {
    for (const item of pool) {
      const id = getId(item);
      if (blocked.has(id)) continue;
      blocked.add(id);
      picked.push(item);
      if (picked.length >= limit) return true;
    }
    return false;
  };

  if (!consider(items.slice(skip))) consider(items);
  return picked;
}

export function pickBentoSongs<T extends { recordingId: string }>(
  items: T[],
  limit: number,
  options?: { skipChartOverlap?: boolean; exclude?: HomeBentoExcludeIds },
): T[] {
  const skip = options?.skipChartOverlap ? HOME_BENTO_CHART_SKIP.songs : 0;
  return pickBentoChartPool(
    items,
    limit,
    skip,
    (item) => item.recordingId,
    toSet(options?.exclude?.recordingIds),
  );
}

export function pickBentoPlaylists<T extends { playlistId: string }>(
  items: T[],
  limit: number,
  options?: { skipChartOverlap?: boolean; exclude?: HomeBentoExcludeIds },
): T[] {
  const skip = options?.skipChartOverlap ? HOME_BENTO_CHART_SKIP.playlists : 0;
  return pickBentoChartPool(
    items,
    limit,
    skip,
    (item) => item.playlistId,
    toSet(options?.exclude?.playlistIds),
  );
}

export function pickBentoArtists<T extends { userId: string }>(
  items: T[],
  limit: number,
  options?: { skipChartOverlap?: boolean; exclude?: HomeBentoExcludeIds },
): T[] {
  const skip = options?.skipChartOverlap ? HOME_BENTO_CHART_SKIP.artists : 0;
  return pickBentoChartPool(
    items,
    limit,
    skip,
    (item) => item.userId,
    toSet(options?.exclude?.userIds),
  );
}

export function bentoChartFetchSize(
  displayLimit: number,
  skipChartOverlap: boolean,
  kind: keyof typeof HOME_BENTO_CHART_SKIP,
): number {
  const skip = skipChartOverlap ? HOME_BENTO_CHART_SKIP[kind] : 0;
  return Math.max(displayLimit + skip, 1);
}
