import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { authedApi } from "@/lib/authedApi";
import { uploadImageFile } from "@/lib/authedApi";

import type { PlaylistDetailWithTags, RecordingWithTags } from "./types";

type AuthedClient = ReturnType<typeof authedApi>;

export function useStudioRecordingMetadata({
  playlist,
  playlistId,
  accessToken,
  client,
  setDraft,
}: {
  playlist: PlaylistDetailWithTags | undefined;
  playlistId: string | undefined;
  accessToken: string | null | undefined;
  client: AuthedClient;
  setDraft: (playlist: PlaylistDetailWithTags) => void;
}) {
  const queryClient = useQueryClient();
  const [savingRecordingIds, setSavingRecordingIds] = useState<Record<string, boolean>>({});
  const [recordingErrors, setRecordingErrors] = useState<Record<string, string | undefined>>({});

  function setSaving(recordingId: string, saving: boolean) {
    setSavingRecordingIds((prev) => ({ ...prev, [recordingId]: saving }));
  }

  function setError(recordingId: string, message: string | undefined) {
    setRecordingErrors((prev) => ({ ...prev, [recordingId]: message }));
  }

  function updateDraftRecording(recordingId: string, updated: Partial<RecordingWithTags>) {
    if (!playlist) return;

    setDraft({
      ...playlist,
      recordings: playlist.recordings.map((recording) =>
        recording.id === recordingId ? { ...recording, ...updated, tags: recording.tags } : recording,
      ),
    });
  }

  function invalidateRecordingSurfaces() {
    queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    queryClient.invalidateQueries({ queryKey: ["playlist", playlistId, "edit"] });
    queryClient.invalidateQueries({ queryKey: ["playlists"] });
    queryClient.invalidateQueries({ queryKey: ["search"] });
  }

  const updateRecordingMutation = useMutation({
    mutationFn: ({ recordingId, body }: {
      recordingId: string;
      body: Parameters<AuthedClient["recordings"]["update"]>[1];
    }) => client.recordings.update(recordingId, body),
    onSuccess: (updated, variables) => {
      updateDraftRecording(variables.recordingId, {
        title: updated.title,
        artworkUrl: updated.artworkUrl ?? null,
        updatedAt: updated.updatedAt,
      });
      setError(variables.recordingId, undefined);
      invalidateRecordingSurfaces();
    },
    onError: (error, variables) => {
      setError(
        variables.recordingId,
        error instanceof Error ? error.message : "Failed to update track.",
      );
    },
    onSettled: (_data, _error, variables) => {
      setSaving(variables.recordingId, false);
    },
  });

  function handleUpdateRecordingTitle(recordingId: string, title: string) {
    setSaving(recordingId, true);
    setError(recordingId, undefined);
    updateRecordingMutation.mutate({ recordingId, body: { title } });
  }

  async function handleUpdateRecordingArtwork(recordingId: string, file: File) {
    if (!accessToken) return;

    setSaving(recordingId, true);
    setError(recordingId, undefined);

    try {
      const uploaded = await uploadImageFile(file, accessToken);
      await updateRecordingMutation.mutateAsync({
        recordingId,
        body: { artworkUrl: uploaded.url },
      });
    } catch (error) {
      setError(recordingId, error instanceof Error ? error.message : "Failed to update track art.");
      setSaving(recordingId, false);
    }
  }

  return {
    savingRecordingIds,
    recordingErrors,
    handleUpdateRecordingTitle,
    handleUpdateRecordingArtwork,
  };
}
