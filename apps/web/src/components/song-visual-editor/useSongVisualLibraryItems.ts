import type { AuthUser } from "@playlisted/client-sdk";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { authedApi } from "@/lib/authedApi";
import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";

import { formatMegabytes } from "./timelineLayout";
import type { SongVisualEditorRecording } from "./types";
import { buildTheatreFxCommunityRows } from "./theatreFxLibrary";

export const LIBRARY_BATCH_SIZE = 10;

export type LibraryTabId = "images" | "videos" | "community";
export type CommunityFilter = "all" | "song" | "playlists" | "songs" | "artist" | "uploads" | "theatre";

export type VisualLibraryRow = {
  id: string;
  label: string;
  detail: string;
  thumbUrl: string | null;
  mediaType: "image" | "video";
  rank: number;
  asset?: VisualMediaAssetRecord;
  importUrl?: string;
  theatrePresetId?: string;
  communitySource?: Exclude<CommunityFilter, "all">;
};

type UseSongVisualLibraryItemsArgs = {
  recording: SongVisualEditorRecording;
  assets: VisualMediaAssetRecord[];
  attachments: SongVisualAttachmentRecord[];
  accessToken: string;
  user: AuthUser | null;
};

export function useSongVisualLibraryItems({
  recording,
  assets,
  attachments,
  accessToken,
  user,
}: UseSongVisualLibraryItemsArgs) {
  const client = authedApi(accessToken);
  const ownerId = user?.id ?? null;

  const playlistsQuery = useQuery({
    queryKey: ["song-visual-library-playlists", ownerId],
    queryFn: () => client.playlists.list({ ownerId: ownerId ?? undefined, page: 1, pageSize: 100 }),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
  });

  const recordingsQuery = useQuery({
    queryKey: ["song-visual-library-recordings", ownerId],
    queryFn: () => client.recordings.list({ uploaderId: ownerId ?? undefined, page: 1, pageSize: 100 }),
    enabled: Boolean(ownerId),
    staleTime: 60_000,
  });

  const onSongAssetIds = useMemo(
    () => new Set(attachments.map((attachment) => attachment.mediaAssetId)),
    [attachments],
  );

  const imageRows = useMemo(
    () => buildUploadRows(assets, "image", onSongAssetIds),
    [assets, onSongAssetIds],
  );

  const videoRows = useMemo(
    () => buildUploadRows(assets, "video", onSongAssetIds),
    [assets, onSongAssetIds],
  );

  const communityRows = useMemo(
    () =>
      buildCommunityRows({
        recording,
        assets,
        onSongAssetIds,
        playlists: playlistsQuery.data?.data ?? [],
        recordings: recordingsQuery.data?.data ?? [],
        artistAvatarUrl: user?.avatarUrl ?? recording.artistImageUrl ?? null,
      }),
    [recording, assets, onSongAssetIds, playlistsQuery.data?.data, recordingsQuery.data?.data, user?.avatarUrl],
  );

  return {
    imageRows,
    videoRows,
    communityRows,
    isCommunityLoading: playlistsQuery.isLoading || recordingsQuery.isLoading,
  };
}

function buildUploadRows(
  assets: VisualMediaAssetRecord[],
  mediaType: "image" | "video",
  onSongAssetIds: Set<string>,
): VisualLibraryRow[] {
  return assets
    .filter((asset) => asset.mediaType === mediaType)
    .map((asset) => ({
      id: asset.id,
      label: asset.originalName,
      detail: `${mediaType} · ${formatMegabytes(asset.sizeBytes)}`,
      thumbUrl: asset.thumbnailUrl ?? (asset.mediaType === "image" ? asset.url : null),
      mediaType,
      asset,
      rank: onSongAssetIds.has(asset.id) ? 0 : 1,
    }))
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      const leftCreated = left.asset?.createdAt ?? "";
      const rightCreated = right.asset?.createdAt ?? "";
      return rightCreated.localeCompare(leftCreated);
    });
}

