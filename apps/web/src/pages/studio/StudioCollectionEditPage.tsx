import type { PlaylistDetail } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { CollectionView } from "@/components/collection/CollectionView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { authedApi, uploadImageFile } from "@/lib/authedApi";
import { playlistPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

export function StudioCollectionEditPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<PlaylistDetail | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const { data: myRecordings } = useQuery({
    queryKey: ["me", "recordings"],
    queryFn: () => client.me.recordings(),
    enabled: Boolean(accessToken && pickerOpen),
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

  const inPlaylist = new Set(collection.recordings.map((r) => r.id));

  return (
    <>
      <CollectionView
        playlist={playlist}
        mode="edit"
        onTitleChange={(title) => setDraft({ ...playlist, title })}
        onDescriptionChange={(description) => setDraft({ ...playlist, description })}
        onCoverClick={() => coverInputRef.current?.click()}
        onAddTracks={() => setPickerOpen(true)}
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

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add from your uploads</h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-sm text-[var(--color-text-muted)] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {myRecordings?.data
                .filter((r) => !inPlaylist.has(r.id))
                .map((recording) => (
                  <button
                    key={recording.id}
                    type="button"
                    onClick={() => {
                      addTrackMutation.mutate(recording.id);
                      setPickerOpen(false);
                    }}
                    className="rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                  >
                    {recording.title}
                  </button>
                ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
