import { useMemo } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";

import { formatMegabytes } from "./timelineLayout";
import { buildCommunityLibraryRows } from "./theatreFxLibrary";

export const LIBRARY_BATCH_SIZE = 10;

export type LibraryTabId = "images" | "videos" | "community";
export type CommunityKind = "animations" | "videos" | "images";

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
  communityKind?: CommunityKind;
};

type UseSongVisualLibraryItemsArgs = {
  assets: VisualMediaAssetRecord[];
  attachments: SongVisualAttachmentRecord[];
};

export function useSongVisualLibraryItems({ assets, attachments }: UseSongVisualLibraryItemsArgs) {
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

  const community = useMemo(() => buildCommunityLibraryRows(), []);

  return {
    imageRows,
    videoRows,
    communityAnimations: community.animations,
    communityVideos: community.videos,
    communityImages: community.images,
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
