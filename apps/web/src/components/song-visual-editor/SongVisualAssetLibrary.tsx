import { Loader2, Upload } from "lucide-react";
import { useState, type DragEvent } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { VISUAL_UPLOAD_MAX_BYTES } from "@/lib/visualUploadLimits";

import { SongVisualLibraryRow } from "./SongVisualLibraryRow";
import { MediaAssetThumb } from "./MediaAssetThumb";
import { formatMediaOffsetMs, formatMegabytes, readClipStartOffsetMs } from "./timelineLayout";
import type { TimelineClip } from "./types";
import type { SongVisualEditorRecording } from "./types";
import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import {
  filterCommunityRows,
  LIBRARY_BATCH_SIZE,
  useSongVisualLibraryItems,
  type CommunityFilter,
  type LibraryTabId,
  type VisualLibraryRow,
} from "./useSongVisualLibraryItems";

type SongVisualAssetLibraryProps = {
  recording: SongVisualEditorRecording;
  timelineClips: TimelineClip[];
  assets: VisualMediaAssetRecord[];
  isBusy: boolean;
  onClipLoopChange: (attachmentId: string, loop: boolean) => void;
  onClipAudioPulseChange: (attachmentId: string, enabled: boolean) => void;
  readClipAudioPulse: (attachment: TimelineClip["attachment"]) => boolean;
  onResetClipTrim: (attachmentId: string) => void;
  onAddRow: (row: VisualLibraryRow) => void;
  onRemoveClip: (attachmentId: string) => void;
  onSelectClip: (attachmentId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onUpload: () => void;
  onUploadFile: (file: File) => void;
  selectedAttachmentId: string | null;
  accessToken: string;
};

const TABS: Array<{ id: LibraryTabId; label: string }> = [
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "community", label: "Community" },
];

const COMMUNITY_FILTERS: Array<{ id: CommunityFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "song", label: "This song" },
  { id: "playlists", label: "Playlists" },
  { id: "songs", label: "Songs" },
  { id: "artist", label: "Artist" },
  { id: "uploads", label: "Uploads" },
];

