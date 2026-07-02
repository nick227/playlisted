import { MousePointer2, Scissors, Subtitles, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export type TimelineEditMode = "select" | "cut";

type SongVisualEditorToolbarProps = {
  isBusy: boolean;
  currentTimeSec: number;
  durationSec: number;
  editMode: TimelineEditMode;
  includeSiteMedia: boolean;
  previewSubtitles: boolean;
  hasAttachments: boolean;
  onEditModeChange: (mode: TimelineEditMode) => void;
  onIncludeSiteMediaChange: (includeSiteMedia: boolean) => void;
  onPreviewSubtitlesChange: (enabled: boolean) => void;
};

export function SongVisualEditorToolbar({
  isBusy,
  currentTimeSec,
  durationSec,
  editMode,
  includeSiteMedia,
  previewSubtitles,
  hasAttachments,
  onEditModeChange,
  onIncludeSiteMediaChange,
  onPreviewSubtitlesChange,
}: SongVisualEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
      <span className="min-w-[5.5rem] text-xs tabular-nums text-white/60">
        {formatTime(currentTimeSec)} / {formatTime(durationSec)}
      </span>

      <div className="inline-flex rounded-md border border-white/10 p-0.5">
        <ToolbarIconButton
          active={editMode === "select"}
          disabled={isBusy}
          label="Select"
          onClick={() => onEditModeChange("select")}
        >
          <MousePointer2 size={13} />
        </ToolbarIconButton>
        <ToolbarIconButton
          active={editMode === "cut"}
          disabled={isBusy}
          label="Cut"
          onClick={() => onEditModeChange("cut")}
        >
          <Scissors size={13} />
        </ToolbarIconButton>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <ToolbarToggleButton
          active={includeSiteMedia}
          disabled={isBusy || !hasAttachments}
          label="Site media"
          title={
            hasAttachments
              ? "Built-in site visuals can appear in gaps between your clips"
              : "Add a clip before enabling site media"
          }
          onClick={() => onIncludeSiteMediaChange(!includeSiteMedia)}
        >
          <Sparkles size={13} />
        </ToolbarToggleButton>
        <ToolbarToggleButton
          active={previewSubtitles}
          disabled={isBusy}
          label="Subtitles"
          title="Show playback focus lane subtitles in the preview"
          onClick={() => onPreviewSubtitlesChange(!previewSubtitles)}
        >
          <Subtitles size={13} />
        </ToolbarToggleButton>
      </div>
    </div>
  );
}

function ToolbarIconButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
        active ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80",
        disabled ? "opacity-40" : "",
      ].join(" ")}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function ToolbarToggleButton({
  active,
  disabled,
  label,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={[
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium transition",
        active
          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
          : "border-white/10 text-white/55 hover:border-white/20 hover:bg-white/5 hover:text-white/80",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
      aria-pressed={active}
    >
      {children}
      {label}
    </button>
  );
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
