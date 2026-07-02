import { Film, ImageIcon, Plus, Trash2 } from "lucide-react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import { VISUAL_UPLOAD_MAX_BYTES } from "@/lib/visualUploadLimits";

import { formatMegabytes } from "./timelineLayout";
import { resolveAssetUrl } from "./types";

type SongVisualAssetLibraryProps = {
  assets: VisualMediaAssetRecord[];
  attachedAssetIds: ReadonlySet<string>;
  remainingTimelineSec: number;
  isBusy: boolean;
  onAddToTimeline: (assetId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onUpload: () => void;
};

export function SongVisualAssetLibrary({
  assets,
  attachedAssetIds,
  remainingTimelineSec,
  isBusy,
  onAddToTimeline,
  onDeleteAsset,
  onUpload,
}: SongVisualAssetLibraryProps) {
  const timelineFull = remainingTimelineSec < 0.5;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Your media library</h3>
          <p className="text-xs text-white/45">
            Video up to {VISUAL_UPLOAD_MAX_BYTES.video / (1024 * 1024)} MB · Image up to {VISUAL_UPLOAD_MAX_BYTES.image / (1024 * 1024)} MB · Lottie planned at {VISUAL_UPLOAD_MAX_BYTES.lottie / (1024 * 1024)} MB
          </p>
        </div>
        <button
          type="button"
          onClick={onUpload}
          disabled={isBusy}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
        >
          <Plus size={14} />
          Upload
        </button>
      </div>

      {timelineFull ? (
        <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Timeline is full. Shorten a clip, turn off loop stretch, or remove a clip before adding more.
        </p>
      ) : null}

      {assets.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/35">Upload videos or images to build your library.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => {
            const onTimeline = attachedAssetIds.has(asset.id);
            const previewUrl = asset.thumbnailUrl ?? (asset.mediaType === "image" ? asset.url : null);

            return (
              <article
                key={asset.id}
                className="group overflow-hidden rounded-lg border border-white/10 bg-black/30"
              >
                <div className="relative aspect-video bg-black">
                  {previewUrl ? (
                    asset.mediaType === "video" && !asset.thumbnailUrl ? (
                      <video
                        src={resolveAssetUrl(asset.url)}
                        className="h-full w-full object-cover opacity-80"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={resolveAssetUrl(previewUrl)}
                        alt={asset.originalName}
                        className="h-full w-full object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      {asset.mediaType === "video" ? <Film size={20} /> : <ImageIcon size={20} />}
                    </div>
                  )}
                </div>

                <div className="space-y-2 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-white">{asset.originalName}</p>
                    <p className="text-[10px] uppercase tracking-wide text-white/40">
                      {asset.mediaType} · {formatMegabytes(asset.sizeBytes)}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={isBusy || onTimeline || timelineFull}
                      onClick={() => onAddToTimeline(asset.id)}
                      className="flex-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title={
                        onTimeline
                          ? "Already on timeline"
                          : timelineFull
                            ? "Timeline full"
                            : "Add to timeline"
                      }
                    >
                      {onTimeline ? "On timeline" : "Add"}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (window.confirm(`Delete "${asset.originalName}" permanently? This removes the file from your library.`)) {
                          onDeleteAsset(asset.id);
                        }
                      }}
                      className="rounded-md border border-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                      aria-label={`Delete ${asset.originalName}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
