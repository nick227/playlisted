import { useState, type RefObject } from "react";

import type { authedApi } from "@/lib/authedApi";
import { bulkRegisterUploads, uploadAudioFile } from "@/lib/authedApi";
import { getAudioDurationSeconds } from "@/lib/getAudioDuration";

import type { PlaylistDetailWithTags, UploadQueueItem } from "./types";

type AuthedClient = ReturnType<typeof authedApi>;

export function useStudioCollectionUploadQueue({
  playlistId,
  accessToken,
  client,
  tracksInputRef,
  setDraft,
  setUploadError,
}: {
  playlistId: string | undefined;
  accessToken: string | null | undefined;
  client: AuthedClient;
  tracksInputRef: RefObject<HTMLInputElement | null>;
  setDraft: (playlist: PlaylistDetailWithTags) => void;
  setUploadError: (message: string | null) => void;
}) {
  const [trackUploadQueue, setTrackUploadQueue] = useState<UploadQueueItem[]>([]);

  async function handleTrackUpload(files: FileList | null) {
    if (!accessToken || !files?.length) return;

    setUploadError(null);
    const batch: UploadQueueItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      progress01: 0,
      status: "queued",
    }));
    setTrackUploadQueue(batch);

    try {
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];

        setTrackUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress01: 0 } : q)),
        );

        const uploaded = await uploadAudioFile(item.file, accessToken, {
          onProgress: (progress01) => {
            setTrackUploadQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress01 } : q)),
            );
          },
        });

        setTrackUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "registering", progress01: 1 } : q)),
        );

        await bulkRegisterUploads(
          [
            {
              url: uploaded.url,
              mimeType: uploaded.mimeType,
              bytes: uploaded.bytes,
              title: uploaded.title,
              durationSeconds: await getAudioDurationSeconds(item.file).catch(() => null),
            },
          ],
          playlistId!,
          accessToken,
        );

        setTrackUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "done" } : q)),
        );
      }

      const fresh = await client.playlists.getById(playlistId!);
      setDraft(fresh as PlaylistDetailWithTags);
      setTrackUploadQueue([]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
      setTrackUploadQueue((prev) =>
        prev.map((q) =>
          q.status === "done"
            ? q
            : {
                ...q,
                status: "error",
                error: error instanceof Error ? error.message : "Upload failed.",
              },
        ),
      );
    } finally {
      if (tracksInputRef.current) tracksInputRef.current.value = "";
    }
  }

  return {
    trackUploadQueue,
    handleTrackUpload,
  };
}
