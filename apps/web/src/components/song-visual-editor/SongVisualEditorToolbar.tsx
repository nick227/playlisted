import { ChevronLeft, ChevronRight, Pause, Play, Upload } from "lucide-react";

import type { SongVisualPolicy } from "@/theatre/media/types";
import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";

import { POLICY_OPTIONS } from "./types";

type SongVisualEditorToolbarProps = {
  isPlaying: boolean;
  isBusy: boolean;
  currentTimeSec: number;
  durationSec: number;
  policy: SongVisualPolicy;
  assets: VisualMediaAssetRecord[];
  selectedAttachmentId: string | null;
  onTogglePlayback: () => void;
  onUpload: () => void;
  onAttachExisting: (assetId: string) => void;
  onApplyPolicy: (policy: SongVisualPolicy) => void;
  onReorderSelected: (direction: -1 | 1) => void;
};

export function SongVisualEditorToolbar({
  isPlaying,
  isBusy,
  currentTimeSec,
  durationSec,
  policy,
  assets,
  selectedAttachmentId,
  onTogglePlayback,
  onUpload,
  onAttachExisting,
  onApplyPolicy,
  onReorderSelected,
}: SongVisualEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-y border-white/10 bg-black/20 px-1 py-2">
      <button
        type="button"
        onClick={onTogglePlayback}
        disabled={isBusy || durationSec <= 0}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10 disabled:opacity-40"
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} className="ml-0.5" fill="currentColor" />}
      </button>

      <span className="min-w-[5rem] text-xs tabular-nums text-white/60">
        {formatTime(currentTimeSec)} / {formatTime(durationSec)}
      </span>

      <button
        type="button"
        onClick={onUpload}
        disabled={isBusy}
        className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
      >
        <Upload size={14} />
        Upload
      </button>

      {assets.length > 0 ? (
        <select
          defaultValue=""
          disabled={isBusy}
          onChange={(event) => {
            const assetId = event.target.value;
            if (!assetId) return;
            onAttachExisting(assetId);
            event.currentTarget.value = "";
          }}
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
        >
          <option value="">Attach existing…</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalName} ({asset.mediaType})
            </option>
          ))}
        </select>
      ) : null}

      <select
        value={policy === "defaultOnly" ? "preferAttached" : policy}
        disabled={isBusy}
        onChange={(event) => onApplyPolicy(event.target.value as SongVisualPolicy)}
        className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
      >
        {POLICY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {selectedAttachmentId ? (
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onReorderSelected(-1)}
            className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Move clip earlier"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onReorderSelected(1)}
            className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
            aria-label="Move clip later"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
