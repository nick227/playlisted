import type { PlaylistSummary } from "@playlisted/client-sdk";

import { api } from "@/lib/api";

import type { UpNextSegment } from "./types";

function pickPlaylist(
  candidates: PlaylistSummary[],
  playedIds: Set<string>,
  excludeId?: string,
): PlaylistSummary | null {
  for (const pl of candidates) {
    if (pl.id === excludeId) continue;
    if (playedIds.has(pl.id)) continue;
    if (pl.status !== "PUBLISHED") continue;
    if (pl.visibility !== "PUBLIC") continue;
    return pl;
  }
  return null;
}

function segmentFromPlaylist(pl: PlaylistSummary, label: string): UpNextSegment {
  return {
    id: crypto.randomUUID(),
    kind: "playlist",
    label,
    playlistId: pl.id,
    ownerUsername: pl.owner.username,
    slug: pl.slug,
    source: "autopilot",
  };
}

async function relatedPlaylist(
  seedPlaylistId: string | undefined,
  playedIds: Set<string>,
): Promise<UpNextSegment | null> {
  if (!seedPlaylistId) return null;
  const seed = await api.playlists.getById(seedPlaylistId);
  if (seed.status !== "PUBLISHED") return null;

  const siblings = await api.playlists.list({
    ownerId: seed.ownerId,
    status: "PUBLISHED",
    visibility: "PUBLIC",
    pageSize: 30,
  });
  const pick = pickPlaylist(siblings.data, playedIds, seedPlaylistId);
  return pick ? segmentFromPlaylist(pick, pick.title) : null;
}

async function chartsPlaylist(playedIds: Set<string>): Promise<UpNextSegment | null> {
  const charts = await api.charts.topPlaylists({ limit: 20 });
  for (const item of charts.data) {
    if (playedIds.has(item.playlistId)) continue;
    return {
      id: crypto.randomUUID(),
      kind: "playlist",
      label: `Charts · ${item.title}`,
      playlistId: item.playlistId,
      ownerUsername: item.owner.username,
      slug: item.slug,
      source: "autopilot",
    };
  }
  return null;
}

async function homepagePlaylist(playedIds: Set<string>): Promise<UpNextSegment | null> {
  const home = await api.homepage.get();
  for (const section of home.sections) {
    for (const item of section.items) {
      if (item.targetType !== "PLAYLIST") continue;
      if (playedIds.has(item.id)) continue;
      return {
        id: crypto.randomUUID(),
        kind: "playlist",
        label: item.title,
        playlistId: item.id,
        source: "autopilot",
      };
    }
  }
  return null;
}

export async function resolveAutopilotSegment(
  resolver: Extract<UpNextSegment, { kind: "autopilot" }>,
  playedIds: Set<string>,
): Promise<UpNextSegment | null> {
  if (resolver.resolver === "continue") {
    return (
      (await relatedPlaylist(resolver.seedPlaylistId, playedIds)) ??
      (await chartsPlaylist(playedIds)) ??
      (await homepagePlaylist(playedIds))
    );
  }
  if (resolver.resolver === "charts") {
    return (await chartsPlaylist(playedIds)) ?? (await homepagePlaylist(playedIds));
  }
  return (await homepagePlaylist(playedIds)) ?? (await chartsPlaylist(playedIds));
}

export async function hydratePlaylistSegment(
  segment: Extract<UpNextSegment, { kind: "playlist" }>,
) {
  const detail = await api.playlists.getById(segment.playlistId);
  if (detail.status !== "PUBLISHED") return null;
  if (detail.visibility === "PRIVATE") return null;
  return detail;
}
