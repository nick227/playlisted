import { Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

  useSongVisualEditorHotkeys({
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

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[var(--color-canvas)] lg:left-[var(--spacing-sidebar)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-white">{recording.title}</h2>
        <button
          type="button"
          onClick={() => editor.saveChanges()}
          disabled={!editor.isDirty || editor.isSaving}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-40"
        >
          {editor.isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Close visual editor"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3 pb-[var(--spacing-player-safe-mobile)] md:gap-3 md:p-4 md:pb-4">
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
          currentTimeSec={playback.currentTimeSec}
          durationSec={durationSec}
          editMode={editMode}
          includeSiteMedia={editor.includeSiteMedia}
          previewSubtitles={previewSubtitles}
          hasAttachments={editor.attachments.some((attachment) => attachment.enabled)}
          onEditModeChange={setEditMode}
          onIncludeSiteMediaChange={(includeSiteMedia) => editor.setIncludeSiteMedia(includeSiteMedia)}
          onPreviewSubtitlesChange={setPreviewSubtitles}
        />

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

        <SongVisualAssetLibrary
          timelineClips={editor.timelineClips}
          assets={editor.assets}
          isBusy={editor.isBusy}
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

        {editor.error ? (
          <p className="text-sm text-red-300">{editor.error}</p>
        ) : null}
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
  );
}
