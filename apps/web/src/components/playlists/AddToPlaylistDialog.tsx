import type { components } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

type PlaylistSummary = components["schemas"]["PlaylistSummary"];

export type AddToPlaylistDialogProps = {
  open: boolean;
  onClose: () => void;
  recordingIds: string[];
  title: string;
};

function playlistLabel(playlist: PlaylistSummary) {
  const prefix = playlist.visibility === "PRIVATE" ? "Private" : "Public";
  return `${prefix} • ${playlist.title}`;
}

export function AddToPlaylistDialog({ open, onClose, recordingIds, title }: AddToPlaylistDialogProps) {
  const { user, accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const [newTitle, setNewTitle] = useState("");
  const [newVisibility, setNewVisibility] = useState<components["schemas"]["Visibility"]>("PRIVATE");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["me", "playlists"],
    queryFn: () => client.me.playlists(),
    enabled: Boolean(accessToken && open),
  });

  const playlists = useMemo(() => data?.data ?? [], [data]);

  const addMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      for (const recordingId of recordingIds) {
        await client.playlists.addItem(playlistId, recordingId);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "playlists"] }),
        queryClient.invalidateQueries({ queryKey: ["playlists"] }),
      ]);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to add to playlist."),
  });

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in.");
      const titleValue = newTitle.trim();
      if (!titleValue) throw new Error("Playlist title is required.");

      const created = await client.playlists.create({
        ownerId: user.id,
        title: titleValue,
        type: "PLAYLIST",
        visibility: newVisibility,
        status: "DRAFT",
      });

      for (const recordingId of recordingIds) {
        await client.playlists.addItem(created.id, recordingId);
      }

      return created.id;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "playlists"] }),
        queryClient.invalidateQueries({ queryKey: ["playlists"] }),
      ]);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Failed to create playlist."),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-white">Add to playlist</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[var(--color-text-muted)] hover:text-white">
            Close
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Create a new playlist
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New playlist title"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewVisibility("PRIVATE")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    newVisibility === "PRIVATE"
                      ? "bg-white text-black"
                      : "border border-white/20 text-white hover:bg-white/10"
                  }`}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setNewVisibility("PUBLIC")}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    newVisibility === "PUBLIC"
                      ? "bg-white text-black"
                      : "border border-white/20 text-white hover:bg-white/10"
                  }`}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => createAndAddMutation.mutate()}
                  disabled={createAndAddMutation.isPending}
                  className="ml-auto rounded-full bg-[var(--color-brand)] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {createAndAddMutation.isPending ? "Creating…" : "Create & add"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
              Add to an existing playlist
            </p>
            <div className="mt-3 max-h-56 overflow-y-auto">
              {isLoading ? (
                <p className="text-sm text-[var(--color-text-muted)]">Loading playlists…</p>
              ) : playlists.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">No playlists yet.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {playlists.map((playlist) => (
                    <button
                      key={playlist.id}
                      type="button"
                      onClick={() => addMutation.mutate(playlist.id)}
                      disabled={addMutation.isPending}
                      className="rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      {playlistLabel(playlist)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

