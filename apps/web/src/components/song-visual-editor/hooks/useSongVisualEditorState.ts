import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";

import { validateVisualUploadFile } from "@/lib/visualUploadLimits";
import {
  attachSongVisualMedia,
  deleteVisualMediaAsset,
  detachSongVisualMedia,
  fetchSongVisualAttachments,
  listVisualMediaAssets,
  updateSongVisualAttachment,
  uploadVisualMediaFile,
  type SongVisualAttachmentRecord,
  type VisualMediaAssetRecord,
} from "@/lib/visualMediaApi";
import type { VisualMediaBeatFx } from "@/theatre/media/types";
import { clearRemoteTrackVisualMedia } from "@/theatre/media/resolveTrackVisualMedia";

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
  trimClipAtShortSide,
  type ClipBounds,
} from "../timelineLayout";
import { layoutTimelineClips, policyFromIncludeSiteMedia, policyIncludesSiteMedia } from "../types";
import {
  applyClipBoundsPatch,
  applyLoopPatch,
  cloneAttachment,
  readSongVisualData,
  reconcileAttachmentInCache,
  removeAttachmentFromCache,
  restoreAttachmentInCache,
  songVisualQueryKey,
  type ClipSyncStatus,
} from "./optimisticSongVisualCache";

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
  const rollbackSnapshots = useRef<Map<string, SongVisualAttachmentRecord>>(new Map());
  const commitGeneration = useRef<Map<string, number>>(new Map());

  const [error, setError] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [assetLoopPrefs, setAssetLoopPrefs] = useState<Record<string, boolean>>({});
  const [clipboard, setClipboard] = useState<ClipClipboard | null>(null);
  const [clipSyncStatus, setClipSyncStatus] = useState<Record<string, ClipSyncStatus>>({});

  const attachmentsQuery = useQuery({
    queryKey: songVisualQueryKey(recordingId),
    queryFn: () => fetchSongVisualAttachments(recordingId, accessToken),
  });

  const assetsQuery = useQuery({
    queryKey: ["visual-media-assets"],
    queryFn: () => listVisualMediaAssets(accessToken),
  });

  const attachments = attachmentsQuery.data?.attachments ?? [];
  const policy = attachmentsQuery.data?.policy ?? "preferAttached";
  const includeSiteMedia = policyIncludesSiteMedia(policy);
  const timelineDurationSec = durationSeconds && durationSeconds > 0 ? durationSeconds : 120;

  const timelineClips = useMemo(
    () => layoutTimelineClips(attachments, timelineDurationSec),
    [attachments, timelineDurationSec],
  );

  const setClipStatus = useCallback((attachmentId: string, status: ClipSyncStatus | null) => {
    setClipSyncStatus((current) => {
      if (status == null) {
        if (!(attachmentId in current)) return current;
        const next = { ...current };
        delete next[attachmentId];
        return next;
      }
      return { ...current, [attachmentId]: status };
    });
  }, []);

  const rememberRollback = useCallback((attachment: SongVisualAttachmentRecord) => {
    rollbackSnapshots.current.set(attachment.id, cloneAttachment(attachment));
  }, []);

  const rollbackClip = useCallback((attachmentId: string) => {
    const snapshot = rollbackSnapshots.current.get(attachmentId);
    if (snapshot) {
      restoreAttachmentInCache(queryClient, recordingId, snapshot);
    }
    rollbackSnapshots.current.delete(attachmentId);
  }, [queryClient, recordingId]);

  const finishClipSync = useCallback((
    attachmentId: string,
    generation: number,
    updated?: SongVisualAttachmentRecord,
  ) => {
    if (commitGeneration.current.get(attachmentId) !== generation) return;
    if (updated) {
      reconcileAttachmentInCache(queryClient, recordingId, updated);
    }
    rollbackSnapshots.current.delete(attachmentId);
    commitGeneration.current.delete(attachmentId);
    setClipStatus(attachmentId, null);
    clearRemoteTrackVisualMedia(recordingId);
  }, [queryClient, recordingId, setClipStatus]);

  const invalidateAssets = async () => {
    await queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] });
  };

  const attachMutation = useMutation({
    mutationFn: (body: Parameters<typeof attachSongVisualMedia>[2]) =>
      attachSongVisualMedia(recordingId, accessToken, body),
    onSuccess: async (attachment) => {
      setError(null);
      setSelectedAttachmentId(attachment.id);
      reconcileAttachmentInCache(queryClient, recordingId, attachment);
      clearRemoteTrackVisualMedia(recordingId);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Attach failed."),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVisualMediaFile(file, accessToken),
    onSuccess: async (asset) => {
      await attachAssetToTimeline(asset, { startSec: 0 });
      await invalidateAssets();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Upload failed."),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      attachmentId,
      body,
    }: {
      attachmentId: string;
      body: Parameters<typeof updateSongVisualAttachment>[3];
    }) => updateSongVisualAttachment(recordingId, attachmentId, accessToken, body),
  });

  const detachMutation = useMutation({
    mutationFn: (attachmentId: string) => detachSongVisualMedia(recordingId, attachmentId, accessToken),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => deleteVisualMediaAsset(assetId, accessToken),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        invalidateAssets(),
        queryClient.invalidateQueries({ queryKey: songVisualQueryKey(recordingId) }),
      ]);
      clearRemoteTrackVisualMedia(recordingId);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Delete failed."),
  });

  function getAssetLoopPref(asset: VisualMediaAssetRecord) {
    return assetLoopPrefs[asset.id] ?? defaultAssetLoop(asset);
  }

  function setAssetLoopPref(assetId: string, loop: boolean) {
    setAssetLoopPrefs((current) => ({ ...current, [assetId]: loop }));
  }

  function nextClipOrder(source = attachments) {
    return source.reduce((max, attachment) => Math.max(max, attachment.order), -1) + 1;
  }

  function getAttachmentSnapshot(attachmentId: string) {
    const data = readSongVisualData(queryClient, recordingId);
    return data?.attachments.find((item) => item.id === attachmentId) ?? null;
  }

  function commitClipBounds(
    attachmentId: string,
    bounds: ClipBounds,
    opts: { order?: number } = {},
  ) {
    const attachment = getAttachmentSnapshot(attachmentId);
    const clip = layoutTimelineClips(
      readSongVisualData(queryClient, recordingId)?.attachments ?? attachments,
      timelineDurationSec,
    ).find((item) => item.attachment.id === attachmentId);

    if (!attachment || !clip) return;

    const currentOffsetMs = readClipPlayback(attachment).startOffsetMs ?? 0;
    if (boundsNearlyEqual(bounds, clip, currentOffsetMs) && opts.order == null) return;

    const generation = (commitGeneration.current.get(attachmentId) ?? 0) + 1;
    commitGeneration.current.set(attachmentId, generation);
    rememberRollback(attachment);
    applyClipBoundsPatch(queryClient, recordingId, attachmentId, attachment, bounds, opts.order);
    setClipStatus(attachmentId, "saving");
    setError(null);

    void updateMutation.mutateAsync({
      attachmentId,
      body: {
        ...(opts.order != null ? { order: opts.order } : {}),
        playback: buildPlaybackPatch(attachment, {
          timelineStartSec: bounds.timelineStartSec,
          timelineDurationSec: bounds.timelineDurationSec,
          startOffsetMs: bounds.startOffsetMs,
        }),
      },
    }).then((updated) => {
      finishClipSync(attachmentId, generation, updated);
    }).catch((err) => {
      if (commitGeneration.current.get(attachmentId) !== generation) return;
      rollbackClip(attachmentId);
      commitGeneration.current.delete(attachmentId);
      setClipStatus(attachmentId, "error");
      setError(err instanceof Error ? err.message : "Could not save clip changes.");
      window.setTimeout(() => setClipStatus(attachmentId, null), 2400);
    });
  }

  function commitDetach(attachmentId: string) {
    const attachment = getAttachmentSnapshot(attachmentId);
    if (!attachment) return;

    const generation = (commitGeneration.current.get(attachmentId) ?? 0) + 1;
    commitGeneration.current.set(attachmentId, generation);
    removeAttachmentFromCache(queryClient, recordingId, attachmentId);
    if (selectedAttachmentId === attachmentId) setSelectedAttachmentId(null);
    setClipStatus(attachmentId, "saving");
    setError(null);

    void detachMutation.mutateAsync(attachmentId).then(() => {
      if (commitGeneration.current.get(attachmentId) !== generation) return;
      rollbackSnapshots.current.delete(attachmentId);
      commitGeneration.current.delete(attachmentId);
      setClipStatus(attachmentId, null);
      clearRemoteTrackVisualMedia(recordingId);
    }).catch((err) => {
      if (commitGeneration.current.get(attachmentId) !== generation) return;
      rollbackClip(attachmentId);
      commitGeneration.current.delete(attachmentId);
      setClipStatus(attachmentId, "error");
      setError(err instanceof Error ? err.message : "Could not remove clip.");
      window.setTimeout(() => setClipStatus(attachmentId, null), 2400);
    });
  }

  async function attachAssetToTimeline(
    asset: VisualMediaAssetRecord,
    opts: { loop?: boolean; startSec?: number } = {},
  ) {
    const loop = opts.loop ?? getAssetLoopPref(asset);
    const requestedStart = opts.startSec ?? 0;
    const stubAttachment = { mediaAsset: asset } as SongVisualAttachmentRecord;
    const bounds = resolveClipInsert(stubAttachment, requestedStart, timelineDurationSec, { loop });

    if (!bounds) {
      setError("No room on the timeline at this position.");
      return;
    }

    setError(null);
    await attachMutation.mutateAsync({
      mediaAssetId: asset.id,
      policy: policy === "defaultOnly" ? "preferAttached" : policy,
      order: nextClipOrder(),
      label: asset.originalName,
      playback: {
        loop,
        timelineStartSec: bounds.timelineStartSec,
        timelineDurationSec: bounds.timelineDurationSec,
        startOffsetMs: bounds.startOffsetMs,
        muted: true,
        objectFit: "cover",
      },
      beatFx: asset.mediaType === "video"
        ? { enabled: true, intensity: "subtle", effects: ["scale", "brightness"] }
        : undefined,
    });
  }

  async function setIncludeSiteMedia(nextIncludeSiteMedia: boolean) {
    const target = attachments.find((attachment) => attachment.enabled);
    if (!target) {
      setError("Add a clip to the timeline before changing site media.");
      return;
    }
    setError(null);
    await updateMutation.mutateAsync({
      attachmentId: target.id,
      body: { policy: policyFromIncludeSiteMedia(nextIncludeSiteMedia) },
    });
    clearRemoteTrackVisualMedia(recordingId);
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

    const generation = (commitGeneration.current.get(attachmentId) ?? 0) + 1;
    commitGeneration.current.set(attachmentId, generation);
    rememberRollback(attachment);
    applyLoopPatch(queryClient, recordingId, attachmentId, attachment, loop, clip.startSec, nextDurationSec);
    setClipStatus(attachmentId, "saving");
    setError(null);

    void updateMutation.mutateAsync({
      attachmentId,
      body: {
        playback: buildPlaybackPatch(attachment, {
          loop,
          timelineStartSec: clip.startSec,
          timelineDurationSec: nextDurationSec,
        }),
      },
    }).then((updated) => {
      finishClipSync(attachmentId, generation, updated);
    }).catch((err) => {
      if (commitGeneration.current.get(attachmentId) !== generation) return;
      rollbackClip(attachmentId);
      commitGeneration.current.delete(attachmentId);
      setClipStatus(attachmentId, "error");
      setError(err instanceof Error ? err.message : "Could not update loop.");
      window.setTimeout(() => setClipStatus(attachmentId, null), 2400);
    });
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
      setError("Click on a clip to cut.");
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
    const stubAttachment = { mediaAsset: asset, playback: { loop, ...playback } } as SongVisualAttachmentRecord;
    const bounds = resolveClipInsert(stubAttachment, startSec, timelineDurationSec, {
      loop,
      durationSec: playback.timelineDurationSec,
      startOffsetMs: playback.startOffsetMs,
    });

    if (!bounds) {
      setError("No room on the timeline at the playhead.");
      return;
    }

    setError(null);
    await attachMutation.mutateAsync({
      mediaAssetId: clipboard.mediaAssetId,
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
      beatFx: clipboard.beatFx ?? undefined,
    });
  }

  function selectAttachment(attachmentId: string | null) {
    setSelectedAttachmentId(attachmentId);
  }

  function openUploadPicker() {
    fileInputRef.current?.click();
  }

  function uploadFile(file: File) {
    const validationError = validateVisualUploadFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    uploadMutation.mutate(file);
  }

  async function attachExistingAsset(mediaAssetId: string, startSec?: number) {
    const asset = assetsQuery.data?.find((item) => item.id === mediaAssetId);
    if (!asset) return;
    await attachAssetToTimeline(asset, { startSec });
  }

  const isLibraryBusy =
    attachmentsQuery.isLoading ||
    uploadMutation.isPending ||
    attachMutation.isPending ||
    deleteAssetMutation.isPending;

  const isBusy = isLibraryBusy;

  const hasClipboard = clipboard != null;
  const isSavingTimeline = Object.keys(clipSyncStatus).length > 0;

  return {
    attachments,
    assets: assetsQuery.data ?? [],
    includeSiteMedia,
    timelineClips,
    timelineDurationSec,
    selectedAttachmentId,
    clipSyncStatus,
    error,
    isBusy,
    isLibraryBusy,
    isSavingTimeline,
    hasClipboard,
    fileInputRef,
    getAssetLoopPref,
    setAssetLoopPref,
    openUploadPicker,
    uploadFile,
    attachExistingAsset,
    deleteAsset: deleteAssetMutation.mutate,
    setIncludeSiteMedia,
    setClipLoop,
    resizeClip,
    resizeClipStart,
    moveClip,
    cutClipAt,
    cutAtTime,
    copySelectedClip,
    pasteClipAt,
    selectAttachment,
    detachAttachment: commitDetach,
  };
}
