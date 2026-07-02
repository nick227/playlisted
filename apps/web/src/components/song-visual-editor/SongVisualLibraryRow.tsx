import { Plus, Trash2 } from "lucide-react";

import { CommunityFxThumb } from "./CommunityFxThumb";
import type { VisualLibraryRow } from "./useSongVisualLibraryItems";
import { MediaAssetThumb } from "./MediaAssetThumb";
import { resolveAssetUrl } from "./types";

type SongVisualLibraryRowProps = {
  row: VisualLibraryRow;
  disabled?: boolean;
  actionLabel?: string;
  onAction: () => void;
  onDelete?: () => void;
};

export function SongVisualLibraryRow({
  row,
  disabled,
  actionLabel = "Add",
  onAction,
  onDelete,
}: SongVisualLibraryRowProps) {
  const isCommunityFx = Boolean(row.theatrePresetId);
  const thumbFrameClass = isCommunityFx
    ? row.communityKind === "videos"
      ? "h-16 w-[4.75rem]"
      : "h-16 w-16"
    : "h-14 w-14";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-2.5 py-2">
      <div className={`${thumbFrameClass} shrink-0 overflow-hidden rounded-md bg-black/50`}>
        {isCommunityFx ? (
          <CommunityFxThumb row={row} className="h-full w-full" />
        ) : row.thumbUrl ? (
          <img src={resolveAssetUrl(row.thumbUrl)} alt="" className="h-full w-full object-cover" />
        ) : row.asset ? (
          <MediaAssetThumb asset={row.asset} className="h-full w-full" />
        ) : row.importUrl && row.mediaType === "video" ? (
          <CommunityFxThumb row={{ ...row, thumbUrl: row.importUrl, communityKind: "videos" }} className="h-full w-full" />
        ) : (
          <MediaAssetThumb
            asset={{
              id: row.id,
              ownerId: "",
              mediaType: row.mediaType,
              url: row.importUrl ?? "",
              thumbnailUrl: row.thumbUrl,
              originalName: row.label,
              mimeType: row.mediaType === "video" ? "video/mp4" : "image/jpeg",
              sizeBytes: 0,
              durationMs: null,
              width: null,
              height: null,
              createdAt: "",
            }}
            className="h-full w-full"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{row.label}</p>
        <p className="truncate text-xs text-white/45">{row.detail}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={onAction}
          className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-40"
        >
          <Plus size={12} />
          {actionLabel}
        </button>
        {onDelete ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onDelete}
            className="rounded-md border border-red-500/20 p-1 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
            aria-label={`Delete ${row.label}`}
          >
            <Trash2 size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
