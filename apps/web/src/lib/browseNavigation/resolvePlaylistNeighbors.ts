import type { PlaylistDetail, PlaylistSummary, TopPlaylistItem } from "@playlisted/client-sdk";

import { api } from "@/lib/api";
import { playlistPath } from "@/lib/routes";

import { sortPublishedPlaylists } from "./sortPlaylists";
import type { BrowseNeighbor, BrowseNeighborsResult } from "./types";

function playlistNeighbor(pl: PlaylistSummary): BrowseNeighbor {
  return {
    kind: "playlist",
    label: pl.title,
    href: playlistPath({
      id: pl.id,
      href: pl.href,
      username: pl.owner.username,
      slug: pl.slug,
    }),
    playlistId: pl.id,
    username: pl.owner.username,
    slug: pl.slug,
  };
}

function chartPlaylistNeighbor(item: TopPlaylistItem): BrowseNeighbor {
  return {
    kind: "playlist",
    label: item.title,
    href: playlistPath({
      id: item.playlistId,
      username: item.owner.username,
      slug: item.slug,
    }),
    playlistId: item.playlistId,
    username: item.owner.username,
    slug: item.slug,
  };
}

async function fallbackPlaylistNeighbors(excludeId: string): Promise<BrowseNeighbor[]> {
  const charts = await api.charts.topPlaylists({ limit: 30 });
  const fromCharts = charts.data
    .filter((item) => item.playlistId !== excludeId)
    .map(chartPlaylistNeighbor);
  if (fromCharts.length > 0) return fromCharts;

  const home = await api.homepage.get();
  const fromHome: BrowseNeighbor[] = [];
  for (const section of home.sections) {
    for (const item of section.items) {
      if (item.targetType !== "PLAYLIST" || item.id === excludeId) continue;
      fromHome.push({
        kind: "playlist",
        label: item.title,
        href: item.href,
        playlistId: item.id,
        username: "",
        slug: "",
      });
    }
  }
  return fromHome;
}

export async function resolvePlaylistBrowseSequence(
  playlist: PlaylistDetail,
): Promise<BrowseNeighborsResult> {
  const siblings = await api.playlists.list({
    ownerId: playlist.ownerId,
    status: "PUBLISHED",
    visibility: "PUBLIC",
    pageSize: 50,
  });
  const published = siblings.data.filter(
    (pl) => pl.status === "PUBLISHED" && pl.visibility === "PUBLIC",
  );

  const items =
    published.length > 1
      ? sortPublishedPlaylists(published).map(playlistNeighbor)
      : await fallbackPlaylistNeighbors(playlist.id);

  const currentIndex = items.findIndex(
    (item) => item.kind === "playlist" && item.playlistId === playlist.id,
  );

  return { items, currentIndex };
}
