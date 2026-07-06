import { Upload, Loader2 } from "lucide-react";
import { useEffect, useState, type DragEvent } from "react";

import { VISUAL_UPLOAD_MAX_BYTES } from "@/lib/visualUploadLimits";
import type {
  PendingVisualUpload,
  SongVisualAttachmentRecord,
  VisualMediaAssetRecord,
  UserLibraryImageRecord,
} from "@/lib/visualMediaApi";
import { formatVisualUploadProgressLabel, type VisualUploadProgress } from "@/lib/visualUploadProgress";

import { EditorSection } from "./EditorSection";
import { SongVisualLibraryCard } from "./SongVisualLibraryCard";
import { readTheatrePresetIdFromTags } from "./theatreFxLibrary";
import { formatMegabytes } from "./timelineLayout";
import {
  LIBRARY_BATCH_SIZE,
  useSongVisualLibraryItems,
  type CommunityKind,
  type LibraryTabId,
  type MineMediaKind,
  type VisualLibraryRow,
} from "./useSongVisualLibraryItems";

type SongVisualAssetLibraryProps = {
  attachments: SongVisualAttachmentRecord[];
  assets: VisualMediaAssetRecord[];
  userLibraryImages: UserLibraryImageRecord[];
  isBusy: boolean;
  isUploading: boolean;
  uploadProgress: VisualUploadProgress | null;
  libraryFocusMineKind: MineMediaKind | null;
  onLibraryFocusHandled: () => void;
  onAddRow: (row: VisualLibraryRow) => void;
  onDeleteAsset: (assetId: string) => void;
  onUpload: () => void;
  onUploadFile: (file: File) => void;
  onCancelUpload: () => void;
  pendingUpload: PendingVisualUpload | null;
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
  attachments,
  assets,
  userLibraryImages,
  isBusy,
  isUploading,
  uploadProgress,
  libraryFocusMineKind,
  onLibraryFocusHandled,
  onAddRow,
  onDeleteAsset,
  onUpload,
  onUploadFile,
  onCancelUpload,
  pendingUpload,
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

  useEffect(() => {
    if (!libraryFocusMineKind) return;
    const countKey: VisibleCountKey = libraryFocusMineKind === "image" ? "mineImages" : "mineVideos";
    setActiveTab("mine");
    setMineKind(libraryFocusMineKind);
    setVisibleCounts((current) => ({ ...current, [countKey]: LIBRARY_BATCH_SIZE }));
    onLibraryFocusHandled();
  }, [libraryFocusMineKind, onLibraryFocusHandled]);

  const { imageRows, videoRows, communityAnimations, communityVideos, communityImages } =
    useSongVisualLibraryItems({
      assets,
      userLibraryImages,
      attachments,
      pendingUpload,
      uploadProgress,
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

  const activeAssetIds = new Set(attachments.map((attachment) => attachment.mediaAssetId));
  const activePresetIds = new Set(
    attachments
      .map((attachment) => readTheatrePresetIdFromTags(attachment.tags))
      .filter((presetId): presetId is string => presetId != null),
  );

  function isRowActive(row: VisualLibraryRow): boolean {
    if (row.theatrePresetId) return activePresetIds.has(row.theatrePresetId);
    return row.asset ? activeAssetIds.has(row.asset.id) : false;
  }

  return (
    <div className="space-y-3">
      <EditorSection
        title="Library"
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={onUpload}
              className={[
                "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition",
                isUploading
                  ? "border-sky-400/30 bg-sky-500/15 text-sky-100"
                  : "border-white/15 bg-white/5 text-white/85 hover:border-white/25 hover:bg-white/10 hover:text-white disabled:opacity-40",
              ].join(" ")}
              aria-busy={isUploading}
              aria-label={
                isUploading
                  ? formatVisualUploadProgressLabel(uploadProgress, "button")
                  : "Upload image or video"
              }
              title={
                isUploading
                  ? formatVisualUploadProgressLabel(uploadProgress, "button")
                  : "Upload image or video"
              }
            >
              {isUploading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              <span className="max-w-[7.5rem] truncate">
                {isUploading
                  ? formatVisualUploadProgressLabel(uploadProgress, "button")
                  : "Upload"}
              </span>
            </button>
            <PrimaryTabs activeTab={activeTab} onChange={setActiveTab} />
          </div>
        }
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
                {formatVisualUploadProgressLabel(uploadProgress, "overlay")}
              </p>
              {uploadProgress?.fileName ? (
                <p className="max-w-full truncate text-xs text-white/50">{uploadProgress.fileName}</p>
              ) : null}
              <button
                type="button"
                onClick={onCancelUpload}
                className="pointer-events-auto mt-1 rounded-md border border-white/20 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10"
              >
                Cancel upload
              </button>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {visibleRows.map((row) => (
                <SongVisualLibraryCard
                  key={row.id}
                  row={row}
                  active={isRowActive(row)}
                  disabled={isBusy}
                  onAction={() => {
                    if (row.pending) return;
                    onAddRow(row);
                  }}
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
