import { Pause, Play, Upload } from "lucide-react";

type SongVisualEditorToolbarProps = {
  isPlaying: boolean;
  isBusy: boolean;
  currentTimeSec: number;
  durationSec: number;
  includeSiteMedia: boolean;
  hasAttachments: boolean;
  onTogglePlayback: () => void;
  onUpload: () => void;
  onIncludeSiteMediaChange: (includeSiteMedia: boolean) => void;
};

export function SongVisualEditorToolbar({
  isPlaying,
  isBusy,
  currentTimeSec,
  durationSec,
  includeSiteMedia,
  hasAttachments,
  onTogglePlayback,
  onUpload,
  onIncludeSiteMediaChange,
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

      <label
        className={[
          "inline-flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white",
          hasAttachments ? "cursor-pointer hover:bg-white/5" : "cursor-not-allowed opacity-40",
        ].join(" ")}
        title={
          hasAttachments
            ? "When enabled, built-in site visuals can appear alongside your attachments"
            : "Add a clip before configuring site media"
        }
      >
        <input
          type="checkbox"
          checked={includeSiteMedia}
          disabled={isBusy || !hasAttachments}
          onChange={(event) => onIncludeSiteMediaChange(event.target.checked)}
          className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-400/50"
        />
        Include site media
      </label>
    </div>
  );
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
