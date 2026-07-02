import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";

import {
  attachSongVisualMedia,
  detachSongVisualMedia,
  fetchSongVisualAttachments,
  listVisualMediaAssets,
  updateSongVisualAttachment,
  uploadVisualMediaFile,
  type SongVisualAttachmentRecord,
} from "@/lib/visualMediaApi";
import type { SongVisualPolicy } from "@/theatre/media/types";
import { clearRemoteTrackVisualMedia } from "@/theatre/media/resolveTrackVisualMedia";

import { layoutTimelineClips } from "../types";

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
  const enabledAttachments = attachments.filter((attachment) => attachment.enabled);
  const timelineDurationSec = durationSeconds && durationSeconds > 0
    ? durationSeconds
    : attachmentsQuery.data
      ? Math.max(30, enabledAttachments.length * 15)
      : 30;

  const timelineClips = useMemo(
    () => layoutTimelineClips(attachments, timelineDurationSec),
    [attachments, timelineDurationSec],
  );

  const invalidate = async () => {
    clearRemoteTrackVisualMedia(recordingId);
    await queryClient.invalidateQueries({ queryKey: ["song-visual-media", recordingId] });
  };

  const attachMutation = useMutation({
    mutationFn: (body: Parameters<typeof attachSongVisualMedia>[2]) =>
      attachSongVisualMedia(recordingId, accessToken, body),
    onSuccess: async (attachment) => {
      setError(null);
      setSelectedAttachmentId(attachment.id);
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Attach failed."),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVisualMediaFile(file, accessToken),
    onSuccess: async (asset) => {
      await attachMutation.mutateAsync({
        mediaAssetId: asset.id,
        policy: policy === "defaultOnly" ? "preferAttached" : policy,
        order: enabledAttachments.length,
        label: asset.originalName,
        beatFx: asset.mediaType === "video"
          ? { enabled: true, intensity: "subtle", effects: ["scale", "brightness"] }
          : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["visual-media-assets"] });
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
    onSuccess: invalidate,
    onError: (err) => setError(err instanceof Error ? err.message : "Update failed."),
  });

  const detachMutation = useMutation({
    mutationFn: (attachmentId: string) => detachSongVisualMedia(recordingId, attachmentId, accessToken),
    onSuccess: async (_, attachmentId) => {
      if (selectedAttachmentId === attachmentId) setSelectedAttachmentId(null);
      await invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Remove failed."),
  });

  async function applyPolicy(nextPolicy: SongVisualPolicy) {
    if (nextPolicy === "defaultOnly") return;
    const target = enabledAttachments[0];
    if (!target) {
      setError("Attach at least one visual before setting policy.");
      return;
    }
    await updateMutation.mutateAsync({
      attachmentId: target.id,
      body: { policy: nextPolicy },
    });
  }

  async function reorderAttachment(attachmentId: string, direction: -1 | 1) {
    const ordered = [...enabledAttachments].sort((left, right) => left.order - right.order);
    const index = ordered.findIndex((attachment) => attachment.id === attachmentId);
    if (index < 0) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const current = ordered[index]!;
    const swap = ordered[targetIndex]!;
    await Promise.all([
      updateMutation.mutateAsync({ attachmentId: current.id, body: { order: swap.order } }),
      updateMutation.mutateAsync({ attachmentId: swap.id, body: { order: current.order } }),
    ]);
  }

  function selectAttachment(attachmentId: string | null) {
    setSelectedAttachmentId(attachmentId);
  }

  function openUploadPicker() {
    fileInputRef.current?.click();
  }

  async function attachExistingAsset(mediaAssetId: string) {
    await attachMutation.mutateAsync({
      mediaAssetId,
      policy: policy === "defaultOnly" ? "preferAttached" : policy,
      order: enabledAttachments.length,
      beatFx: { enabled: true, intensity: "subtle", effects: ["scale", "brightness"] },
    });
  }

  const selectedAttachment: SongVisualAttachmentRecord | null =
    attachments.find((attachment) => attachment.id === selectedAttachmentId) ?? null;

  const isBusy =
    attachmentsQuery.isLoading ||
    uploadMutation.isPending ||
    attachMutation.isPending ||
    updateMutation.isPending ||
    detachMutation.isPending;

  return {
    attachments,
    assets: assetsQuery.data ?? [],
    policy,
    timelineClips,
    timelineDurationSec,
    selectedAttachment,
    selectedAttachmentId,
    error,
    isBusy,
    fileInputRef,
    openUploadPicker,
    attachExistingAsset,
    applyPolicy,
    reorderAttachment,
    selectAttachment,
    detachAttachment: detachMutation.mutate,
    uploadFile: uploadMutation.mutate,
  };
}
