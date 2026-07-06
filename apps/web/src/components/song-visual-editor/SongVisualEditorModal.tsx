import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useSuppressPlaybackFocus } from "@/lib/playbackFocusSuppression";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

import { ActiveMediaPanel } from "./ActiveMediaPanel";
import { SongVisualAssetLibrary } from "./SongVisualAssetLibrary";
import { SongVisualEditorPreview } from "./SongVisualEditorPreview";
import { SongVisualEditorTimeline } from "./SongVisualEditorTimeline";
import { SongVisualEditorToolbar, type TimelineEditMode } from "./SongVisualEditorToolbar";
import { useAudioWaveformPeaks } from "./hooks/useAudioWaveformPeaks";
import { useSongVisualEditorHotkeys } from "./hooks/useSongVisualEditorHotkeys";
import { useSongVisualEditorState } from "./hooks/useSongVisualEditorState";
import { useSongVisualPreviewPlayback } from "./hooks/useSongVisualPreviewPlayback";
import { findClipAtTime, type SongVisualEditorRecording } from "./types";

type SongVisualEditorModalProps = {
  recording: SongVisualEditorRecording;
  onClose: () => void;
};

export function SongVisualEditorModal({ recording, onClose }: SongVisualEditorModalProps) {
  useSuppressPlaybackFocus();
  const { accessToken } = useAuth();

  if (!accessToken) {
    return null;
  }

  return (
    <SongVisualEditorModalInner
      recording={recording}
      onClose={onClose}
      accessToken={accessToken}
    />
  );
}

type SongVisualEditorModalInnerProps = {
  recording: SongVisualEditorRecording;
  onClose: () => void;
  accessToken: string;
};

