import { useMemo } from "react";

import type { PendingVisualUpload, VisualMediaAssetRecord, UserLibraryImageRecord } from "@/lib/visualMediaApi";
import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { VisualUploadProgress } from "@/lib/visualUploadProgress";
import { normalizeVisualMediaUrl, visualMediaUploadPathKey } from "@/lib/visualMediaUrl";

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
  thumbUrls?: string[];
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
  userLibraryImages: UserLibraryImageRecord[];
  attachments: SongVisualAttachmentRecord[];
  pendingUpload?: PendingVisualUpload | null;
  uploadProgress?: VisualUploadProgress | null;
};

function collectKnownImageKeys(assets: VisualMediaAssetRecord[]): Set<string> {
  const keys = new Set<string>();
  for (const asset of assets) {
    if (asset.mediaType !== "image") continue;
    keys.add(normalizeVisualMediaUrl(asset.url));
    const urlKey = visualMediaUploadPathKey(asset.url);
    if (urlKey) keys.add(urlKey);
    if (asset.thumbnailUrl) {
      keys.add(normalizeVisualMediaUrl(asset.thumbnailUrl));
      const thumbKey = visualMediaUploadPathKey(asset.thumbnailUrl);
      if (thumbKey) keys.add(thumbKey);
    }
  }
  return keys;
}

function libraryImageIsKnown(image: UserLibraryImageRecord, knownImageKeys: Set<string>): boolean {
  const normalized = normalizeVisualMediaUrl(image.url);
  if (knownImageKeys.has(normalized)) return true;
  const pathKey = visualMediaUploadPathKey(image.url);
  return pathKey != null && knownImageKeys.has(pathKey);
}

function sourceDetail(source: UserLibraryImageRecord["source"]): string {
  if (source === "avatar") return "Profile · Avatar";
  if (source === "hero") return "Profile · Hero";
  if (source === "playlist") return "Playlist cover";
  return "Track artwork";
}

export function useSongVisualLibraryItems({
  assets,
  userLibraryImages,
  attachments,
  pendingUpload,
  uploadProgress,
}: UseSongVisualLibraryItemsArgs) {
  const onSongAssetIds = useMemo(
    () => new Set(attachments.map((attachment) => attachment.mediaAssetId)),
    [attachments],
  );

  const knownImageKeys = useMemo(() => collectKnownImageKeys(assets), [assets]);

  const importedImageRows = useMemo(
    () => buildImportedImageRows(userLibraryImages, knownImageKeys),
    [userLibraryImages, knownImageKeys],
  );

  const imageRows = useMemo(
    () =>
      mergeImageRows(
        buildUploadRows(assets, "image", onSongAssetIds, pendingUpload, uploadProgress),
        importedImageRows,
      ),
    [assets, onSongAssetIds, pendingUpload, uploadProgress, importedImageRows],
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

function buildImportedImageRows(
  userLibraryImages: UserLibraryImageRecord[],
  knownImageKeys: Set<string>,
): VisualLibraryRow[] {
  return userLibraryImages
    .filter((image) => !libraryImageIsKnown(image, knownImageKeys))
    .map((image) => ({
      id: `import-${image.url}`,
      label: image.label,
      detail: sourceDetail(image.source),
      thumbUrl: image.url,
      importUrl: image.url,
      mediaType: "image" as const,
      rank: 2,
    }));
}

function mergeImageRows(uploadRows: VisualLibraryRow[], importedRows: VisualLibraryRow[]): VisualLibraryRow[] {
  return [...uploadRows, ...importedRows].sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank;
    const leftCreated = left.asset?.createdAt ?? "";
    const rightCreated = right.asset?.createdAt ?? "";
    return rightCreated.localeCompare(leftCreated);
  });
}