function buildCommunityRows(input: {
  recording: SongVisualEditorRecording;
  assets: VisualMediaAssetRecord[];
  onSongAssetIds: Set<string>;
  playlists: Array<{ id: string; title: string; coverArtUrl?: string | null }>;
  recordings: Array<{ id: string; title: string; artworkUrl?: string | null; publishedPlaylistId: string }>;
  artistAvatarUrl: string | null;
}): VisualLibraryRow[] {
  const rows: VisualLibraryRow[] = [];
  const seenUrls = new Set<string>();

  function pushRow(row: VisualLibraryRow) {
    const key = row.theatrePresetId ?? row.importUrl ?? row.thumbUrl ?? row.id;
    if (!key || seenUrls.has(key)) return;
    seenUrls.add(key);
    rows.push(row);
  }

  if (input.recording.artworkUrl) {
    pushRow({
      id: `community-song-${input.recording.id}`,
      label: input.recording.title,
      detail: "This song artwork",
      thumbUrl: input.recording.artworkUrl,
      mediaType: "image",
      importUrl: input.recording.artworkUrl,
      rank: 0,
      communitySource: "song",
    });
  }

  const currentPlaylist = input.playlists.find((playlist) => playlist.id === input.recording.publishedPlaylistId);
  if (currentPlaylist?.coverArtUrl) {
    pushRow({
      id: `community-playlist-${currentPlaylist.id}`,
      label: currentPlaylist.title,
      detail: "This playlist cover",
      thumbUrl: currentPlaylist.coverArtUrl,
      mediaType: "image",
      importUrl: currentPlaylist.coverArtUrl,
      rank: 1,
      communitySource: "playlists",
    });
  }

  if (input.artistAvatarUrl) {
    pushRow({
      id: `community-artist-${input.recording.ownerUsername ?? "artist"}`,
      label: input.recording.ownerName ?? "Artist avatar",
      detail: "Artist profile image",
      thumbUrl: input.artistAvatarUrl,
      mediaType: "image",
      importUrl: input.artistAvatarUrl,
      rank: 2,
      communitySource: "artist",
    });
  }

  for (const song of input.recordings) {
    if (song.id === input.recording.id || !song.artworkUrl) continue;
    const samePlaylist = song.publishedPlaylistId === input.recording.publishedPlaylistId;
    pushRow({
      id: `community-recording-${song.id}`,
      label: song.title,
      detail: samePlaylist ? "Song on this playlist" : "Your song artwork",
      thumbUrl: song.artworkUrl,
      mediaType: "image",
      importUrl: song.artworkUrl,
      rank: samePlaylist ? 3 : 4,
      communitySource: "songs",
    });
  }

  for (const playlist of input.playlists) {
    if (playlist.id === input.recording.publishedPlaylistId || !playlist.coverArtUrl) continue;
    pushRow({
      id: `community-playlist-${playlist.id}`,
      label: playlist.title,
      detail: "Playlist cover",
      thumbUrl: playlist.coverArtUrl,
      mediaType: "image",
      importUrl: playlist.coverArtUrl,
      rank: 5,
      communitySource: "playlists",
    });
  }

  for (const asset of input.assets) {
    if (asset.mediaType !== "image" || input.onSongAssetIds.has(asset.id)) continue;
    pushRow({
      id: `community-upload-${asset.id}`,
      label: asset.originalName,
      detail: "Your upload",
      thumbUrl: asset.thumbnailUrl ?? asset.url,
      mediaType: "image",
      asset,
      rank: 6,
      communitySource: "uploads",
    });
  }

  for (const theatreRow of buildTheatreFxCommunityRows()) {
    pushRow(theatreRow);
  }

  return rows.sort((left, right) => left.rank - right.rank || left.label.localeCompare(right.label));
}

export function filterCommunityRows(rows: VisualLibraryRow[], filter: CommunityFilter) {
  if (filter === "all") return rows;
  return rows.filter((row) => row.communitySource === filter);
}
