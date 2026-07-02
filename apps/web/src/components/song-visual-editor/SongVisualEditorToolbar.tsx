import { Pause, Play } from "lucide-react";

type SongVisualEditorToolbarProps = {
  isPlaying: boolean;
  isBusy: boolean;
  currentTimeSec: number;
  durationSec: number;
  includeSiteMedia: boolean;
  previewSubtitles: boolean;
  hasAttachments: boolean;
  onTogglePlayback: () => void;
  onUpload: () => void;
  onIncludeSiteMediaChange: (includeSiteMedia: boolean) => void;
  onPreviewSubtitlesChange: (enabled: boolean) => void;
};

export function SongVisualEditorToolbar({
  isPlaying,
  isBusy,
  currentTimeSec,
  durationSec,
  includeSiteMedia,
  previewSubtitles,
  hasAttachments,
  onTogglePlayback,
  onUpload: _onUpload,
  onIncludeSiteMediaChange,
  onPreviewSubtitlesChange,
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

      <label
        className={[
          "inline-flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white",
          hasAttachments ? "cursor-pointer hover:bg-white/5" : "cursor-not-allowed opacity-40",
        ].join(" ")}
        title={
          hasAttachments
            ? "When enabled, built-in site visuals can appear in gaps between your clips"
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

      <label
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white hover:bg-white/5"
        title="Show playback focus lane subtitles in the preview, matching site playback UX"
      >
        <input
          type="checkbox"
          checked={previewSubtitles}
          disabled={isBusy}
          onChange={(event) => onPreviewSubtitlesChange(event.target.checked)}
          className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-400/50"
        />
        Preview subtitles
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
