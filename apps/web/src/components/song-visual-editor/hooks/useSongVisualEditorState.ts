import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

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
  buildPlaybackPatch,
  clampClipStart,
  clipDurationAfterLoopChange,
  defaultClipDurationSec,
  findTopClipAtTime,
  getClipLoop,
  getNaturalDurationSec,
  MIN_CLIP_SEC,
  readClipPlayback,
  resolveClipMoveStart,
  trimClipAtShortSide,
} from "../timelineLayout";
import { layoutTimelineClips, policyFromIncludeSiteMedia, policyIncludesSiteMedia } from "../types";

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
  const [error, setError] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [assetLoopPrefs, setAssetLoopPrefs] = useState<Record<string, boolean>>({});
  const [clipboard, setClipboard] = useState<ClipClipboard | null>(null);

  const attachmentsQuery = useQuery({
    queryKey: ["song-visual-media", recordingId],
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

  const invalidateSong = async () => {
    clearRemoteTrackVisualMedia(recordingId);
    await queryClient.invalidateQueries({ queryKey: ["song-visual-media", recordingId] });
  };

  const invalidateAssets = async () => {
    await queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] });
  };

  const attachMutation = useMutation({
    mutationFn: (body: Parameters<typeof attachSongVisualMedia>[2]) =>
      attachSongVisualMedia(recordingId, accessToken, body),
    onSuccess: async (attachment) => {
      setError(null);
      setSelectedAttachmentId(attachment.id);
      await invalidateSong();
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
    onSuccess: invalidateSong,
    onError: (err) => setError(err instanceof Error ? err.message : "Update failed."),
  });

  const detachMutation = useMutation({
    mutationFn: (attachmentId: string) => detachSongVisualMedia(recordingId, attachmentId, accessToken),
    onSuccess: async (_, attachmentId) => {
      if (selectedAttachmentId === attachmentId) setSelectedAttachmentId(null);
      await invalidateSong();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Remove failed."),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => deleteVisualMediaAsset(assetId, accessToken),
    onSuccess: async () => {
      setError(null);
      await Promise.all([invalidateAssets(), invalidateSong()]);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Delete failed."),
  });

  function getAssetLoopPref(asset: VisualMediaAssetRecord) {
    return assetLoopPrefs[asset.id] ?? defaultAssetLoop(asset);
  }

  function setAssetLoopPref(assetId: string, loop: boolean) {
    setAssetLoopPrefs((current) => ({ ...current, [assetId]: loop }));
  }

  function nextClipOrder() {
    return attachments.reduce((max, attachment) => Math.max(max, attachment.order), -1) + 1;
  }

  async function bringClipToFront(attachmentId: string) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) return;
    const topOrder = attachments.reduce((max, item) => Math.max(max, item.order), 0);
    if (attachment.order >= topOrder) return;
    await updateMutation.mutateAsync({
      attachmentId,
      body: { order: topOrder + 1 },
    });
  }

  async function attachAssetToTimeline(
    asset: VisualMediaAssetRecord,
    opts: { loop?: boolean; startSec?: number } = {},
  ) {
    const loop = opts.loop ?? getAssetLoopPref(asset);
    const startSec = opts.startSec ?? 0;
    const stubAttachment = {
      mediaAsset: asset,
      playback: { loop },
    } as SongVisualAttachmentRecord;
    const clipDurationSec = defaultClipDurationSec(stubAttachment, startSec, timelineDurationSec);

    await attachMutation.mutateAsync({
      mediaAssetId: asset.id,
      policy: policy === "defaultOnly" ? "preferAttached" : policy,
      order: nextClipOrder(),
      label: asset.originalName,
      playback: {
        loop,
        timelineStartSec: startSec,
        timelineDurationSec: clipDurationSec,
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
  }

  async function setClipLoop(attachmentId: string, loop: boolean) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    if (!attachment) return;

    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!clip) return;

    const nextDurationSec = clipDurationAfterLoopChange(
      attachment,
      clip.startSec,
      timelineDurationSec,
      loop,
      clip.durationSec,
    );

    await updateMutation.mutateAsync({
      attachmentId,
      body: {
        playback: buildPlaybackPatch(attachment, {
          loop,
          timelineStartSec: clip.startSec,
          timelineDurationSec: nextDurationSec,
        }),
      },
    });
  }

  async function moveClip(attachmentId: string, nextStartSec: number) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const resolvedStart = resolveClipMoveStart(clip, timelineClips, nextStartSec, timelineDurationSec);
    if (Math.abs(resolvedStart - clip.startSec) < 0.01) {
      await bringClipToFront(attachmentId);
      return;
    }

    await updateMutation.mutateAsync({
      attachmentId,
      body: {
        order: nextClipOrder(),
        playback: buildPlaybackPatch(attachment, { timelineStartSec: resolvedStart }),
      },
    });
  }

  async function resizeClipStart(attachmentId: string, nextStartSec: number) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const loop = getClipLoop(attachment);
    const playback = readClipPlayback(attachment);
    const endSec = clip.endSec;
    let startSec = Math.max(0, Math.min(nextStartSec, endSec - MIN_CLIP_SEC));

    let durationSec = endSec - startSec;
    let startOffsetMs = Math.max(0, (playback.startOffsetMs ?? 0) + Math.round((startSec - clip.startSec) * 1000));

    if (!loop) {
      const maxDuration = getNaturalDurationSec(attachment) - startOffsetMs / 1000;
      if (durationSec > maxDuration) {
        durationSec = Math.max(MIN_CLIP_SEC, maxDuration);
        startSec = endSec - durationSec;
        startOffsetMs = Math.max(0, (playback.startOffsetMs ?? 0) + Math.round((startSec - clip.startSec) * 1000));
      }
    }

    if (durationSec < MIN_CLIP_SEC) return;

    await updateMutation.mutateAsync({
      attachmentId,
      body: {
        playback: buildPlaybackPatch(attachment, {
          timelineStartSec: startSec,
          timelineDurationSec: durationSec,
          startOffsetMs,
        }),
      },
    });
  }

  async function applyTrimAt(attachmentId: string, cutSec: number) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const trim = trimClipAtShortSide(clip, cutSec);
    if (!trim) {
      setError("Click inside a clip to cut.");
      return;
    }

    setError(null);
    if (trim.action === "delete") {
      await detachMutation.mutateAsync(attachmentId);
      return;
    }

    await updateMutation.mutateAsync({
      attachmentId,
      body: {
        playback: buildPlaybackPatch(attachment, {
          timelineStartSec: trim.timelineStartSec,
          timelineDurationSec: trim.timelineDurationSec,
          startOffsetMs: trim.startOffsetMs,
        }),
      },
    });
  }

  async function cutClipAt(attachmentId: string, cutSec: number) {
    await bringClipToFront(attachmentId);
    await applyTrimAt(attachmentId, cutSec);
  }

  async function cutAtTime(cutSec: number) {
    const clip = findTopClipAtTime(timelineClips, cutSec);
    if (!clip) {
      setError("Click on a clip to cut.");
      return;
    }
    await applyTrimAt(clip.attachment.id, cutSec);
  }

  async function resizeClip(attachmentId: string, nextDurationSec: number) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const loop = getClipLoop(attachment);
    const maxDuration = loop
      ? timelineDurationSec - clip.startSec
      : Math.min(clip.naturalDurationSec - (readClipPlayback(attachment).startOffsetMs ?? 0) / 1000, timelineDurationSec - clip.startSec);
    const clipDurationSec = Math.min(Math.max(MIN_CLIP_SEC, nextDurationSec), Math.max(MIN_CLIP_SEC, maxDuration));

    await updateMutation.mutateAsync({
      attachmentId,
      body: {
        playback: buildPlaybackPatch(attachment, {
          timelineStartSec: clip.startSec,
          timelineDurationSec: clipDurationSec,
        }),
      },
    });
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

    const loop = Boolean((clipboard.playback as { loop?: boolean }).loop ?? defaultAssetLoop(asset));
    const stubAttachment = {
      mediaAsset: asset,
      playback: { loop, ...(clipboard.playback as object) },
    } as SongVisualAttachmentRecord;
    const clipDurationSec = (clipboard.playback as { timelineDurationSec?: number }).timelineDurationSec
      ?? defaultClipDurationSec(stubAttachment, startSec, timelineDurationSec);

    await attachMutation.mutateAsync({
      mediaAssetId: clipboard.mediaAssetId,
      policy: clipboard.policy,
      order: nextClipOrder(),
      label: clipboard.label ?? asset.originalName,
      playback: {
        ...clipboard.playback,
        timelineStartSec: clampClipStart(startSec, clipDurationSec, timelineDurationSec),
        timelineDurationSec: clipDurationSec,
        muted: true,
        objectFit: "cover",
      },
      beatFx: clipboard.beatFx ?? undefined,
    });
  }

  function selectAttachment(attachmentId: string | null) {
    setSelectedAttachmentId(attachmentId);
    if (attachmentId) void bringClipToFront(attachmentId);
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

  const isBusy =
    attachmentsQuery.isLoading ||
    uploadMutation.isPending ||
    attachMutation.isPending ||
    updateMutation.isPending ||
    detachMutation.isPending ||
    deleteAssetMutation.isPending;

  const hasClipboard = clipboard != null;

  return {
    attachments,
    assets: assetsQuery.data ?? [],
    includeSiteMedia,
    timelineClips,
    timelineDurationSec,
    selectedAttachmentId,
    error,
    isBusy,
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
    detachAttachment: detachMutation.mutate,
  };
}
