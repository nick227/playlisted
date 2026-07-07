import { api } from "@/lib/api";
import { profilePath } from "@/lib/routes";

import type { BrowseNeighborsResult } from "./types";

export async function resolveArtistBrowseSequence(
  userId: string,
): Promise<BrowseNeighborsResult> {
  const charts = await api.charts.topArtists({ limit: 50 });
  const items = charts.data.map((item) => ({
    kind: "artist" as const,
    label: item.displayName,
    href: profilePath(item.username),
    userId: item.userId,
    username: item.username,
  }));

  const currentIndex = items.findIndex((item) => item.userId === userId);
  return { items, currentIndex };
}
