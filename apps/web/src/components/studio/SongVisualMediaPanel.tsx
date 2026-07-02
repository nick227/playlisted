import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import {
  attachSongVisualMedia,
  detachSongVisualMedia,
  fetchSongVisualAttachments,
  listVisualMediaAssets,
  updateSongVisualAttachment,
  uploadVisualMediaFile,
} from "@/lib/visualMediaApi";
import type { SongVisualPolicy } from "@/theatre/media/types";
import { clearRemoteTrackVisualMedia } from "@/theatre/media/resolveTrackVisualMedia";

const POLICY_OPTIONS: Array<{ value: SongVisualPolicy; label: string }> = [
  { value: "preferAttached", label: "Prefer attached" },
  { value: "mixAttachedAndDefault", label: "Mix with default FX" },
  { value: "attachedOnly", label: "Attached only" },
];

type SongVisualMediaPanelProps = {
  recordingId: string;
  recordingTitle: string;
  accessToken: string;
};

export function SongVisualMediaPanel({
  recordingId,
  recordingTitle,
  accessToken,
}: SongVisualMediaPanelProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<SongVisualPolicy>("preferAttached");

  const attachmentsQuery = useQuery({
    queryKey: ["song-visual-media", recordingId],
    queryFn: () => fetchSongVisualAttachments(recordingId, accessToken),
  });

  const assetsQuery = useQuery({
    queryKey: ["visual-media-assets"],
    queryFn: () => listVisualMediaAssets(accessToken),
  });

  const attachMutation = useMutation({
    mutationFn: (body: Parameters<typeof attachSongVisualMedia>[2]) =>
      attachSongVisualMedia(recordingId, accessToken, body),
    onSuccess: async () => {
      clearRemoteTrackVisualMedia(recordingId);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["song-visual-media", recordingId] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Attach failed."),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVisualMediaFile(file, accessToken),
    onSuccess: async (asset) => {
      await attachMutation.mutateAsync({
        mediaAssetId: asset.id,
        policy,
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
    mutationFn: ({ attachmentId, body }: {
      attachmentId: string;
      body: Parameters<typeof updateSongVisualAttachment>[3];
    }) => updateSongVisualAttachment(recordingId, attachmentId, accessToken, body),
    onSuccess: async () => {
      clearRemoteTrackVisualMedia(recordingId);
      await queryClient.invalidateQueries({ queryKey: ["song-visual-media", recordingId] });
    },
  });

  const detachMutation = useMutation({
    mutationFn: (attachmentId: string) => detachSongVisualMedia(recordingId, attachmentId, accessToken),
    onSuccess: async () => {
      clearRemoteTrackVisualMedia(recordingId);
      await queryClient.invalidateQueries({ queryKey: ["song-visual-media", recordingId] });
    },
  });

  const attachments = attachmentsQuery.data?.attachments ?? [];
  const assets = assetsQuery.data ?? [];

  return (
    <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-black/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Theatre visuals
          </p>
          <p className="text-sm text-white/80">{recordingTitle}</p>
        </div>
        <select
          value={policy}
          onChange={(event) => setPolicy(event.target.value as SongVisualPolicy)}
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
        >
          {POLICY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      {attachments.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-white">
                  {attachment.label ?? attachment.mediaAsset.originalName}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {attachment.mediaAsset.mediaType} · {attachment.policy}
                </p>
              </div>
              <button
                type="button"
                onClick={() => detachMutation.mutate(attachment.id)}
                className="shrink-0 rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--color-text-muted)]">
          No attached visuals. Upload a video or image to play in theatre for this track.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending || attachMutation.isPending}
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
        >
          {uploadMutation.isPending ? "Uploading…" : "Upload visual"}
        </button>

        {assets.length > 0 ? (
          <select
            defaultValue=""
            onChange={(event) => {
              const mediaAssetId = event.target.value;
              if (!mediaAssetId) return;
              void attachMutation.mutateAsync({
                mediaAssetId,
                policy,
                beatFx: { enabled: true, intensity: "subtle", effects: ["scale", "brightness"] },
              });
              event.currentTarget.value = "";
            }}
            className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
          >
            <option value="">Attach existing…</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.originalName} ({asset.mediaType})
              </option>
            ))}
          </select>
        ) : null}

        {attachments[0] ? (
          <button
            type="button"
            onClick={() => updateMutation.mutate({
              attachmentId: attachments[0]!.id,
              body: { policy },
            })}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white hover:bg-white/10"
          >
            Apply policy
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) uploadMutation.mutate(file);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}
