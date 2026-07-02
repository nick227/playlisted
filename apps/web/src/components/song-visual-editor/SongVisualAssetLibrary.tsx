import { Film, ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { useState, type DragEvent } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import { VISUAL_UPLOAD_MAX_BYTES, visualUploadKindForFile } from "@/lib/visualUploadLimits";

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
  onUploadFile: (file: File) => void;
};

export function SongVisualAssetLibrary({
  assets,
  attachedAssetIds,
  remainingTimelineSec,
  isBusy,
  onAddToTimeline,
  onDeleteAsset,
  onUpload,
  onUploadFile,
}: SongVisualAssetLibraryProps) {
  const timelineFull = remainingTimelineSec < 0.5;
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isBusy) return;
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;

    const file = Array.from(event.dataTransfer.files).find((candidate) => visualUploadKindForFile(candidate) != null);
    if (file) onUploadFile(file);
  }

  function handlePanelClick() {
    if (isBusy) return;
    onUpload();
  }

  return (
    <div
      role="button"
      tabIndex={isBusy ? -1 : 0}
      onClick={handlePanelClick}
      onKeyDown={(event) => {
        if (isBusy) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onUpload();
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label="Upload videos or images"
      className={[
        "rounded-xl border bg-black/20 p-3 transition-colors",
        isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-white/20 hover:bg-black/30",
        isDragOver ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10",
      ].join(" ")}
    >
      {timelineFull ? (
        <p
          className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          onClick={(event) => event.stopPropagation()}
        >
          Timeline is full. Shorten a clip, turn off loop stretch, or remove a clip before adding more.
        </p>
      ) : null}

      {assets.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
            {isDragOver ? <Plus size={18} /> : <Upload size={18} />}
          </div>
          <p className="text-sm text-white/60">
            {isDragOver ? "Drop to upload" : "Click or drop videos and images here"}
          </p>
          <p className="text-xs text-white/35">
            Up to {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.video)} video · {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.image)} image
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {assets.map((asset) => {
            const onTimeline = attachedAssetIds.has(asset.id);
            const previewUrl = asset.thumbnailUrl ?? (asset.mediaType === "image" ? asset.url : null);

            return (
              <article
                key={asset.id}
                className="group overflow-hidden rounded-lg border border-white/10 bg-black/30"
                onClick={(event) => event.stopPropagation()}
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
