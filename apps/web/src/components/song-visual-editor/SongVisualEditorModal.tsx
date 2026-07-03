import { RadioIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import { useSuppressPlaybackFocus } from "@/lib/playbackFocusSuppression";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

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
  const editor = useSongVisualEditorState({
    recordingId: recording.id,
    accessToken,
    durationSeconds: recording.durationSeconds,
  });

  const playback = useSongVisualPreviewPlayback(recording.audioUrl);
  const [previewSubtitles, setPreviewSubtitles] = useState(true);
  const [editMode, setEditMode] = useState<TimelineEditMode>("select");
  const { data: waveform, loading: waveformLoading, error: waveformError } = useAudioWaveformPeaks(recording.audioUrl);

  const durationSec = waveform?.durationSec || playback.durationSec || editor.timelineDurationSec;
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

  return createPortal(
    <>
      <div className="fixed inset-0 z-[10000] flex flex-col bg-[var(--color-canvas)]">
        <header className="relative flex shrink-0 items-center justify-center border-b border-white/10 bg-black/20 px-4 py-3 md:px-6">
          <h2 className="truncate text-center text-base font-semibold text-white md:text-lg">
            {recording.title}
          </h2>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 md:px-6 md:py-4 max-w-5xl mx-auto">
          <div className="shrink-0 space-y-2.5 md:space-y-3">
            <SongVisualEditorPreview
              clip={activeClip}
              isPlaying={playback.isPlaying}
              currentTimeSec={playback.currentTimeSec}
              previewSubtitles={previewSubtitles}
              recording={recording}
              audioRef={playback.audioRef}
              onTogglePlayback={playback.togglePlayback}
              canPlay={Boolean(recording.audioUrl) && durationSec > 0}
            />

            <SongVisualEditorToolbar
              isBusy={editor.isBusy}
              isUploading={editor.isUploading}
              uploadProgress={editor.uploadProgress}
              isDirty={editor.isDirty}
              isSaving={editor.isSaving}
              isPlaying={playback.isPlaying}
              canPlay={Boolean(recording.audioUrl) && durationSec > 0}
              editMode={editMode}
              includeSiteMedia={editor.includeSiteMedia}
              previewSubtitles={previewSubtitles}
              hasAttachments={editor.attachments.some((attachment) => attachment.enabled)}
              onEditModeChange={setEditMode}
              onIncludeSiteMediaChange={(includeSiteMedia) => editor.setIncludeSiteMedia(includeSiteMedia)}
              onPreviewSubtitlesChange={setPreviewSubtitles}
              onTogglePlayback={playback.togglePlayback}
              onUpload={editor.openUploadPicker}
              onSave={() => editor.saveChanges()}
              onCancel={handleClose}
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

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto md:mt-4">
            <SongVisualAssetLibrary
              timelineClips={editor.timelineClips}
              assets={editor.assets}
              isBusy={editor.isBusy}
              isUploading={editor.isUploading}
              uploadProgress={editor.uploadProgress}
              onClipLoopChange={(attachmentId, loop) => editor.setClipLoop(attachmentId, loop)}
              onClipAudioPulseChange={(attachmentId, enabled) => editor.setClipAudioPulse(attachmentId, enabled)}
              readClipAudioPulse={editor.readClipAudioPulse}
              onResetClipTrim={(attachmentId) => editor.resetClipTrim(attachmentId)}
              onAddRow={(row) => void editor.attachLibraryRow(row, playback.currentTimeSec)}
              onRemoveClip={editor.detachAttachment}
              onSelectClip={editor.selectAttachment}
              onDeleteAsset={editor.deleteAsset}
              onUpload={editor.openUploadPicker}
              onUploadFile={editor.uploadFile}
              selectedAttachmentId={editor.selectedAttachmentId}
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

      <Link
        to="/"
        className="fixed left-4 top-3 z-[10001] flex items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--color-canvas)]/95 px-2.5 py-1.5 text-xl font-bold tracking-tight text-white shadow-lg backdrop-blur-md md:left-6 md:text-2xl"
        aria-label="Playlisted home"
      >
        Play<span className="text-[var(--color-brand)]">listed</span>
        <RadioIcon size={16} className="text-[var(--color-brand)]" />
      </Link>
    </>,
    document.body,
  );
}