function SongVisualEditorModalInner({
  recording,
  onClose,
  accessToken,
}: SongVisualEditorModalInnerProps) {
  const { releasePlayback } = useAudioPlayer();
  const { pauseRadio } = useRadioPlayer();
  const playback = useSongVisualPreviewPlayback(recording.audioUrl);
  const [editMode, setEditMode] = useState<TimelineEditMode>("select");
  const [showOverlays, setShowOverlays] = useState(false);
  const { data: waveform, loading: waveformLoading, error: waveformError } = useAudioWaveformPeaks(recording.audioUrl);

  // Single source of truth for song duration: the editor state must resolve clip
  // bounds against the same duration the timeline renders with, otherwise drag
  // previews and commits disagree and moves silently snap back.
  const editor = useSongVisualEditorState({
    recordingId: recording.id,
    accessToken,
    durationSeconds: waveform?.durationSec || playback.durationSec || recording.durationSeconds,
  });

  const durationSec = editor.timelineDurationSec;
  const activeClip = useMemo(
    () => findClipAtTime(editor.timelineClips, playback.currentTimeSec),
    [editor.timelineClips, playback.currentTimeSec],
  );

  useEffect(() => {
    releasePlayback();
    pauseRadio();
  }, [pauseRadio, releasePlayback]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useSongVisualEditorHotkeys({
    timelineClips: editor.timelineClips,
    copySelectedClip: editor.copySelectedClip,
    pasteClipAt: editor.pasteClipAt,
    detachAttachment: editor.detachAttachment,
    selectedAttachmentId: editor.selectedAttachmentId,
    isBusy: editor.isBusy,
    currentTimeSec: playback.currentTimeSec,
    togglePlayback: playback.togglePlayback,
    durationSec,
  });

  function handleClose() {
    if (editor.isDirty && !window.confirm("Discard unsaved visual changes?")) return;
    onClose();
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm md:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="flex h-full max-h-screen w-full max-w-5xl flex-col overflow-hidden border border-white/10 bg-[var(--color-canvas)] shadow-2xl md:rounded-2xl">
        <header className="relative flex shrink-0 items-center justify-center border-b border-white/10 bg-black/20 px-12 py-3 md:px-14">
          <h2 className="truncate text-center text-base font-semibold text-white md:text-lg">
            {recording.title}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close visual editor"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden px-4 py-3 md:px-6 md:py-4">
          <div className="shrink-0 space-y-2.5 md:space-y-3">
            <div className="grid w-full gap-4 md:grid-cols-5">
              <div className="md:col-span-3">
                <SongVisualEditorPreview
                  clip={activeClip}
                  isPlaying={playback.isPlaying}
                  currentTimeSec={playback.currentTimeSec}
                  recording={recording}
                  audioRef={playback.audioRef}
                  onTogglePlayback={playback.togglePlayback}
                  canPlay={Boolean(recording.audioUrl) && durationSec > 0}
                  showOverlays={showOverlays}
                />
              </div>
              <div className="md:col-span-2">
                <ActiveMediaPanel
                  attachments={editor.attachments}
                  timelineClips={editor.timelineClips}
                  isBusy={editor.isBusy}
                  onClipAudioPulseChange={(attachmentId, enabled) => editor.setClipAudioPulse(attachmentId, enabled)}
                  readClipAudioPulse={editor.readClipAudioPulse}
                  onResetClipTrim={(attachmentId) => editor.resetClipTrim(attachmentId)}
                  onRemoveClip={editor.detachAttachment}
                  onSelectClip={editor.selectAttachment}
                  onToggleClipStage={(attachmentId, enabled) => editor.setAttachmentEnabled(attachmentId, enabled)}
                  selectedAttachmentId={editor.selectedAttachmentId}
                />
              </div>
            </div>

            <SongVisualEditorToolbar
              isBusy={editor.isBusy}
              isUploading={editor.isUploading}
              uploadProgress={editor.uploadProgress}
              isDirty={editor.isDirty}
              isSaving={editor.isSaving}
              isPlaying={playback.isPlaying}
              canPlay={Boolean(recording.audioUrl) && durationSec > 0}
              editMode={editMode}
              onEditModeChange={setEditMode}
              onTogglePlayback={playback.togglePlayback}
              onUpload={editor.openUploadPicker}
              onCancelUpload={editor.cancelUpload}
              onSave={() => editor.saveChanges()}
              onCancel={handleClose}
              showOverlays={showOverlays}
              onToggleOverlays={() => setShowOverlays(!showOverlays)}
            />

            {editor.error ? (
              <p className="rounded-md border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {editor.error}
              </p>
            ) : null}

            <SongVisualEditorTimeline
              clips={editor.timelineClips}
              durationSec={durationSec}
              currentTimeSec={playback.currentTimeSec}
              peaks={waveform?.peaks}
              waveformLoading={waveformLoading}
              waveformError={waveformError}
              clipSyncStatus={editor.clipSyncStatus}
              editMode={editMode}
              selectedAttachmentId={editor.selectedAttachmentId}
              onSeek={playback.seekTo}
              onSelectAttachment={editor.selectAttachment}
              onMoveClip={(attachmentId, nextStartSec) => editor.moveClip(attachmentId, nextStartSec)}
              onResizeClip={(attachmentId, nextDurationSec) => editor.resizeClip(attachmentId, nextDurationSec)}
              onResizeClipStart={(attachmentId, nextStartSec) => editor.resizeClipStart(attachmentId, nextStartSec)}
              onCutClipAt={(attachmentId, cutSec) => editor.cutClipAt(attachmentId, cutSec)}
              onCutAtTime={(cutSec) => editor.cutAtTime(cutSec)}
            />
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] md:mt-4">
            <SongVisualAssetLibrary
              attachments={editor.attachments}
              assets={editor.assets}
              userLibraryImages={editor.userLibraryImages}
              isBusy={editor.isBusy}
              isUploading={editor.isUploading}
              uploadProgress={editor.uploadProgress}
              libraryFocusMineKind={editor.libraryFocusMineKind}
              onLibraryFocusHandled={editor.clearLibraryFocus}
              pendingUpload={editor.pendingUpload}
              onCancelUpload={editor.cancelUpload}
              onAddRow={(row) => void editor.attachLibraryRow(row, playback.currentTimeSec)}
              onDeleteAsset={editor.deleteAsset}
              onUpload={editor.openUploadPicker}
              onUploadFile={editor.uploadFile}
            />

          </div>
        </div>

        <input
          ref={editor.fileInputRef}
          type="file"
          accept="video/*,image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) editor.uploadFile(file);
            event.currentTarget.value = "";
          }}
        />
        <audio
          ref={playback.bindAudioElement}
          crossOrigin="anonymous"
          preload="metadata"
          className="hidden"
        />
      </div>
    </div>,
    document.body,
  );
}
