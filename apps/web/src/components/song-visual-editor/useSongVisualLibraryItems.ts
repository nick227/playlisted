import { useMemo } from "react";

import type { PendingVisualUpload, VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { VisualUploadProgress } from "@/lib/visualUploadProgress";

import { formatMegabytes } from "./timelineLayout";
import { buildCommunityLibraryRows } from "./theatreFxLibrary";

export const LIBRARY_BATCH_SIZE = 10;

export type LibraryTabId = "mine" | "community";
export type MineMediaKind = "image" | "video";
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
  pending?: boolean;
  uploadProgress?: VisualUploadProgress | null;
};

type UseSongVisualLibraryItemsArgs = {
  assets: VisualMediaAssetRecord[];
  attachments: SongVisualAttachmentRecord[];
  pendingUpload?: PendingVisualUpload | null;
  uploadProgress?: VisualUploadProgress | null;
};

export function useSongVisualLibraryItems({
  assets,
  attachments,
  pendingUpload,
  uploadProgress,
}: UseSongVisualLibraryItemsArgs) {
  const onSongAssetIds = useMemo(
    () => new Set(attachments.map((attachment) => attachment.mediaAssetId)),
    [attachments],
  );

  const imageRows = useMemo(
    () => buildUploadRows(assets, "image", onSongAssetIds, pendingUpload, uploadProgress),
    [assets, onSongAssetIds, pendingUpload, uploadProgress],
  );

  const videoRows = useMemo(
    () => buildUploadRows(assets, "video", onSongAssetIds, pendingUpload, uploadProgress),
    [assets, onSongAssetIds, pendingUpload, uploadProgress],
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
  pendingUpload?: PendingVisualUpload | null,
  uploadProgress?: VisualUploadProgress | null,
): VisualLibraryRow[] {
  const rows: VisualLibraryRow[] = assets
    .filter((asset) => asset.mediaType === mediaType)
    .map((asset) => ({
      id: asset.id,
      label: asset.originalName,
      detail: `${mediaType} · ${formatMegabytes(asset.sizeBytes)}`,
      thumbUrl: asset.thumbnailUrl ?? (asset.mediaType === "image" ? asset.url : null),
      mediaType,
      asset,
      rank: onSongAssetIds.has(asset.id) ? 0 : 1,
    }));

  if (pendingUpload?.mediaType === mediaType) {
    rows.unshift({
      id: pendingUpload.id,
      label: pendingUpload.fileName,
      detail: `Uploading · ${formatMegabytes(pendingUpload.sizeBytes)}`,
      thumbUrl: pendingUpload.previewUrl,
      mediaType,
      rank: -1,
      pending: true,
      uploadProgress: uploadProgress ?? null,
    });
  }

  return rows.sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank;
    const leftCreated = left.asset?.createdAt ?? "";
    const rightCreated = right.asset?.createdAt ?? "";
    return rightCreated.localeCompare(leftCreated);
  });
}
