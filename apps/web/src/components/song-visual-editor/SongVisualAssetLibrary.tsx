import { RotateCcw, Trash2, Upload, AudioLines, Repeat, Loader2 } from "lucide-react";
import { useState, type DragEvent } from "react";

import { VISUAL_UPLOAD_MAX_BYTES } from "@/lib/visualUploadLimits";
import type { VisualUploadProgress } from "@/lib/visualMediaApi";

import { editorToggleClass } from "./editorToggle";
import { EditorSection } from "./EditorSection";
import { SongVisualLibraryCard } from "./SongVisualLibraryCard";
import { MediaAssetThumb } from "./MediaAssetThumb";
import { formatMegabytes, readClipStartOffsetMs } from "./timelineLayout";
import type { TimelineClip } from "./types";
import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import {
  LIBRARY_BATCH_SIZE,
  useSongVisualLibraryItems,
  type CommunityKind,
  type LibraryTabId,
  type MineMediaKind,
  type VisualLibraryRow,
} from "./useSongVisualLibraryItems";

type SongVisualAssetLibraryProps = {
  timelineClips: TimelineClip[];
  assets: VisualMediaAssetRecord[];
  isBusy: boolean;
  isUploading: boolean;
  uploadProgress: VisualUploadProgress | null;
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
};

const PRIMARY_TABS: Array<{ id: LibraryTabId; label: string }> = [
  { id: "mine", label: "Mine" },
  { id: "community", label: "Community" },
];

const MINE_KINDS: Array<{ id: MineMediaKind; label: string }> = [
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
];

const COMMUNITY_KINDS: Array<{ id: CommunityKind; label: string }> = [
  { id: "animations", label: "Animations" },
  { id: "videos", label: "Videos" },
  { id: "images", label: "Images" },
];

type VisibleCountKey =
  | "mineImages"
  | "mineVideos"
  | "communityAnimations"
  | "communityVideos"
  | "communityImages";

function communityCountKey(kind: CommunityKind): VisibleCountKey {
  if (kind === "animations") return "communityAnimations";
  if (kind === "videos") return "communityVideos";
  return "communityImages";
}

