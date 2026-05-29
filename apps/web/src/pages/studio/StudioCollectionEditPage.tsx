import { PlaylistedApiError, type components, type PlaylistDetail } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { CollectionView } from "@/components/collection/CollectionView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { TrackUploadQueue } from "@/components/uploads/TrackUploadQueue";
import { authedApi, bulkRegisterUploads, uploadAudioFile, uploadImageFile } from "@/lib/authedApi";
import { getAudioDurationSeconds } from "@/lib/getAudioDuration";
import { playlistPath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useLibraryGenres } from "@/hooks/useLibrary";

type UploadQueueItem = {
  id: string;
  file: File;
  progress01: number;
  status: "queued" | "uploading" | "registering" | "adding" | "done" | "error";
  error?: string;
};

type RecordingWithTags = components["schemas"]["RecordingInPlaylist"] & {
  tags?: components["schemas"]["Tag"][];
};

type PlaylistDetailWithTags = PlaylistDetail & {
  recordings: RecordingWithTags[];
};

export function StudioCollectionEditPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const { setQueue, currentTrack, togglePlay, playbackContext, updateQueuePlaylistTitle, updateQueuePlaylistSlug } =
    useAudioPlayer();
  const genresQuery = useLibraryGenres();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PlaylistDetailWithTags | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [trackUploadQueue, setTrackUploadQueue] = useState<UploadQueueItem[]>([]);

  const availableGenres = useMemo(() => {
    const raw = genresQuery.data;
    return Array.isArray(raw) ? raw : raw?.data ?? [];
  }, [genresQuery.data]);

  const client = authedApi(accessToken);

  const { data, isLoading, isError, error: loadError } = useQuery<PlaylistDetailWithTags>({
    queryKey: ["playlist", playlistId, "edit"],
    queryFn: async () => {
      const loaded = (await client.playlists.getById(playlistId!)) as PlaylistDetailWithTags;
      if (user && loaded.ownerId !== user.id) {
        throw new PlaylistedApiError(
          "You do not own this collection.",
          403,
          new Response(null, { status: 403 }),
        );
      }
      return loaded;
    },
    enabled: Boolean(playlistId && accessToken && user),
  });

  const playlist = draft ?? data;
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);

  const playlistGenreIds = useMemo(
    () => playlist?.tags?.filter((tag) => tag.kind === "GENRE").map((tag) => tag.id) ?? [],
    [playlist?.tags],
  );
  const playlistNonGenreTagIds = useMemo(
    () => playlist?.tags?.filter((tag) => tag.kind !== "GENRE").map((tag) => tag.id) ?? [],
    [playlist?.tags],
  );

  const currentGenreId = playlistGenreIds[0] ?? null;

  useEffect(() => {
    setSelectedGenreId(currentGenreId);
  }, [currentGenreId]);

  const lastSavedTitleRef = useRef<string | undefined>(undefined);
  const lastSavedDescriptionRef = useRef<string | null | undefined>(undefined);
  const lastSavedSlugRef = useRef<string | undefined>(undefined);

  if (data && lastSavedTitleRef.current === undefined) {
    lastSavedTitleRef.current = data.title;
    lastSavedDescriptionRef.current = data.description;
    lastSavedSlugRef.current = data.slug;
  }

  function syncSlugSideEffects(
    updated: PlaylistDetailWithTags,
    previousSlug: string | undefined,
  ) {
    if (!previousSlug || previousSlug === updated.slug) return;

    void queryClient.invalidateQueries({
      queryKey: ["playlist", "canonical", updated.owner.username, previousSlug],
    });
    void queryClient.invalidateQueries({
      queryKey: ["playlist", "canonical", updated.owner.username, updated.slug],
    });

    const oldPath = playlistPath({
      id: updated.id,
      username: updated.owner.username,
      slug: previousSlug,
    });
    const newPath = playlistPath({
      id: updated.id,
      href: updated.href,
      username: updated.owner.username,
      slug: updated.slug,
    });

    if (location.pathname === oldPath) {
      navigate(newPath, { replace: true });
    }

    if (playbackContext.playlistId === updated.id) {
      updateQueuePlaylistSlug(updated.id, updated.slug);
    }
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
      const previousSlug = lastSavedSlugRef.current;
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
      lastSavedSlugRef.current = updated.slug;

      if (playbackContext.playlistId === updated.id) {
        updateQueuePlaylistTitle(updated.id, updated.title);
      }

      syncSlugSideEffects(updated, previousSlug);
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (visibility: PlaylistDetail["visibility"]) =>
      client.playlists.update(playlistId!, {
        visibility,
        ...(visibility === "PUBLIC" ? { status: "PUBLISHED" } : {}),
      }),
    onSuccess: (updated) => {
      const previousSlug = lastSavedSlugRef.current;
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
      lastSavedSlugRef.current = updated.slug;
      syncSlugSideEffects(updated, previousSlug);
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

  const updateRecordingTagsMutation = useMutation({
    mutationFn: async ({ recordingId, tagSlugs }: { recordingId: string; tagSlugs: string[] }) => {
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/v1/recordings/${recordingId}/tags`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? ""}`,
        },
        body: JSON.stringify({ tagSlugs }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body === "object" && body && "message" in body
            ? String((body as { message: string }).message)
            : "Failed to update tags.",
        );
      }

      return response.json() as Promise<{ tags: RecordingWithTags["tags"] }>;
    },
    onSuccess: ({ tags }, variables) => {
      if (!playlist) return;

      setDraft({
        ...playlist,
        recordings: playlist.recordings.map((recording) =>
          recording.id === variables.recordingId ? { ...recording, tags } : recording,
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId, "edit"] });
    },
  });

  const setPlaylistTagsMutation = useMutation({
    mutationFn: async ({ genreId, preservedTagIds }: { genreId: string | null; preservedTagIds: string[] }) => {
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/v1/playlists/${playlistId}/tags`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? ""}`,
        },
        body: JSON.stringify({ tagIds: genreId ? [...preservedTagIds, genreId] : preservedTagIds }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body === "object" && body && "message" in body
            ? String((body as { message: string }).message)
            : "Failed to update playlist tags.",
        );
      }

      return response.json() as Promise<PlaylistDetailWithTags>;
    },
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.playlists.delete(playlistId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      window.location.href = "/studio/collections";
    },
    onError: async (err) => {
      if (err instanceof PlaylistedApiError && err.status === 404) {
        await queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
        await queryClient.invalidateQueries({ queryKey: ["playlists"] });
        window.location.href = "/studio/collections";
        return;
      }
      setUploadError(err instanceof Error ? err.message : "Failed to delete collection.");
    },
  });

  function handleGenreChange(nextGenreId: string | null) {
    setSelectedGenreId(nextGenreId);
    setPlaylistTagsMutation.mutate({ genreId: nextGenreId, preservedTagIds: playlistNonGenreTagIds });
  }

  if (isError) {
    if (loadError instanceof PlaylistedApiError && loadError.status === 403) {
      return (
        <EmptyState
          title="Not your collection"
          description="You can only edit and delete collections you own."
        />
      );
    }
    return <EmptyState title="Collection not found" />;
  }

  if (isLoading || !playlist) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-64 w-full max-w-md rounded-2xl" />
        <Skeleton className="h-8 w-64" />
      </div>
    );
  }

  const collection = playlist;
  const viewPath = playlistPath({
    id: collection.id,
    href: collection.href,
    username: collection.owner.username,
    slug: collection.slug,
  });

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

    setQueue(queueTracks, index, {
      playlistId: collection.id,
      playlistOwnerUsername: collection.owner.username,
      playlistSlug: collection.slug,
      sourceContext: "studio-editor",
    });
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
        onTitleChange={(title) => setDraft({ ...playlist, title })}
        onDescriptionChange={(description) => setDraft({ ...playlist, description })}
        onCoverClick={() => coverInputRef.current?.click()}
        onAddTracks={() => tracksInputRef.current?.click()}
        onPlayTrack={(recording) => playRecording(recording.id)}
        onRemoveTrack={(recordingId) => removeTrackMutation.mutate(recordingId)}
        onMoveTrackUp={(recordingId) => moveTrack(recordingId, -1)}
        onMoveTrackDown={(recordingId) => moveTrack(recordingId, 1)}
        onUpdateTrackTags={(recordingId, tagSlugs) =>
          updateRecordingTagsMutation.mutate({ recordingId, tagSlugs })
        }
        selectedGenreId={selectedGenreId}
        onGenreChange={handleGenreChange}
        genreOptions={availableGenres}
        genreLoading={genresQuery.isLoading}
        genreSaving={setPlaylistTagsMutation.isPending}
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

            <Link
              to={viewPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              View page
            </Link>
            <span
              className="max-w-full truncate rounded-full border border-[var(--color-border)] bg-black/20 px-3 py-2 text-xs text-[var(--color-text-muted)]"
              title={viewPath}
            >
              {viewPath}
            </span>
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
