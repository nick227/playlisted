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
import { clearRemoteTrackVisualMedia } from "@/theatre/media/resolveTrackVisualMedia";

import {
  buildPlaybackPatch,
  clipDurationAfterLoopChange,
  defaultClipDurationSec,
  getClipLoop,
  getRemainingTimelineSec,
} from "../timelineLayout";
import { layoutTimelineClips, policyFromIncludeSiteMedia, policyIncludesSiteMedia } from "../types";

const MIN_REMAINING_SEC = 0.5;

type UseSongVisualEditorStateArgs = {
  recordingId: string;
  accessToken: string;
  durationSeconds?: number | null;
};

export function useSongVisualEditorState({
  recordingId,
  accessToken,
  durationSeconds,
}: UseSongVisualEditorStateArgs) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);

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

  const remainingTimelineSec = useMemo(
    () => getRemainingTimelineSec(timelineClips, timelineDurationSec),
    [timelineClips, timelineDurationSec],
  );

  const attachedAssetIds = useMemo(
    () => new Set(attachments.filter((attachment) => attachment.enabled).map((attachment) => attachment.mediaAssetId)),
    [attachments],
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
      await attachAssetToTimeline(asset);
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

  function assertTimelineSpace() {
    if (remainingTimelineSec < MIN_REMAINING_SEC) {
      setError("Timeline is full. Shorten, remove a clip, or disable loop stretch on a clip before adding more.");
      return false;
    }
    setError(null);
    return true;
  }

  async function attachAssetToTimeline(asset: VisualMediaAssetRecord) {
    if (!assertTimelineSpace()) return;

    const startSec = timelineClips.at(-1)?.endSec ?? 0;
    const loop = asset.mediaType === "video";
    const stubAttachment = {
      mediaAsset: asset,
      playback: { loop },
    } as SongVisualAttachmentRecord;
    const clipDurationSec = defaultClipDurationSec(stubAttachment, startSec, timelineDurationSec);

    await attachMutation.mutateAsync({
      mediaAssetId: asset.id,
      policy: policy === "defaultOnly" ? "preferAttached" : policy,
      order: timelineClips.length,
      label: asset.originalName,
      playback: { loop, timelineDurationSec: clipDurationSec, muted: true, objectFit: "cover" },
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
      body: { playback: buildPlaybackPatch(attachment, { loop, timelineDurationSec: nextDurationSec }) },
    });
  }

  async function resizeClip(attachmentId: string, nextDurationSec: number) {
    const attachment = attachments.find((item) => item.id === attachmentId);
    const clip = timelineClips.find((item) => item.attachment.id === attachmentId);
    if (!attachment || !clip) return;

    const loop = getClipLoop(attachment);
    const maxDuration = loop
      ? timelineDurationSec - clip.startSec
      : Math.min(clip.naturalDurationSec, timelineDurationSec - clip.startSec);
    const clipDurationSec = Math.min(Math.max(0.5, nextDurationSec), maxDuration);

    await updateMutation.mutateAsync({
      attachmentId,
      body: { playback: buildPlaybackPatch(attachment, { timelineDurationSec: clipDurationSec }) },
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

  async function attachExistingAsset(mediaAssetId: string) {
    if (attachedAssetIds.has(mediaAssetId)) {
      setError("This asset is already on the timeline.");
      return;
    }
    const asset = assetsQuery.data?.find((item) => item.id === mediaAssetId);
    if (!asset) return;
    await attachAssetToTimeline(asset);
  }

  const selectedAttachment: SongVisualAttachmentRecord | null =
    attachments.find((attachment) => attachment.id === selectedAttachmentId) ?? null;

  const isBusy =
    attachmentsQuery.isLoading ||
    uploadMutation.isPending ||
    attachMutation.isPending ||
    updateMutation.isPending ||
    detachMutation.isPending ||
    deleteAssetMutation.isPending;

  return {
    attachments,
    assets: assetsQuery.data ?? [],
    attachedAssetIds,
    includeSiteMedia,
    timelineClips,
    timelineDurationSec,
    remainingTimelineSec,
    selectedAttachment,
    selectedAttachmentId,
    error,
    isBusy,
    fileInputRef,
    openUploadPicker,
    uploadFile,
    attachExistingAsset,
    deleteAsset: deleteAssetMutation.mutate,
    setIncludeSiteMedia,
    setClipLoop,
    resizeClip,
    selectAttachment,
    detachAttachment: detachMutation.mutate,
  };
}
