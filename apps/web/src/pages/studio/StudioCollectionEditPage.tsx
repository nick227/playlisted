import type { PlaylistDetail } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { CollectionView } from "@/components/collection/CollectionView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { TrackUploadQueue } from "@/components/uploads/TrackUploadQueue";
import { authedApi, bulkRegisterUploads, uploadAudioFile, uploadImageFile } from "@/lib/authedApi";
import { getAudioDurationSeconds } from "@/lib/getAudioDuration";
import { playlistPath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

type UploadQueueItem = {
  id: string;
  file: File;
  progress01: number;
  status: "queued" | "uploading" | "registering" | "adding" | "done" | "error";
  error?: string;
};

export function StudioCollectionEditPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { setQueue, currentTrack, state, togglePlay, playbackContext, updateQueuePlaylistTitle } = useAudioPlayer();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PlaylistDetail | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [trackUploadQueue, setTrackUploadQueue] = useState<UploadQueueItem[]>([]);

  const client = authedApi(accessToken);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["playlist", playlistId, "edit"],
    queryFn: () => client.playlists.getById(playlistId!),
    enabled: Boolean(playlistId && accessToken),
  });

  const playlist = draft ?? data;

  const lastSavedTitleRef = useRef<string | undefined>(undefined);
  const lastSavedDescriptionRef = useRef<string | null | undefined>(undefined);

  if (data && lastSavedTitleRef.current === undefined) {
    lastSavedTitleRef.current = data.title;
    lastSavedDescriptionRef.current = data.description;
  }

  useEffect(() => {
    if (!playlist) return;

    const currentTitle = playlist.title;
    const currentDescription = playlist.description;

    const hasChanges =
      (lastSavedTitleRef.current !== undefined && currentTitle !== lastSavedTitleRef.current) ||
      (lastSavedDescriptionRef.current !== undefined && currentDescription !== lastSavedDescriptionRef.current);

    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveMutation.mutate({
        title: currentTitle,
        description: currentDescription ?? null,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [playlist?.title, playlist?.description]);

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<typeof client.playlists.update>[1]) =>
      client.playlists.update(playlistId!, body),
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;

      if (playbackContext.playlistId === updated.id) {
        updateQueuePlaylistTitle(updated.id, updated.title);
      }
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (visibility: PlaylistDetail["visibility"]) =>
      client.playlists.update(playlistId!, {
        visibility,
        ...(visibility === "PUBLIC" ? { status: "PUBLISHED" } : {}),
      }),
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
    },
  });

  const addTrackMutation = useMutation({
    mutationFn: (recordingId: string) => client.playlists.addItem(playlistId!, recordingId),
    onSuccess: (updated) => {
      setDraft(updated);
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
    },
  });

  const removeTrackMutation = useMutation({
    mutationFn: (recordingId: string) => client.playlists.removeItem(playlistId!, recordingId),
    onSuccess: (updated) => {
      setDraft(updated);
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (recordingIds: string[]) => client.playlists.reorderItems(playlistId!, recordingIds),
    onSuccess: (updated) => {
      setDraft(updated);
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.playlists.delete(playlistId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      window.location.href = "/studio/collections";
    },
  });

  if (isLoading || !playlist) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  if (isError) {
    return <EmptyState title="Collection not found" />;
  }

  const collection = playlist;

  const queueTracks: QueueTrack[] = collection.recordings.map((r) => ({
    ...r,
    playlistTitle: collection.title,
    ownerName: collection.owner.displayName,
  }));

  function playRecording(recordingId: string) {
    const index = queueTracks.findIndex((t) => t.id === recordingId);
    if (index < 0) return;

    if (currentTrack?.id === recordingId) {
      togglePlay();
      return;
    }

    setQueue(queueTracks, index, { playlistId: collection.id, sourceContext: "studio-editor" });
  }

  function moveTrack(recordingId: string, direction: -1 | 1) {
    const ids = collection.recordings.map((r) => r.id);
    const index = ids.indexOf(recordingId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMutation.mutate(next);
  }

  async function handleCoverFile(file: File) {
    if (!accessToken) return;
    const uploaded = await uploadImageFile(file, accessToken);
    const updated = await saveMutation.mutateAsync({ coverArtUrl: uploaded.url });
    setDraft(updated);
  }

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

        const registered = await bulkRegisterUploads(
          [
            {
              url: uploaded.url,
              mimeType: uploaded.mimeType,
              bytes: uploaded.bytes,
              title: uploaded.title,
              durationSeconds: await getAudioDurationSeconds(item.file).catch(() => null),
            },
          ],
          accessToken,
        );

        const recording = registered.recordings[0];

        setTrackUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "adding" } : q)),
        );

        await addTrackMutation.mutateAsync(recording.id);

        setTrackUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "done" } : q)),
        );
      }

      const fresh = await client.playlists.getById(playlistId!);
      setDraft(fresh);
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

  return (
    <>
      <CollectionView
        playlist={playlist}
        mode="edit"
        activeTrackId={currentTrack?.id}
        playerState={state}
        onTitleChange={(title) => setDraft({ ...playlist, title })}
        onDescriptionChange={(description) => setDraft({ ...playlist, description })}
        onCoverClick={() => coverInputRef.current?.click()}
        onAddTracks={() => tracksInputRef.current?.click()}
        onPlayTrack={(recording) => playRecording(recording.id)}
        onRemoveTrack={(recordingId) => removeTrackMutation.mutate(recordingId)}
        onMoveTrackUp={(recordingId) => moveTrack(recordingId, -1)}
        onMoveTrackDown={(recordingId) => moveTrack(recordingId, 1)}
        uploadProgress={
          trackUploadQueue.length > 0 ? (
            <TrackUploadQueue
              items={trackUploadQueue.map((q) => ({
                id: q.id,
                name: q.file.name,
                progress01: q.progress01,
                status: q.status,
                error: q.error,
              }))}
            />
          ) : null
        }
        editToolbar={
          <>
            <div className="flex items-center gap-2 rounded-full border border-white/20 p-1">
              <button
                type="button"
                onClick={() => visibilityMutation.mutate("PUBLIC")}
                disabled={visibilityMutation.isPending}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  playlist.visibility === "PUBLIC" ? "bg-white text-black" : "text-white hover:bg-white/10"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => visibilityMutation.mutate("PRIVATE")}
                disabled={visibilityMutation.isPending}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  playlist.visibility === "PRIVATE" ? "bg-white text-black" : "text-white hover:bg-white/10"
                }`}
              >
                Private
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full select-none">
              {saveMutation.isPending ||
              (playlist &&
                (playlist.title !== lastSavedTitleRef.current ||
                  playlist.description !== lastSavedDescriptionRef.current)) ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Saved</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </button>

            <a
              href={playlistPath(playlist.id)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              View page
            </a>
          </>
        }
      />

      {uploadError ? (
        <div className="mx-auto mt-4 max-w-6xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {uploadError}
        </div>
      ) : null}

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleCoverFile(file);
        }}
      />

      <input
        ref={tracksInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={(e) => void handleTrackUpload(e.target.files)}
      />
    </>
  );
}
