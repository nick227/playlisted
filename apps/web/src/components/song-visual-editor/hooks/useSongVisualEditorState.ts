import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { validateVisualUploadFile, visualUploadKindForFile } from "@/lib/visualUploadLimits";
import {
  deleteVisualMediaAsset,
  ensureTheatrePlaceholderAsset,
  fetchSongVisualAttachments,
  importVisualMediaImageFromUrl,
  importVisualMediaVideoFromUrl,
  listVisualMediaAssets,
  uploadVisualMediaFile,
  type SongVisualAttachmentRecord,
  type VisualMediaAssetRecord,
  type VisualUploadProgress,
  type PendingVisualUpload,
} from "@/lib/visualMediaApi";
import type { VisualMediaBeatFx } from "@/theatre/media/types";
import { clearRemoteTrackVisualMedia } from "@/theatre/media/resolveTrackVisualMedia";

import {
  applyDraftClipBounds,
  applyDraftPolicy,
  attachmentsListEqual,
  cloneAttachments,
  createDraftAttachment,
  draftPolicyFromServer,
  patchDraftAttachment,
  removeDraftAttachment,
} from "../draftSongVisualAttachments";
import { saveSongVisualDraft } from "../saveSongVisualDraft";
import { theatrePresetTag } from "../theatreFxLibrary";
import type { VisualLibraryRow, MineMediaKind } from "../useSongVisualLibraryItems";
import {
  beatFxForAudioPulse,
  readClipAudioPulse,
} from "../audioPulse";
import {
  boundsNearlyEqual,
  buildPlaybackPatch,
  clipDurationAfterLoopChange,
  findTopClipAtTime,
  readClipPlayback,
  resolveClipInsert,
  resolveClipMove,
  resolveClipResizeEnd,
  resolveClipResizeStart,
  resolveClipResetTrim,
  trimClipAtShortSide,
  type ClipBounds,
} from "../timelineLayout";
import { layoutTimelineClips, policyFromIncludeSiteMedia, policyIncludesSiteMedia } from "../types";
import { songVisualQueryKey } from "./optimisticSongVisualCache";

type ClipClipboard = {
  mediaAssetId: string;
  label: string | null;
  policy: SongVisualAttachmentRecord["policy"];
  playback: Record<string, unknown>;
  beatFx: VisualMediaBeatFx | null;
};

type UseSongVisualEditorStateArgs = {
  recordingId: string;
  accessToken: string;
  durationSeconds?: number | null;
};

function defaultAssetLoop(asset: VisualMediaAssetRecord) {
  return asset.mediaType === "video";
}

