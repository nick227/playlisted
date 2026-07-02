import { Loader2, X } from "lucide-react";
import { useMemo } from "react";

import { useSuppressPlaybackFocus } from "@/lib/playbackFocusSuppression";
import { useAuth } from "@/providers/AuthProvider";

import { SongVisualAssetLibrary } from "./SongVisualAssetLibrary";
import { SongVisualEditorPreview } from "./SongVisualEditorPreview";
import { SongVisualEditorTimeline } from "./SongVisualEditorTimeline";
import { SongVisualEditorToolbar } from "./SongVisualEditorToolbar";
import { SongVisualEditorWaveform } from "./SongVisualEditorWaveform";
import { useAudioWaveformPeaks } from "./hooks/useAudioWaveformPeaks";
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

  const editor = useSongVisualEditorState({
    recordingId: recording.id,
    accessToken: accessToken ?? "",
    durationSeconds: recording.durationSeconds,
  });

  const playback = useSongVisualPreviewPlayback(recording.audioUrl);
  const { data: waveform, loading: waveformLoading, error: waveformError } = useAudioWaveformPeaks(recording.audioUrl);

  const durationSec = waveform?.durationSec || playback.durationSec || editor.timelineDurationSec;
  const activeClip = useMemo(
    () => findClipAtTime(editor.timelineClips, playback.currentTimeSec),
    [editor.timelineClips, playback.currentTimeSec],
  );

  if (!accessToken) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--color-canvas)] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">Visual Editor</h2>
            <p className="truncate text-sm text-white/50">{recording.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label="Close visual editor"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <SongVisualEditorPreview
            clip={activeClip}
            isPlaying={playback.isPlaying}
            currentTimeSec={playback.currentTimeSec}
          />

          <SongVisualEditorToolbar
            isPlaying={playback.isPlaying}
            isBusy={editor.isBusy}
            currentTimeSec={playback.currentTimeSec}
            durationSec={durationSec}
            includeSiteMedia={editor.includeSiteMedia}
            hasAttachments={editor.attachments.some((attachment) => attachment.enabled)}
            onTogglePlayback={playback.togglePlayback}
            onUpload={editor.openUploadPicker}
            onIncludeSiteMediaChange={(includeSiteMedia) => void editor.setIncludeSiteMedia(includeSiteMedia)}
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
            remainingSec={editor.remainingTimelineSec}
            currentTimeSec={playback.currentTimeSec}
            selectedAttachmentId={editor.selectedAttachmentId}
            onSelectAttachment={editor.selectAttachment}
            onSeek={playback.seekTo}
            onRemoveAttachment={editor.detachAttachment}
            onToggleLoop={(attachmentId, loop) => void editor.setClipLoop(attachmentId, loop)}
            onResizeClip={(attachmentId, nextDurationSec) => void editor.resizeClip(attachmentId, nextDurationSec)}
          />

          <SongVisualAssetLibrary
            assets={editor.assets}
            attachedAssetIds={editor.attachedAssetIds}
            remainingTimelineSec={editor.remainingTimelineSec}
            isBusy={editor.isBusy}
            onAddToTimeline={(assetId) => void editor.attachExistingAsset(assetId)}
            onDeleteAsset={editor.deleteAsset}
            onUpload={editor.openUploadPicker}
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
      </div>
    </div>
  );
}
