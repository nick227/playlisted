import { Loader2, MousePointer2, Scissors, Sparkles, Subtitles } from "lucide-react";
import type { ReactNode } from "react";

export type TimelineEditMode = "select" | "cut";

const TOOLBAR_CONTROL_HEIGHT = "h-8";

type SongVisualEditorToolbarProps = {
  isBusy: boolean;
  isDirty: boolean;
  isSaving: boolean;
  currentTimeSec: number;
  durationSec: number;
  editMode: TimelineEditMode;
  includeSiteMedia: boolean;
  previewSubtitles: boolean;
  hasAttachments: boolean;
  onEditModeChange: (mode: TimelineEditMode) => void;
  onIncludeSiteMediaChange: (includeSiteMedia: boolean) => void;
  onPreviewSubtitlesChange: (enabled: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function SongVisualEditorToolbar({
  isBusy,
  isDirty,
  isSaving,
  currentTimeSec,
  durationSec,
  editMode,
  includeSiteMedia,
  previewSubtitles,
  hasAttachments,
  onEditModeChange,
  onIncludeSiteMediaChange,
  onPreviewSubtitlesChange,
  onSave,
  onCancel,
}: SongVisualEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
      <span className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} min-w-[5.5rem] items-center text-xs tabular-nums text-white/60`}>
        {formatTime(currentTimeSec)} / {formatTime(durationSec)}
      </span>

      <ToolbarButtonGroup>
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
      </ToolbarButtonGroup>

      <ToolbarButtonGroup>
        <ToolbarIconButton
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
        </ToolbarIconButton>
        <ToolbarIconButton
          active={previewSubtitles}
          disabled={isBusy}
          label="Subtitles"
          title="Show playback focus lane subtitles in the preview"
          onClick={() => onPreviewSubtitlesChange(!previewSubtitles)}
        >
          <Subtitles size={13} />
        </ToolbarIconButton>
      </ToolbarButtonGroup>

      <div className={`ml-auto flex items-center gap-1.5 ${TOOLBAR_CONTROL_HEIGHT}`}>
        <button
          type="button"
          onClick={onCancel}
          className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} items-center rounded-md border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10 hover:text-white`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} min-w-[4.5rem] items-center justify-center gap-1 rounded-md bg-emerald-500 px-3 text-xs font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function ToolbarButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} items-center rounded-md border border-white/10 p-0.5`}>
      {children}
    </div>
  );
}

function ToolbarIconButton({
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
  title?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        `inline-flex h-7 w-7 items-center justify-center rounded-md transition`,
        active ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80",
        disabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
      aria-pressed={active}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </button>
  );
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
