import type { CollectionPlaylistItem, components } from "@playlisted/client-sdk";

import { formatDuration } from "@/lib/format";

export type PlaylistSummary = components["schemas"]["PlaylistSummary"];

export type StudioCollectionListItem = (PlaylistSummary | CollectionPlaylistItem) & {
  listSource: "owned" | "followed";
};

export const TYPE_LABELS: Record<string, string> = {
  PLAYLIST: "Playlist",
  ALBUM: "Album",
  MIX: "Mix",
  PODCAST_CHANNEL: "Podcast",
  RELEASE: "Release",
};

export const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: "bg-emerald-500/15 text-emerald-400",
  DRAFT: "bg-zinc-500/15 text-zinc-400",
  ARCHIVED: "bg-red-500/15 text-red-400",
};

export const VISIBILITY_STYLES: Record<string, string> = {
  PUBLIC: "bg-blue-500/15 text-blue-400",
  UNLISTED: "bg-amber-500/15 text-amber-400",
  PRIVATE: "bg-zinc-500/15 text-zinc-500",
};

export function formatPlaylistDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return formatDuration(seconds);
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function playlistGenreTags(tags: PlaylistSummary["tags"] | undefined) {
  return (tags ?? []).filter((tag) => tag.kind === "GENRE");
}

export type GenreOption = { id: string; name: string; slug: string };

type TagLike = { kind: string; slug: string };

export function recordingGenreSlug(tags: TagLike[] | undefined): string | null {
  return tags?.find((tag) => tag.kind === "GENRE")?.slug ?? null;
}
