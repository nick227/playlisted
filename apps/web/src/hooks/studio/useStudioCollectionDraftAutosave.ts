import type { PlaylistDetail } from "@playlisted/client-sdk";
import { PlaylistedApiError } from "@playlisted/client-sdk";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { authedApi } from "@/lib/authedApi";
import { uploadImageFile } from "@/lib/authedApi";
import { playlistPath, profilePath } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import {
  canPersistCollectionDraft,
  isEmptyUntitledCollection,
} from "@/components/studio/studioCollectionUtils";

import type { PlaylistDetailWithTags } from "./types";

type AuthedClient = ReturnType<typeof authedApi>;

export function useStudioCollectionDraftAutosave({
  playlistId,
  data,
  accessToken,
  client,
}: {
  playlistId: string | undefined;
  data: PlaylistDetailWithTags | undefined;
  accessToken: string | null | undefined;
  client: AuthedClient;
}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { playbackContext, updateQueuePlaylistTitle, updateQueuePlaylistSlug } = useAudioPlayer();
  const [draft, setDraft] = useState<PlaylistDetailWithTags | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastSavedTitleRef = useRef<string | undefined>(undefined);
  const lastSavedDescriptionRef = useRef<string | null | undefined>(undefined);
  const lastSavedSlugRef = useRef<string | undefined>(undefined);
  const playlistRef = useRef<PlaylistDetailWithTags | null | undefined>(undefined);
  const abandonTimerRef = useRef<number | null>(null);

  const playlist = draft ?? data;
  playlistRef.current = playlist;

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

  const saveMutation = useMutation({
    mutationFn: (body: Parameters<AuthedClient["playlists"]["update"]>[1]) =>
      client.playlists.update(playlistId!, body),
    onSuccess: (updated) => {
      const previousSlug = lastSavedSlugRef.current;
      setDraft(updated as PlaylistDetailWithTags);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
      lastSavedSlugRef.current = updated.slug;

      if (playbackContext.playlistId === updated.id) {
        updateQueuePlaylistTitle(updated.id, updated.title);
      }

      syncSlugSideEffects(updated as PlaylistDetailWithTags, previousSlug);
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
      setDraft(updated as PlaylistDetailWithTags);
      queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      lastSavedTitleRef.current = updated.title;
      lastSavedDescriptionRef.current = updated.description;
      lastSavedSlugRef.current = updated.slug;
      syncSlugSideEffects(updated as PlaylistDetailWithTags, previousSlug);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => client.playlists.delete(playlistId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      await queryClient.invalidateQueries({ queryKey: ["playlist", playlistId] });
      navigate(playlist?.owner.username ? profilePath(playlist.owner.username) : "/settings", { replace: true });
    },
    onError: async (err) => {
      if (err instanceof PlaylistedApiError && err.status === 404) {
        await queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
        await queryClient.invalidateQueries({ queryKey: ["playlists"] });
        navigate(playlist?.owner.username ? profilePath(playlist.owner.username) : "/settings", { replace: true });
        return;
      }
      setUploadError(err instanceof Error ? err.message : "Failed to delete collection.");
    },
  });

  useEffect(() => {
    if (!playlist) return;

    const currentTitle = playlist.title;
    const currentDescription = playlist.description;
    const trackCount = playlist.recordings.length;

    if (!canPersistCollectionDraft(currentTitle, trackCount)) return;

    const hasChanges =
      (lastSavedTitleRef.current !== undefined && currentTitle !== lastSavedTitleRef.current) ||
      (lastSavedDescriptionRef.current !== undefined && currentDescription !== lastSavedDescriptionRef.current);

    if (!hasChanges) return;

    const timer = setTimeout(() => {
      saveMutation.mutate({
        title: currentTitle,
        description: currentDescription ?? null,
        ...(playlist.visibility === "PUBLIC" ? { status: "PUBLISHED" as const } : {}),
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [playlist?.title, playlist?.description, playlist?.recordings.length]);

  useEffect(() => {
    if (abandonTimerRef.current !== null) {
      window.clearTimeout(abandonTimerRef.current);
      abandonTimerRef.current = null;
    }

    return () => {
      const current = playlistRef.current;
      if (!playlistId || !current) return;
      if (!isEmptyUntitledCollection(current.title, current.recordings.length)) return;

      abandonTimerRef.current = window.setTimeout(() => {
        abandonTimerRef.current = null;
        void client.playlists
          .delete(playlistId)
          .then(() =>
            Promise.all([
              queryClient.invalidateQueries({ queryKey: ["me", "playlists"] }),
              queryClient.invalidateQueries({ queryKey: ["playlists"] }),
            ]),
          )
          .catch(() => undefined);
      }, 100);
    };
  }, [client, playlistId, queryClient]);

  async function handleCoverFile(file: File) {
    if (!accessToken || !playlist) return;
    if (!canPersistCollectionDraft(playlist.title, playlist.recordings.length)) {
      setUploadError("Add tracks or rename this collection before saving cover art.");
      return;
    }
    const uploaded = await uploadImageFile(file, accessToken);
    const updated = await saveMutation.mutateAsync({ coverArtUrl: uploaded.url });
    setDraft(updated as PlaylistDetailWithTags);
  }

  const canPersistDraft = playlist
    ? canPersistCollectionDraft(playlist.title, playlist.recordings.length)
    : false;

  const hasUnsavedDraft =
    canPersistDraft &&
    Boolean(playlist) &&
    (playlist?.title !== lastSavedTitleRef.current ||
      playlist?.description !== lastSavedDescriptionRef.current);

  return {
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
    canPersistDraft,
    handleCoverFile,
  };
}
