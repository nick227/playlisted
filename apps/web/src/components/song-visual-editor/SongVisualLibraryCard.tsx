import { Plus, Trash2 } from "lucide-react";

import { CommunityFxThumb } from "./CommunityFxThumb";
import { MediaAssetThumb } from "./MediaAssetThumb";
import type { VisualLibraryRow } from "./useSongVisualLibraryItems";
import { resolveAssetUrl } from "./types";

type SongVisualLibraryCardProps = {
  row: VisualLibraryRow;
  disabled?: boolean;
  onAction: () => void;
  onDelete?: () => void;
};

export function SongVisualLibraryCard({
  row,
  disabled,
  onAction,
  onDelete,
}: SongVisualLibraryCardProps) {
  const isCommunityFx = Boolean(row.theatrePresetId);

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <div className="aspect-video w-full bg-black/50">
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
      <div className="space-y-1.5 p-2">
        <p className="truncate text-xs font-medium text-white">{row.label}</p>
        <p className="truncate text-[10px] text-white/45">{row.detail}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={onAction}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[10px] font-medium text-white hover:bg-white/10 disabled:opacity-40"
          >
            <Plus size={11} />
            Add
          </button>
          {onDelete ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onDelete}
              className="rounded-md border border-red-500/20 px-1.5 py-1 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
              aria-label={`Delete ${row.label}`}
            >
              <Trash2 size={11} />
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