export function SongVisualAssetLibrary({
  recording,
  timelineClips,
  assets,
  isBusy,
  onClipLoopChange,
  onClipAudioPulseChange,
  readClipAudioPulse,
  onResetClipTrim,
  onAddRow,
  onRemoveClip,
  onSelectClip,
  onDeleteAsset,
  onUpload,
  onUploadFile,
  selectedAttachmentId,
  accessToken,
}: SongVisualAssetLibraryProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LibraryTabId>("images");
  const [communityFilter, setCommunityFilter] = useState<CommunityFilter>("all");
  const [visibleCounts, setVisibleCounts] = useState<Record<LibraryTabId, number>>({
    images: LIBRARY_BATCH_SIZE,
    videos: LIBRARY_BATCH_SIZE,
    community: LIBRARY_BATCH_SIZE,
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const { imageRows, videoRows, communityRows, isCommunityLoading } = useSongVisualLibraryItems({
    recording,
    assets,
    attachments: timelineClips.map((clip) => clip.attachment),
    accessToken,
    user,
  });

  const tabRows: Record<LibraryTabId, VisualLibraryRow[]> = {
    images: imageRows,
    videos: videoRows,
    community: filterCommunityRows(communityRows, communityFilter),
  };

  const visibleRows = tabRows[activeTab].slice(0, visibleCounts[activeTab]);
  const hasMore = tabRows[activeTab].length > visibleCounts[activeTab];

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;
    const file = Array.from(event.dataTransfer.files).find(
      (candidate) => candidate.type.startsWith("video/") || candidate.type.startsWith("image/"),
    );
    if (file) onUploadFile(file);
  }

  function loadMore() {
    setVisibleCounts((current) => ({
      ...current,
      [activeTab]: current[activeTab] + LIBRARY_BATCH_SIZE,
    }));
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-white/40">Active</h3>
        {timelineClips.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-white/35">
            Add clips from the library below or upload new media.
          </p>
        ) : (
          <div className="space-y-1.5">
            {[...timelineClips].sort((left, right) => left.startSec - right.startSec).map((clip) => {
              const { attachment } = clip;
              const selected = attachment.id === selectedAttachmentId;
              const startOffsetMs = readClipStartOffsetMs(attachment);
              const audioPulse = readClipAudioPulse(attachment);
              return (
                <div
                  key={attachment.id}
                  className={[
                    "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                    selected ? "border-emerald-400/50 bg-emerald-500/5" : "border-white/10 bg-black/20",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectClip(attachment.id)}
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-md"
                  >
                    <MediaAssetThumb asset={attachment.mediaAsset} className="h-10 w-10" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {attachment.label ?? attachment.mediaAsset.originalName}
                    </p>
                    <p className="text-xs text-white/45">
                      {clip.startSec.toFixed(1)}s · {clip.durationSec.toFixed(1)}s · cut-in {formatMediaOffsetMs(startOffsetMs)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <label className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/80">
                      <input
                        type="checkbox"
                        checked={clip.loop}
                        disabled={isBusy}
                        onChange={(event) => onClipLoopChange(attachment.id, event.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-emerald-500"
                      />
                      Loop
                    </label>
                    <label className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/80">
                      <input
                        type="checkbox"
                        checked={audioPulse}
                        disabled={isBusy}
                        onChange={(event) => onClipAudioPulseChange(attachment.id, event.target.checked)}
                        className="rounded border-white/20 bg-black/40 text-emerald-500"
                      />
                      Pulse
                    </label>
                    {startOffsetMs > 0 ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onResetClipTrim(attachment.id)}
                        className="rounded-md border border-amber-400/20 px-2 py-1 text-[10px] text-amber-100 hover:bg-amber-400/10 disabled:opacity-40"
                      >
                        Reset
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onRemoveClip(attachment.id)}
                      className="rounded-md border border-red-500/20 px-2 py-1 text-[10px] text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section
        onDragOver={(event) => {
          event.preventDefault();
          if (!isBusy) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={[
          "rounded-xl border bg-black/20 p-3 transition-colors",
          isDragOver ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition",
                  activeTab === tab.id
                    ? "bg-white/15 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white/70",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={onUpload}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white hover:bg-white/10 disabled:opacity-40"
          >
            <Upload size={12} />
            Upload
          </button>
        </div>

        {activeTab === "community" ? (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {COMMUNITY_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  setCommunityFilter(filter.id);
                  setVisibleCounts((current) => ({ ...current, community: LIBRARY_BATCH_SIZE }));
                }}
                className={[
                  "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition",
                  communityFilter === filter.id
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70",
                ].join(" ")}
              >
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === "community" && isCommunityLoading ? (
          <div className="flex items-center justify-center py-10 text-white/40">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : visibleRows.length === 0 ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={onUpload}
            className="flex w-full flex-col items-center gap-2 py-8 text-center disabled:opacity-40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
              <Upload size={18} />
            </div>
            <p className="text-sm text-white/60">
              {activeTab === "community" ? "No community art found yet" : "Click or drop videos and images here"}
            </p>
            {activeTab !== "community" ? (
              <p className="text-xs text-white/35">
                Up to {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.video)} video · {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.image)} image
              </p>
            ) : null}
          </button>
        ) : (
          <div className="space-y-1.5">
            {visibleRows.map((row) => (
              <SongVisualLibraryRow
                key={row.id}
                row={row}
                disabled={isBusy}
                onAction={() => onAddRow(row)}
                onDelete={
                  row.asset && activeTab !== "community"
                    ? () => {
                        if (window.confirm(`Delete "${row.label}" permanently?`)) {
                          onDeleteAsset(row.asset!.id);
                        }
                      }
                    : undefined
                }
              />
            ))}
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                className="w-full rounded-lg border border-white/10 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
              >
                Load more
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