export function useSongVisualEditorState({
  recordingId,
  accessToken,
  durationSeconds,
}: UseSongVisualEditorStateArgs) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<VisualUploadProgress | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingVisualUpload | null>(null);
  const [libraryFocusMineKind, setLibraryFocusMineKind] = useState<MineMediaKind | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipClipboard | null>(null);
  const [draftAttachments, setDraftAttachments] = useState<SongVisualAttachmentRecord[] | null>(null);
  const [draftPolicy, setDraftPolicy] = useState<SongVisualAttachmentRecord["policy"] | null>(null);

  const attachmentsQuery = useQuery({
    queryKey: songVisualQueryKey(recordingId),
    queryFn: () => fetchSongVisualAttachments(recordingId, accessToken),
  });

  const assetsQuery = useQuery({
    queryKey: ["visual-media-assets"],
    queryFn: () => listVisualMediaAssets(accessToken),
  });

  useEffect(() => {
    if (!attachmentsQuery.data || draftAttachments != null) return;
    setDraftAttachments(cloneAttachments(attachmentsQuery.data.attachments));
    setDraftPolicy(draftPolicyFromServer(attachmentsQuery.data));
  }, [attachmentsQuery.data, draftAttachments]);

  const serverData = attachmentsQuery.data;
  const attachments = draftAttachments ?? serverData?.attachments ?? [];
  const policy = draftPolicy ?? draftPolicyFromServer(serverData);
  const includeSiteMedia = policyIncludesSiteMedia(policy);
  const timelineDurationSec = durationSeconds && durationSeconds > 0 ? durationSeconds : 120;

  const timelineClips = useMemo(
    () => layoutTimelineClips(attachments, timelineDurationSec),
    [attachments, timelineDurationSec],
  );

  const isDirty = useMemo(() => {
    if (!serverData || draftAttachments == null || draftPolicy == null) return false;
    if (draftPolicy !== draftPolicyFromServer(serverData)) return true;
    return !attachmentsListEqual(draftAttachments, serverData.attachments);
  }, [draftAttachments, draftPolicy, serverData]);

  const updateDraft = useCallback((updater: (current: SongVisualAttachmentRecord[]) => SongVisualAttachmentRecord[]) => {
    setDraftAttachments((current) => updater(current ?? []));
  }, []);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      return uploadVisualMediaFile(file, accessToken, {
        onProgress: setUploadProgress,
        signal: controller.signal,
      });
    },
    onMutate: (file) => {
      const kind = visualUploadKindForFile(file);
      if (!kind) return;
      setPendingUpload({
        id: `pending-${crypto.randomUUID()}`,
        fileName: file.name,
        mediaType: kind,
        sizeBytes: file.size,
        previewUrl: URL.createObjectURL(file),
      });
    },
    onSuccess: async (asset) => {
      setLibraryFocusMineKind(asset.mediaType === "video" ? "video" : "image");
      await attachAssetToTimeline(asset, { startSec: 0 });
      await queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] });
    },
    onError: (err) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(null);
        return;
      }
      setError(err instanceof Error ? err.message : "Upload failed.");
    },
    onSettled: () => {
      setUploadProgress(null);
      uploadAbortRef.current = null;
      setPendingUpload((current) => {
        if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
        return null;
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!serverData || draftAttachments == null || draftPolicy == null) {
        throw new Error("Editor is still loading.");
      }
      return saveSongVisualDraft({
        recordingId,
        accessToken,
        queryClient,
        draftAttachments,
        draftPolicy,
        serverData,
      });
    },
    onSuccess: (fresh) => {
      setError(null);
      setDraftAttachments(cloneAttachments(fresh.attachments));
      setDraftPolicy(fresh.policy);
      clearRemoteTrackVisualMedia(recordingId);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Save failed."),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => deleteVisualMediaAsset(assetId, accessToken),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] }),
        queryClient.invalidateQueries({ queryKey: songVisualQueryKey(recordingId) }),
      ]);
      clearRemoteTrackVisualMedia(recordingId);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Delete failed."),
  });

  function nextClipOrder(source = attachments) {
    return source.reduce((max, attachment) => Math.max(max, attachment.order), -1) + 1;
  }

  function getAttachmentSnapshot(attachmentId: string) {
    return attachments.find((item) => item.id === attachmentId) ?? null;
  }

  function commitClipBounds(
    attachmentId: string,
    bounds: ClipBounds,
    opts: { order?: number } = {},
  ) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const currentOffsetMs = readClipPlayback(attachment).startOffsetMs ?? 0;
    if (boundsNearlyEqual(bounds, clip, currentOffsetMs) && opts.order == null) return;

    updateDraft((current) =>
      applyDraftClipBounds(current, attachmentId, attachment, bounds, opts.order),
    );
    setError(null);
  }

  function commitDetach(attachmentId: string) {
    if (!getAttachmentSnapshot(attachmentId)) return;
    updateDraft((current) => removeDraftAttachment(current, attachmentId));
    if (selectedAttachmentId === attachmentId) setSelectedAttachmentId(null);
    setError(null);
  }

  async function resolveLibraryAsset(asset: VisualMediaAssetRecord) {
    return asset;
  }

  async function resolveImportUrl(url: string, label: string, mediaType: "image" | "video") {
    const assets = assetsQuery.data ?? [];
    return mediaType === "video"
      ? importVisualMediaVideoFromUrl(url, label, accessToken, assets)
      : importVisualMediaImageFromUrl(url, label, accessToken, assets);
  }

  async function attachAssetToTimeline(
    asset: VisualMediaAssetRecord,
    opts: {
      loop?: boolean;
      startSec?: number;
      label?: string;
      tags?: string[] | null;
    } = {},
  ) {
    const loop = opts.loop ?? defaultAssetLoop(asset);
    const requestedStart = opts.startSec ?? 0;
    const stubAttachment = { mediaAsset: asset } as SongVisualAttachmentRecord;
    const bounds = resolveClipInsert(stubAttachment, requestedStart, timelineDurationSec, { loop });

    if (!bounds) {
      setError("No room on the timeline at this position.");
      return;
    }

    const nextPolicy = policy === "defaultOnly" ? "preferAttached" : policy;
    const draftAttachment = createDraftAttachment({
      recordingId,
      asset,
      policy: nextPolicy,
      order: nextClipOrder(),
      label: opts.label ?? asset.originalName,
      tags: opts.tags ?? null,
      playback: {
        loop,
        timelineStartSec: bounds.timelineStartSec,
        timelineDurationSec: bounds.timelineDurationSec,
        startOffsetMs: bounds.startOffsetMs,
        muted: true,
        objectFit: "cover",
      },
    });

    setDraftAttachments((current) => [...(current ?? []), draftAttachment]);
    setSelectedAttachmentId(draftAttachment.id);
    if (policy === "defaultOnly") {
      setDraftPolicy(nextPolicy);
    }
    setError(null);
  }

  function setIncludeSiteMedia(nextIncludeSiteMedia: boolean) {
    const enabled = attachments.filter((attachment) => attachment.enabled);
    if (!enabled.length) {
      setError("Add a clip to the timeline before changing site media.");
      return;
    }
    setDraftPolicy(policyFromIncludeSiteMedia(nextIncludeSiteMedia));
    updateDraft((current) =>
      applyDraftPolicy(current, policyFromIncludeSiteMedia(nextIncludeSiteMedia)),
    );
    setError(null);
  }

  function setClipLoop(attachmentId: string, loop: boolean) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const nextDurationSec = clipDurationAfterLoopChange(
      attachment,
      clip.startSec,
      timelineDurationSec,
      loop,
      clip.durationSec,
    );
    if (nextDurationSec <= 0) {
      setError("Clip cannot fit at this position with loop off.");
      return;
    }

    updateDraft((current) =>
      patchDraftAttachment(current, attachmentId, {
        playback: buildPlaybackPatch(attachment, {
          loop,
          timelineStartSec: clip.startSec,
          timelineDurationSec: nextDurationSec,
        }),
      }),
    );
    setError(null);
  }

  function setClipAudioPulse(attachmentId: string, enabled: boolean) {
    const attachment = getAttachmentSnapshot(attachmentId);
    if (!attachment) return;

    const beatFx = beatFxForAudioPulse(enabled, attachment.beatFx);
    updateDraft((current) => patchDraftAttachment(current, attachmentId, { beatFx }));
    setError(null);
  }

  function moveClip(attachmentId: string, nextStartSec: number) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const bounds = resolveClipMove(attachment, clip, nextStartSec, timelineDurationSec);
    if (!bounds) return;

    const topOrder = attachments.reduce((max, item) => Math.max(max, item.order), 0);
    const needsOrderBump = attachment.order < topOrder;
    commitClipBounds(attachmentId, bounds, needsOrderBump ? { order: topOrder + 1 } : {});
  }

  function resizeClipStart(attachmentId: string, nextStartSec: number) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const bounds = resolveClipResizeStart(attachment, clip, nextStartSec, timelineDurationSec);
    if (!bounds) return;
    commitClipBounds(attachmentId, bounds);
  }

  function resetClipTrim(attachmentId: string) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const bounds = resolveClipResetTrim(attachment, clip, timelineDurationSec);
    if (!bounds) return;
    commitClipBounds(attachmentId, bounds);
  }

  function resizeClip(attachmentId: string, nextDurationSec: number) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const bounds = resolveClipResizeEnd(attachment, clip, nextDurationSec, timelineDurationSec);
    if (!bounds) return;
    commitClipBounds(attachmentId, bounds);
  }

  function applyTrimAt(attachmentId: string, cutSec: number) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const trim = trimClipAtShortSide(clip, cutSec, timelineDurationSec);
    if (!trim) {
      setError("Click inside a clip to cut.");
      return;
    }

    if (trim.action === "delete") {
      commitDetach(attachmentId);
      return;
    }

    const topOrder = attachments.reduce((max, item) => Math.max(max, item.order), 0);
    const order = attachment.order < topOrder ? topOrder + 1 : undefined;
    commitClipBounds(attachmentId, {
      timelineStartSec: trim.timelineStartSec,
      timelineDurationSec: trim.timelineDurationSec,
      startOffsetMs: trim.startOffsetMs,
    }, order != null ? { order } : {});
  }

  function cutClipAt(attachmentId: string, cutSec: number) {
    applyTrimAt(attachmentId, cutSec);
  }

  function cutAtTime(cutSec: number) {
    const clip = findTopClipAtTime(timelineClips, cutSec);
    if (!clip) {
      setError("No clip at this position to cut.");
      return;
    }
    cutClipAt(clip.attachment.id, cutSec);
  }

  function copySelectedClip() {
    const attachment = attachments.find((item) => item.id === selectedAttachmentId);
    if (!attachment) return;
    setClipboard({
      mediaAssetId: attachment.mediaAssetId,
      label: attachment.label,
      policy: attachment.policy,
      playback: { ...(attachment.playback ?? {}) },
      beatFx: attachment.beatFx,
    });
  }

  async function pasteClipAt(startSec: number) {
    if (!clipboard) return;
    const asset = assetsQuery.data?.find((item) => item.id === clipboard.mediaAssetId);
    if (!asset) {
      setError("Copied clip source is no longer in your library.");
      return;
    }

    const playback = clipboard.playback as {
      loop?: boolean;
      timelineDurationSec?: number;
      startOffsetMs?: number;
    };
    const loop = playback.loop ?? defaultAssetLoop(asset);
    const stubAttachment = { mediaAsset: asset, playback: { loop, ...playback } } as unknown as SongVisualAttachmentRecord;
    const bounds = resolveClipInsert(stubAttachment, startSec, timelineDurationSec, {
      loop,
      durationSec: playback.timelineDurationSec,
      startOffsetMs: playback.startOffsetMs,
    });

    if (!bounds) {
      setError("No room on the timeline at the playhead.");
      return;
    }

    const draftAttachment = createDraftAttachment({
      recordingId,
      asset,
      policy: clipboard.policy,
      order: nextClipOrder(),
      label: clipboard.label ?? asset.originalName,
      playback: {
        ...clipboard.playback,
        loop,
        timelineStartSec: bounds.timelineStartSec,
        timelineDurationSec: bounds.timelineDurationSec,
        startOffsetMs: bounds.startOffsetMs,
        muted: true,
        objectFit: "cover",
      },
      beatFx: clipboard.beatFx,
    });

    setDraftAttachments((current) => [...(current ?? []), draftAttachment]);
    setSelectedAttachmentId(draftAttachment.id);
    setError(null);
  }

  function selectAttachment(attachmentId: string | null) {
    setSelectedAttachmentId(attachmentId);
  }

  function openUploadPicker() {
    fileInputRef.current?.click();
  }

  function cancelUpload() {
    uploadAbortRef.current?.abort();
    uploadMutation.reset();
  }

  function uploadFile(file: File) {
    const validationError = validateVisualUploadFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    uploadMutation.mutate(file);
  }

  const clearLibraryFocus = useCallback(() => {
    setLibraryFocusMineKind(null);
  }, []);

  async function attachExistingAsset(mediaAssetId: string, startSec?: number) {
    const asset = assetsQuery.data?.find((item) => item.id === mediaAssetId);
    if (!asset) return;
    await attachAssetToTimeline(asset, { startSec });
  }

  async function attachTheatrePreset(presetId: string, label: string, startSec?: number) {
    const assets = assetsQuery.data ?? [];
    const placeholder = await ensureTheatrePlaceholderAsset(accessToken, assets);
    await queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] });
    await attachAssetToTimeline(placeholder, {
      startSec,
      label,
      loop: true,
      tags: [theatrePresetTag(presetId)],
    });
  }

  async function attachLibraryRow(row: VisualLibraryRow, startSec?: number) {
    try {
      if (row.theatrePresetId) {
        await attachTheatrePreset(row.theatrePresetId, row.label, startSec);
        return;
      }

      const asset = row.asset
        ? await resolveLibraryAsset(row.asset)
        : row.importUrl
          ? await resolveImportUrl(row.importUrl, row.label, row.mediaType)
          : null;
      if (!asset) return;
      if (!row.asset) {
        await queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] });
      }
      await attachAssetToTimeline(asset, { startSec, label: row.label });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add media.");
    }
  }

  function saveChanges() {
    if (!isDirty || saveMutation.isPending) return;
    saveMutation.mutate();
  }

  function discardChanges() {
    if (!serverData) return;
    setDraftAttachments(cloneAttachments(serverData.attachments));
    setDraftPolicy(serverData.policy);
    setError(null);
  }

  const isUploading = uploadMutation.isPending;
  const isLibraryBusy =
    attachmentsQuery.isLoading ||
    isUploading ||
    deleteAssetMutation.isPending;

  const isBusy = isLibraryBusy || saveMutation.isPending;
  const hasClipboard = clipboard != null;

  return {
    attachments,
    assets: assetsQuery.data ?? [],
    includeSiteMedia,
    timelineClips,
    timelineDurationSec,
    selectedAttachmentId,
    clipSyncStatus: {} as Record<string, never>,
    error,
    isBusy,
    isUploading,
    uploadProgress,
    pendingUpload,
    cancelUpload,
    libraryFocusMineKind,
    clearLibraryFocus,
    isLibraryBusy,
    isSaving: saveMutation.isPending,
    isDirty,
    hasClipboard,
    fileInputRef,
    readClipAudioPulse,
    openUploadPicker,
    uploadFile,
    attachExistingAsset,
    attachLibraryRow,
    deleteAsset: deleteAssetMutation.mutate,
    setIncludeSiteMedia,
    setClipLoop,
    setClipAudioPulse,
    resizeClip,
    resizeClipStart,
    resetClipTrim,
    moveClip,
    cutClipAt,
    cutAtTime,
    copySelectedClip,
    pasteClipAt,
    selectAttachment,
    detachAttachment: commitDetach,
    saveChanges,
    discardChanges,
  };
}
