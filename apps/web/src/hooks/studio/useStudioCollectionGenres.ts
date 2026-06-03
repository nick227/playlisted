import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { GenreOption } from "@/components/studio/studioCollectionUtils";
import { useAuthoringGenres } from "@/hooks/useLibrary";

import type { PlaylistDetailWithTags, RecordingWithTags } from "./types";

export function useStudioCollectionGenres({
  playlist,
  playlistId,
  accessToken,
  setDraft,
}: {
  playlist: PlaylistDetailWithTags | undefined;
  playlistId: string | undefined;
  accessToken: string | null | undefined;
  setDraft: (playlist: PlaylistDetailWithTags) => void;
}) {
  const queryClient = useQueryClient();
  const genresQuery = useAuthoringGenres();
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);
  const [trackGenreErrorById, setTrackGenreErrorById] = useState<Record<string, string | undefined>>({});

  const availableGenres = useMemo((): GenreOption[] => {
    const raw = genresQuery.data;
    const list = Array.isArray(raw) ? raw : raw?.data ?? [];
    return list.map((genre) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug,
    }));
  }, [genresQuery.data]);

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

  const playlistGenreSlug = useMemo(() => {
    if (selectedGenreId) {
      return availableGenres.find((genre) => genre.id === selectedGenreId)?.slug ?? null;
    }
    return playlist?.tags?.find((tag) => tag.kind === "GENRE")?.slug ?? null;
  }, [selectedGenreId, availableGenres, playlist?.tags]);

  async function setPlaylistTags(genreId: string | null, preservedTagIds: string[]) {
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
  }

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

      setTrackGenreErrorById((prev) => ({ ...prev, [variables.recordingId]: undefined }));
      setDraft({
        ...playlist,
        recordings: playlist.recordings.map((recording) =>
          recording.id === variables.recordingId ? { ...recording, tags } : recording,
        ),
      });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId, "edit"] });
    },
    onError: (error, variables) => {
      setTrackGenreErrorById((prev) => ({
        ...prev,
        [variables.recordingId]: error instanceof Error ? error.message : "Failed to update genre.",
      }));
    },
  });

  const trackGenreSavingById = useMemo(() => {
    if (!updateRecordingTagsMutation.isPending || !updateRecordingTagsMutation.variables) {
      return {};
    }
    return { [updateRecordingTagsMutation.variables.recordingId]: true };
  }, [updateRecordingTagsMutation.isPending, updateRecordingTagsMutation.variables]);

  const setPlaylistTagsMutation = useMutation({
    mutationFn: async ({ genreId, preservedTagIds }: { genreId: string | null; preservedTagIds: string[] }) => {
      return setPlaylistTags(genreId, preservedTagIds);
    },
    onSuccess: (updated) => {
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  const createGenreMutation = useMutation({
    mutationFn: async ({ name, preservedTagIds }: { name: string; preservedTagIds: string[] }) => {
      if (!playlistId) throw new Error("Missing playlist id.");
      const base = import.meta.env.VITE_API_BASE_URL ?? "";
      const response = await fetch(`${base}/api/v1/tags/genres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? ""}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          typeof body === "object" && body && "message" in body
            ? String((body as { message: string }).message)
            : "Failed to create genre.",
        );
      }

      const tag = (await response.json()) as GenreOption;
      const updated = await setPlaylistTags(tag.id, preservedTagIds);
      return { tag, updated };
    },
    onSuccess: ({ tag, updated }) => {
      setSelectedGenreId(tag.id);
      setDraft(updated);
      queryClient.invalidateQueries({ queryKey: ["tags", "genres"] });
      queryClient.invalidateQueries({ queryKey: ["library", "genres"] });
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
    },
  });

  function handleGenreChange(nextGenreId: string | null) {
    setSelectedGenreId(nextGenreId);
    setPlaylistTagsMutation.mutate({ genreId: nextGenreId, preservedTagIds: playlistNonGenreTagIds });
  }

  function handleGenreCreate(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = availableGenres.find((genre) => genre.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      handleGenreChange(existing.id);
      return;
    }

    createGenreMutation.mutate({ name: trimmed, preservedTagIds: playlistNonGenreTagIds });
  }

  const genreError =
    setPlaylistTagsMutation.error instanceof Error
      ? setPlaylistTagsMutation.error.message
      : createGenreMutation.error instanceof Error
        ? createGenreMutation.error.message
        : undefined;

  return {
    availableGenres,
    selectedGenreId,
    playlistGenreSlug,
    genreLoading: genresQuery.isLoading,
    genreSaving: setPlaylistTagsMutation.isPending || createGenreMutation.isPending,
    genreError,
    updateRecordingTagsMutation,
    trackGenreSavingById,
    trackGenreErrorById,
    handleGenreChange,
    handleGenreCreate,
  };
}
