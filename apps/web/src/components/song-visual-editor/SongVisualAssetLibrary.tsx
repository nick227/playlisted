import { Plus, Repeat, RotateCcw, Trash2, Upload, AudioLines } from "lucide-react";
import { useState, type DragEvent } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import { VISUAL_UPLOAD_MAX_BYTES } from "@/lib/visualUploadLimits";

import { MediaAssetThumb } from "./MediaAssetThumb";
import { formatMediaOffsetMs, formatMegabytes, readClipStartOffsetMs } from "./timelineLayout";
import type { ClipSyncStatus } from "./hooks/optimisticSongVisualCache";
import type { TimelineClip } from "./types";

type SongVisualAssetLibraryProps = {
  timelineClips: TimelineClip[];
  assets: VisualMediaAssetRecord[];
  isBusy: boolean;
  clipSyncStatus: Record<string, ClipSyncStatus>;
  onClipLoopChange: (attachmentId: string, loop: boolean) => void;
  onClipAudioPulseChange: (attachmentId: string, enabled: boolean) => void;
  readClipAudioPulse: (attachment: TimelineClip["attachment"]) => boolean;
  onResetClipTrim: (attachmentId: string) => void;
  onAddToTimeline: (assetId: string) => void;
  onRemoveClip: (attachmentId: string) => void;
  onSelectClip: (attachmentId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onUpload: () => void;
  onUploadFile: (file: File) => void;
  selectedAttachmentId: string | null;
};

export function SongVisualAssetLibrary({
  timelineClips,
  assets,
  isBusy,
  clipSyncStatus,
  onClipLoopChange,
  onClipAudioPulseChange,
  readClipAudioPulse,
  onResetClipTrim,
  onAddToTimeline,
  onRemoveClip,
  onSelectClip,
  onDeleteAsset,
  onUpload,
  onUploadFile,
  selectedAttachmentId,
}: SongVisualAssetLibraryProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;
    const file = Array.from(event.dataTransfer.files).find(
      (candidate) => candidate.type.startsWith("video/") || candidate.type.startsWith("image/"),
    );
    if (file) onUploadFile(file);
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-white/40">Active</h3>
        {timelineClips.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-white/35">
            Add clips from the library below or upload new media.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[...timelineClips].sort((left, right) => left.startSec - right.startSec).map((clip) => {
              const { attachment } = clip;
              const selected = attachment.id === selectedAttachmentId;
              const startOffsetMs = readClipStartOffsetMs(attachment);
              const clipSaving = clipSyncStatus[attachment.id] === "saving";
              const audioPulse = readClipAudioPulse(attachment);
              return (
                <article
                  key={attachment.id}
                  className={[
                    "overflow-hidden rounded-lg border bg-black/30",
                    selected ? "border-emerald-400/50" : "border-white/10",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectClip(attachment.id)}
                    className="block w-full text-left"
                  >
                    <MediaAssetThumb asset={attachment.mediaAsset} className="aspect-video w-full" />
                  </button>
                  <div className="space-y-2 p-2">
                    <p className="truncate text-xs font-medium text-white">
                      {attachment.label ?? attachment.mediaAsset.originalName}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {clip.startSec.toFixed(1)}s · {clip.durationSec.toFixed(1)}s
                    </p>
                    <p className={[
                      "text-[10px]",
                      selected ? "text-amber-200/90" : "text-white/35",
                    ].join(" ")}>
                      Cut-in: {formatMediaOffsetMs(startOffsetMs)}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      <label className="inline-flex flex-1 min-w-[4.5rem] items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/80">
                        <input
                          type="checkbox"
                          checked={clip.loop}
                          disabled={isBusy || clipSaving}
                          onChange={(event) => onClipLoopChange(attachment.id, event.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-emerald-500"
                        />
                        <Repeat size={10} />
                        Loop
                      </label>
                      <label
                        className="inline-flex flex-1 min-w-[4.5rem] items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/80"
                        title="Scale and brighten clip on beats"
                      >
                        <input
                          type="checkbox"
                          checked={audioPulse}
                          disabled={isBusy || clipSaving}
                          onChange={(event) => onClipAudioPulseChange(attachment.id, event.target.checked)}
                          className="rounded border-white/20 bg-black/40 text-emerald-500"
                        />
                        <AudioLines size={10} />
                        Pulse
                      </label>
                      {startOffsetMs > 0 ? (
                        <button
                          type="button"
                          disabled={isBusy || clipSaving}
                          onClick={() => onResetClipTrim(attachment.id)}
                          className="rounded-md border border-amber-400/20 px-2 py-1 text-amber-100 hover:bg-amber-400/10 disabled:opacity-40"
                          aria-label="Reset media cut-in"
                          title="Reset cut-in to media start"
                        >
                          <RotateCcw size={12} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onRemoveClip(attachment.id)}
                        className="rounded-md border border-red-500/20 px-2 py-1 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                        aria-label="Remove clip from timeline"
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
      </section>

      <section
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={[
          "rounded-xl border bg-black/20 p-3 transition-colors",
          isDragOver ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs uppercase tracking-wide text-white/40">Library</h3>
          <button
            type="button"
            disabled={isBusy}
            onClick={onUpload}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10 disabled:opacity-40"
          >
            <Upload size={12} />
            Upload
          </button>
        </div>

        {assets.length === 0 ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={onUpload}
            className="flex w-full flex-col items-center gap-2 py-8 text-center disabled:opacity-40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
              {isDragOver ? <Plus size={18} /> : <Upload size={18} />}
            </div>
            <p className="text-sm text-white/60">Click or drop videos and images here</p>
            <p className="text-xs text-white/35">
              Up to {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.video)} video · {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.image)} image
            </p>
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {assets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                <MediaAssetThumb asset={asset} className="aspect-video w-full" />
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
                      disabled={isBusy}
                      onClick={() => onAddToTimeline(asset.id)}
                      className="flex-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/10 disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (window.confirm(`Delete "${asset.originalName}" permanently?`)) {
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
