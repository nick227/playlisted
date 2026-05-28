import type { PlaylistDetail } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CollectionView } from "@/components/collection/CollectionView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { authedApi, bulkRegisterUploads, uploadAudioFile, uploadImageFile } from "@/lib/authedApi";
import { playlistPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

export function StudioCollectionEditPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PlaylistDetail | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const client = authedApi(accessToken);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["playlist", playlistId, "edit"],
    queryFn: () => client.playlists.getById(playlistId!),
    enabled: Boolean(playlistId && accessToken),
  });

  const playlist = draft ?? data;

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<typeof client.playlists.update>[1]) =>
      client.playlists.update(playlistId!, body),
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
    },
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      client.playlists.update(playlistId!, { status: "PUBLISHED" }),
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
    },
  });

  const visibilityMutation = useMutation({
    mutationFn: (visibility: PlaylistDetail["visibility"]) =>
      client.playlists.update(playlistId!, { visibility }),
    onSuccess: (updated) => setDraft(updated),
  });

  const addTrackMutation = useMutation({
    mutationFn: (recordingId: string) => client.playlists.addItem(playlistId!, recordingId),
    onSuccess: (updated) => setDraft(updated),
  });

  const removeTrackMutation = useMutation({
    mutationFn: (recordingId: string) => client.playlists.removeItem(playlistId!, recordingId),
    onSuccess: (updated) => setDraft(updated),
  });

  const reorderMutation = useMutation({
    mutationFn: (recordingIds: string[]) => client.playlists.reorderItems(playlistId!, recordingIds),
    onSuccess: (updated) => setDraft(updated),
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

    try {
      const uploaded: { url: string; mimeType: string; bytes: number; title: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const result = await uploadAudioFile(file, accessToken);
        uploaded.push({
          url: result.url,
          mimeType: result.mimeType,
          bytes: result.bytes,
          title: result.title,
        });
      }

      const registered = await bulkRegisterUploads(uploaded, accessToken);

      for (const recording of registered.recordings) {
        await addTrackMutation.mutateAsync(recording.id);
      }

      const fresh = await client.playlists.getById(playlistId!);
      setDraft(fresh);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
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
        onRemoveTrack={(recordingId) => removeTrackMutation.mutate(recordingId)}
        onMoveTrackUp={(recordingId) => moveTrack(recordingId, -1)}
        onMoveTrackDown={(recordingId) => moveTrack(recordingId, 1)}
        editToolbar={
          <>
            <button
              type="button"
              onClick={() =>
                saveMutation.mutate({
                  title: playlist.title,
                  description: playlist.description,
                  coverArtUrl: playlist.coverArtUrl,
                })
              }
              disabled={saveMutation.isPending}
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              {saveMutation.isPending ? "Saving…" : "Save draft"}
            </button>
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
            <button
              type="button"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white"
            >
              Publish
            </button>
            <Link
              to={playlistPath(playlist.id)}
              target="_blank"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black"
            >
              Preview live
            </Link>
            <button
              type="button"
              onClick={() => navigate("/studio/collections")}
              className="text-sm text-[var(--color-text-muted)] hover:text-white"
            >
              Back to collections
            </button>
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
