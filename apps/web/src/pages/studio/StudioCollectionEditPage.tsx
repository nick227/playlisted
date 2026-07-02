import { PlaylistedApiError } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { CollectionView } from "@/components/collection/CollectionView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { SongVisualMediaPanel } from "@/components/studio/SongVisualMediaPanel";
import { TrackUploadQueue } from "@/components/uploads/TrackUploadQueue";
import { useStudioCollectionDraftAutosave } from "@/hooks/studio/useStudioCollectionDraftAutosave";
import { useStudioCollectionGenres } from "@/hooks/studio/useStudioCollectionGenres";
import { useStudioCollectionPlaybackQueue } from "@/hooks/studio/useStudioCollectionPlaybackQueue";
import { useStudioCollectionUploadQueue } from "@/hooks/studio/useStudioCollectionUploadQueue";
import { useStudioRecordingMetadata } from "@/hooks/studio/useStudioRecordingMetadata";
import type { PlaylistDetailWithTags } from "@/hooks/studio/types";
import { authedApi } from "@/lib/authedApi";
import { playlistPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";

const SUBTITLE_REFRESH_MS = 5_000;
const ACTIVE_SUBTITLE_STATUSES = new Set(["QUEUED", "PROCESSING"]);

export function StudioCollectionEditPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);

  const client = useMemo(() => authedApi(accessToken), [accessToken]);

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

  const {
    playlist,
    setDraft,
    uploadError,
    setUploadError,
    saveMutation,
    visibilityMutation,
    deleteMutation,
    lastSavedTitleRef,
    lastSavedDescriptionRef,
    hasUnsavedDraft,
    handleCoverFile,
  } = useStudioCollectionDraftAutosave({
    playlistId,
    data,
    accessToken,
    client,
  });

  const {
    availableGenres,
    selectedGenreId,
    playlistGenreSlug,
    genreLoading,
    genreSaving,
    genreError,
    updateRecordingTagsMutation,
    trackGenreSavingById,
    trackGenreErrorById,
    handleGenreChange,
    handleGenreCreate,
  } = useStudioCollectionGenres({
    playlist: playlist ?? undefined,
    playlistId,
    accessToken,
    setDraft,
  });

  const { trackUploadQueue, handleTrackUpload } = useStudioCollectionUploadQueue({
    playlistId,
    accessToken,
    client,
    tracksInputRef,
    setDraft,
    setUploadError,
  });

  const {
    savingRecordingIds,
    recordingErrors,
    handleUpdateRecordingTitle,
    handleUpdateRecordingArtwork,
  } = useStudioRecordingMetadata({
    playlist: playlist ?? undefined,
    playlistId,
    accessToken,
    client,
    setDraft,
  });

  usePageMeta({ title: playlist ? `${playlist.title} — Edit — Studio` : "Edit Collection — Studio" });
  const { playRecording } = useStudioCollectionPlaybackQueue(playlist);

  const removeTrackMutation = useMutation({
    mutationFn: (recordingId: string) => client.playlists.removeItem(playlistId!, recordingId),
    onSuccess: async (updated) => {
      setDraft(updated as PlaylistDetailWithTags);
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["charts"] }),
        queryClient.invalidateQueries({ queryKey: ["playlists"] }),
        queryClient.invalidateQueries({ queryKey: ["search"] }),
        queryClient.invalidateQueries({ queryKey: ["library"] }),
        queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] }),
      ]);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (recordingIds: string[]) => client.playlists.reorderItems(playlistId!, recordingIds),
    onSuccess: (updated) => {
      setDraft(updated as PlaylistDetailWithTags);
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
    },
  });

  const prevRecordingCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playlist) return;
    const curr = playlist.recordings.length;
    const prev = prevRecordingCountRef.current;
    prevRecordingCountRef.current = curr;
    if (prev === 0 && curr > 0) {
      visibilityMutation.mutate("PUBLIC");
    }
  }, [playlist?.recordings.length]);

  useEffect(() => {
    if (!playlistId || !playlist) return;
    const shouldRefresh = playlist.recordings.some((recording) =>
      ACTIVE_SUBTITLE_STATUSES.has(recording.subtitle?.status ?? ""),
    );
    if (!shouldRefresh) return;

    const timer = window.setInterval(() => {
      void client.playlists.getById(playlistId).then((updated) => {
        const next = updated as PlaylistDetailWithTags;
        queryClient.setQueryData(["playlist", playlistId, "edit"], next);
        setDraft((current) => {
          const base = current ?? playlist;
          if (!base || base.id !== next.id) return next;
          return {
            ...base,
            recordings: next.recordings,
          };
        });
      }).catch(() => undefined);
    }, SUBTITLE_REFRESH_MS);

    return () => window.clearInterval(timer);
  }, [client, playlist, playlistId, queryClient, setDraft]);

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

  function moveTrack(recordingId: string, direction: -1 | 1) {
    const ids = collection.recordings.map((r) => r.id);
    const index = ids.indexOf(recordingId);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];

    // Optimistic reorder: update UI immediately, then sync with server response.
    setDraft({
      ...collection,
      recordings: next
        .map((id) => collection.recordings.find((r) => r.id === id))
        .filter(Boolean) as PlaylistDetailWithTags["recordings"],
    });
    reorderMutation.mutate(next);
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
        onUpdateTrackTitle={handleUpdateRecordingTitle}
        onUpdateTrackArtwork={handleUpdateRecordingArtwork}
        onUpdateTrackTags={(recordingId, tagSlugs) =>
          updateRecordingTagsMutation.mutate({ recordingId, tagSlugs })
        }
        trackSavingById={{ ...savingRecordingIds, ...trackGenreSavingById }}
        trackErrorById={{ ...recordingErrors, ...trackGenreErrorById }}
        renderTrackEditExtras={(recording) =>
          accessToken ? (
            <SongVisualMediaPanel
              recordingId={recording.id}
              recordingTitle={recording.title}
              accessToken={accessToken}
            />
          ) : null
        }
        selectedGenreId={selectedGenreId}
        onGenreChange={handleGenreChange}
        onGenreCreate={handleGenreCreate}
        genreOptions={availableGenres}
        playlistGenreSlug={playlistGenreSlug}
        genreLoading={genreLoading}
        genreSaving={genreSaving}
        genreError={genreError}
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
            {(() => {
              const hasNoTracks = collection.recordings.length === 0;
              const effectiveVisibility = hasNoTracks ? "PRIVATE" : playlist.visibility;
              return (
                <div
                  className="flex items-center gap-2 rounded-full border border-white/20 p-1"
                  title={hasNoTracks ? "Add at least one track to change visibility" : undefined}
                >
                  <button
                    type="button"
                    onClick={() => visibilityMutation.mutate("PUBLIC")}
                    disabled={visibilityMutation.isPending || hasNoTracks}
                    className={[
                      "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                      effectiveVisibility === "PUBLIC" ? "bg-white text-black" : "text-white",
                      hasNoTracks ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10",
                    ].join(" ")}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => visibilityMutation.mutate("PRIVATE")}
                    disabled={visibilityMutation.isPending || hasNoTracks}
                    className={[
                      "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                      effectiveVisibility === "PRIVATE" ? "bg-white text-black" : "text-white",
                      hasNoTracks ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10",
                    ].join(" ")}
                  >
                    Private
                  </button>
                </div>
              );
            })()}

            <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full select-none">
              {saveMutation.isPending || hasUnsavedDraft ? (
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
