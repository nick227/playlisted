type SongVisualEditorToolbarProps = {
  isBusy: boolean;
  currentTimeSec: number;
  durationSec: number;
  includeSiteMedia: boolean;
  previewSubtitles: boolean;
  hasAttachments: boolean;
  onIncludeSiteMediaChange: (includeSiteMedia: boolean) => void;
  onPreviewSubtitlesChange: (enabled: boolean) => void;
};

export function SongVisualEditorToolbar({
  isBusy,
  currentTimeSec,
  durationSec,
  includeSiteMedia,
  previewSubtitles,
  hasAttachments,
  onIncludeSiteMediaChange,
  onPreviewSubtitlesChange,
}: SongVisualEditorToolbarProps) {
  return (
    <div className="flex whitespace-nowrap items-center gap-2 border-y border-white/10 bg-black/20 px-1 py-2">
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
        site media
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
        preview subtitles
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
