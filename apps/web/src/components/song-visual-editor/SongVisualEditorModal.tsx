import { Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useSuppressPlaybackFocus } from "@/lib/playbackFocusSuppression";
import { useAuth } from "@/providers/AuthProvider";

import { SongVisualAssetLibrary } from "./SongVisualAssetLibrary";
import { SongVisualEditorPreview } from "./SongVisualEditorPreview";
import { SongVisualEditorTimeline } from "./SongVisualEditorTimeline";
import { SongVisualEditorToolbar } from "./SongVisualEditorToolbar";
import { SongVisualEditorWaveform } from "./SongVisualEditorWaveform";
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
  const editor = useSongVisualEditorState({
    recordingId: recording.id,
    accessToken,
    durationSeconds: recording.durationSeconds,
  });

  const playback = useSongVisualPreviewPlayback(recording.audioUrl);
  const [previewSubtitles, setPreviewSubtitles] = useState(true);
  const { data: waveform, loading: waveformLoading, error: waveformError } = useAudioWaveformPeaks(recording.audioUrl);

  const durationSec = waveform?.durationSec || playback.durationSec || editor.timelineDurationSec;
  const activeClip = useMemo(
    () => findClipAtTime(editor.timelineClips, playback.currentTimeSec),
    [editor.timelineClips, playback.currentTimeSec],
  );

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4 h-full">
      <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--color-canvas)] shadow-2xl">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-center text-lg font-bold text-white/50">{recording.title}</h2>
          <button
            type="button"
            onClick={() => editor.saveChanges()}
            disabled={!editor.isDirty || editor.isSaving}
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-40"
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

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pb-[var(--spacing-player-safe-mobile)] md:pb-[var(--spacing-player)]">
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
            includeSiteMedia={editor.includeSiteMedia}
            previewSubtitles={previewSubtitles}
            hasAttachments={editor.attachments.some((attachment) => attachment.enabled)}
            onIncludeSiteMediaChange={(includeSiteMedia) => editor.setIncludeSiteMedia(includeSiteMedia)}
            onPreviewSubtitlesChange={setPreviewSubtitles}
          />

          {waveformLoading ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-white/10 bg-black/30">
              <Loader2 size={20} className="animate-spin text-white/40" />
            </div>
          ) : waveform ? (
            <SongVisualEditorWaveform
              peaks={waveform.peaks}
              durationSec={durationSec}
              currentTimeSec={playback.currentTimeSec}
              onSeek={playback.seekTo}
            />
          ) : (
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/20 px-4 text-center text-xs text-white/40">
              {waveformError ?? "Audio waveform unavailable for this track."}
            </div>
          )}

          <SongVisualEditorTimeline
            clips={editor.timelineClips}
            durationSec={durationSec}
            currentTimeSec={playback.currentTimeSec}
            isLibraryBusy={editor.isLibraryBusy}
            clipSyncStatus={editor.clipSyncStatus}
            hasClipboard={editor.hasClipboard}
            selectedAttachmentId={editor.selectedAttachmentId}
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
    </div>
  );
}
