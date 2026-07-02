import { Loader2, MousePointer2, Pause, Play, Scissors, Sparkles, Subtitles, Upload } from "lucide-react";
import type { ReactNode } from "react";

export type TimelineEditMode = "select" | "cut";

const TOOLBAR_CONTROL_HEIGHT = "h-8";

type SongVisualEditorToolbarProps = {
  isBusy: boolean;
  isDirty: boolean;
  isSaving: boolean;
  isPlaying: boolean;
  canPlay: boolean;
  editMode: TimelineEditMode;
  includeSiteMedia: boolean;
  previewSubtitles: boolean;
  hasAttachments: boolean;
  onEditModeChange: (mode: TimelineEditMode) => void;
  onIncludeSiteMediaChange: (includeSiteMedia: boolean) => void;
  onPreviewSubtitlesChange: (enabled: boolean) => void;
  onTogglePlayback: () => void;
  onUpload: () => void;
  onSave: () => void;
  onCancel: () => void;
};

export function SongVisualEditorToolbar({
  isBusy,
  isDirty,
  isSaving,
  isPlaying,
  canPlay,
  editMode,
  includeSiteMedia,
  previewSubtitles,
  hasAttachments,
  onEditModeChange,
  onIncludeSiteMediaChange,
  onPreviewSubtitlesChange,
  onTogglePlayback,
  onUpload,
  onSave,
  onCancel,
}: SongVisualEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <ToolbarButtonGroup>
        <ToolbarIconButton
          active={isPlaying}
          disabled={isBusy || !canPlay}
          label={isPlaying ? "Pause preview" : "Play preview"}
          onClick={onTogglePlayback}
        >
          {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} className="ml-0.5" fill="currentColor" />}
        </ToolbarIconButton>
      </ToolbarButtonGroup>

      <ToolbarDivider />

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

      <ToolbarDivider />

      <ToolbarButtonGroup>
        <ToolbarLabeledToggle
          active={includeSiteMedia}
          disabled={isBusy || !hasAttachments}
          label="site media"
          title={
            hasAttachments
              ? "Built-in site visuals can appear in gaps between your clips"
              : "Add a clip before enabling site media"
          }
          onClick={() => onIncludeSiteMediaChange(!includeSiteMedia)}
        >
          <Sparkles size={13} />
        </ToolbarLabeledToggle>
        <ToolbarLabeledToggle
          active={previewSubtitles}
          disabled={isBusy}
          label="preview subtitles"
          title="Show playback focus lane subtitles in the preview"
          onClick={() => onPreviewSubtitlesChange(!previewSubtitles)}
        >
          <Subtitles size={13} />
        </ToolbarLabeledToggle>
      </ToolbarButtonGroup>

      <ToolbarDivider />

      <button
        type="button"
        disabled={isBusy}
        onClick={onUpload}
        className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 text-[11px] font-semibold text-white/85 transition hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-40`}
      >
        <Upload size={13} />
        Upload
      </button>

      <div className={`ml-auto flex items-center gap-2 ${TOOLBAR_CONTROL_HEIGHT}`}>
        <button
          type="button"
          onClick={onCancel}
          className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} items-center rounded-md border border-white/15 bg-white/5 px-3.5 text-xs font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/10 hover:text-white`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} min-w-[4.5rem] items-center justify-center gap-1 rounded-md bg-emerald-500 px-3.5 text-xs font-bold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-45`}
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return <div className="hidden h-5 w-px shrink-0 bg-white/10 sm:block" />;
}

function ToolbarButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div className={`inline-flex ${TOOLBAR_CONTROL_HEIGHT} items-center gap-0.5 rounded-md border border-white/10 bg-black/25 p-0.5`}>
      {children}
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
      className={toolbarToggleClass(active, disabled, "h-7 w-7 justify-center px-0")}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function ToolbarLabeledToggle({
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
      className={toolbarToggleClass(active, disabled, "h-7 gap-1.5 px-2.5")}
      aria-pressed={active}
      title={title ?? label}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

function toolbarToggleClass(active: boolean, disabled: boolean, sizeClass: string) {
  return [
    `inline-flex items-center rounded-md text-[11px] font-medium transition ${sizeClass}`,
    active
      ? "bg-emerald-500 text-black hover:bg-emerald-400"
      : "text-white/55 hover:bg-white/5 hover:text-white/85",
    disabled ? "cursor-not-allowed opacity-40" : "",
  ].join(" ");
}