function PrimaryTabs({
  activeTab,
  onChange,
}: {
  activeTab: LibraryTabId;
  onChange: (tab: LibraryTabId) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5">
      {PRIMARY_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={[
            "rounded-md px-3 py-1 text-[11px] font-semibold transition",
            activeTab === tab.id
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/45 hover:text-white/70",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FilterChips<T extends string>({
  items,
  activeId,
  onChange,
  accent,
}: {
  items: Array<{ id: T; label: string }>;
  activeId: T;
  onChange: (id: T) => void;
  accent: "violet" | "cyan";
}) {
  const activeClass =
    accent === "violet"
      ? "border-violet-400/40 bg-violet-500/10 text-violet-100"
      : "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";

  return (
    <div className="flex min-h-[1.75rem] flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={[
            "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition",
            activeId === item.id
              ? activeClass
              : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/70",
          ].join(" ")}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function SongVisualAssetLibrary({
  timelineClips,
  assets,
  isBusy,
  isUploading,
  uploadProgress,
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
}: SongVisualAssetLibraryProps) {
  const [activeTab, setActiveTab] = useState<LibraryTabId>("mine");
  const [mineKind, setMineKind] = useState<MineMediaKind>("image");
  const [communityKind, setCommunityKind] = useState<CommunityKind>("animations");
  const [visibleCounts, setVisibleCounts] = useState<Record<VisibleCountKey, number>>({
    mineImages: LIBRARY_BATCH_SIZE,
    mineVideos: LIBRARY_BATCH_SIZE,
    communityAnimations: LIBRARY_BATCH_SIZE,
    communityVideos: LIBRARY_BATCH_SIZE,
    communityImages: LIBRARY_BATCH_SIZE,
  });
  const [isDragOver, setIsDragOver] = useState(false);

  const { imageRows, videoRows, communityAnimations, communityVideos, communityImages } =
    useSongVisualLibraryItems({
      assets,
      attachments: timelineClips.map((clip) => clip.attachment),
    });

  const communityByKind: Record<CommunityKind, VisualLibraryRow[]> = {
    animations: communityAnimations,
    videos: communityVideos,
    images: communityImages,
  };

  const activeCountKey: VisibleCountKey =
    activeTab === "community"
      ? communityCountKey(communityKind)
      : mineKind === "image"
        ? "mineImages"
        : "mineVideos";

  const activeRows =
    activeTab === "community"
      ? communityByKind[communityKind]
      : mineKind === "image"
        ? imageRows
        : videoRows;

  const visibleRows = activeRows.slice(0, visibleCounts[activeCountKey]);
  const hasMore = activeRows.length > visibleCounts[activeCountKey];

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isBusy || activeTab !== "mine") return;
    const file = Array.from(event.dataTransfer.files).find(
      (candidate) => candidate.type.startsWith("video/") || candidate.type.startsWith("image/"),
    );
    if (file) onUploadFile(file);
  }

  function loadMore() {
    setVisibleCounts((current) => ({
      ...current,
      [activeCountKey]: current[activeCountKey] + LIBRARY_BATCH_SIZE,
    }));
  }

  const sortedClips = [...timelineClips].sort((left, right) => left.startSec - right.startSec);

  return (
    <div className="space-y-3">
      <EditorSection title="Active">
        {sortedClips.length === 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-black/30 px-3 py-6 text-center text-xs text-white/35">
            Add clips from your library below.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {sortedClips.map((clip) => {
              const { attachment } = clip;
              const selected = attachment.id === selectedAttachmentId;
              const startOffsetMs = readClipStartOffsetMs(attachment);
              const audioPulse = readClipAudioPulse(attachment);
              return (
                <article
                  key={attachment.id}
                  className={[
                    "overflow-hidden rounded-lg border bg-black/30",
                    selected ? "border-emerald-400/50 ring-1 ring-emerald-400/20" : "border-white/10",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectClip(attachment.id)}
                    className="block w-full text-left"
                  >
                    <MediaAssetThumb asset={attachment.mediaAsset} className="aspect-video w-full" />
                  </button>
                  <div className="space-y-1.5 p-2">
                    <p className="truncate text-xs font-medium text-white">
                      {attachment.label ?? attachment.mediaAsset.originalName}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      <div className="inline-flex h-7 items-center gap-0.5 rounded-md border border-white/10 bg-black/25 p-0.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onClipLoopChange(attachment.id, !clip.loop)}
                          className={editorToggleClass(clip.loop, isBusy, "h-6 gap-1 px-1.5 text-[10px]")}
                          aria-pressed={clip.loop}
                          title="Loop clip"
                        >
                          <Repeat size={10} />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onClipAudioPulseChange(attachment.id, !audioPulse)}
                          className={editorToggleClass(audioPulse, isBusy, "h-6 gap-1 px-1.5 text-[10px]")}
                          aria-pressed={audioPulse}
                          title="Beat reactive pulse"
                        >
                          <AudioLines size={10} />
                        </button>
                      {startOffsetMs > 0 ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onResetClipTrim(attachment.id)}
                          className="rounded-md border border-amber-400/20 px-1.5 py-1 text-amber-100 hover:bg-amber-400/10 disabled:opacity-40"
                          aria-label="Reset media cut-in"
                          title="Reset cut-in to media start"
                        >
                          <RotateCcw size={11} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onRemoveClip(attachment.id)}
                        className="rounded-md px-1.5 py-1 hover:bg-red-500/10 disabled:opacity-40"
                        aria-label="Remove clip from timeline"
                      >
                        <Trash2 size={11} />
                      </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </EditorSection>

      <EditorSection
        title="Library"
        action={<PrimaryTabs activeTab={activeTab} onChange={setActiveTab} />}
      >
        <div className="mb-3 space-y-2">
          {activeTab === "mine" ? (
            <FilterChips items={MINE_KINDS} activeId={mineKind} onChange={setMineKind} accent="violet" />
          ) : (
            <FilterChips
              items={COMMUNITY_KINDS}
              activeId={communityKind}
              onChange={setCommunityKind}
              accent="cyan"
            />
          )}
        </div>

        <div
          onDragOver={(event) => {
            if (activeTab !== "mine") return;
            event.preventDefault();
            if (!isBusy) setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={[
            "relative min-h-[11rem] rounded-lg border bg-black/30 p-2 transition-colors",
            isDragOver ? "border-emerald-400/50 bg-emerald-500/10" : "border-white/10",
          ].join(" ")}
        >
          {isUploading ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/70 px-4 text-center backdrop-blur-[1px]">
              <Loader2 size={22} className="animate-spin text-sky-300" />
              <p className="text-sm font-medium text-white">
                {uploadOverlayTitle(uploadProgress)}
              </p>
              {uploadProgress?.fileName ? (
                <p className="max-w-full truncate text-xs text-white/50">{uploadProgress.fileName}</p>
              ) : null}
            </div>
          ) : null}
          {visibleRows.length === 0 ? (
            activeTab === "mine" ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={onUpload}
                className="flex w-full flex-col items-center gap-2 py-8 text-center disabled:opacity-40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
                  <Upload size={18} />
                </div>
                <p className="text-sm text-white/60">Click or drop {mineKind === "video" ? "videos" : "images"} here</p>
                <p className="text-xs text-white/35">
                  Up to {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.video)} video ·{" "}
                  {formatMegabytes(VISUAL_UPLOAD_MAX_BYTES.image)} image
                </p>
              </button>
            ) : (
              <p className="py-8 text-center text-xs text-white/35">
                No community {communityKind} available.
              </p>
            )
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {visibleRows.map((row) => (
                <SongVisualLibraryCard
                  key={row.id}
                  row={row}
                  disabled={isBusy}
                  onAction={() => onAddRow(row)}
                  onDelete={
                    row.asset && activeTab === "mine"
                      ? () => {
                          if (window.confirm(`Delete "${row.label}" permanently?`)) {
                            onDeleteAsset(row.asset!.id);
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}

          {hasMore ? (
            <button
              type="button"
              onClick={loadMore}
              className="mt-2 w-full rounded-lg border border-white/10 py-2 text-xs font-medium text-white/60 hover:bg-white/5 hover:text-white"
            >
              Load more
            </button>
          ) : null}
        </div>
      </EditorSection>
    </div>
  );
}

function uploadOverlayTitle(progress: VisualUploadProgress | null) {
  if (!progress) return "Uploading…";
  if (progress.phase === "preparing") return "Preparing upload…";
  if (progress.phase === "processing") return "Saving on server…";
  if (progress.percent != null) return `Uploading ${progress.percent}%`;
  return "Uploading…";
}
