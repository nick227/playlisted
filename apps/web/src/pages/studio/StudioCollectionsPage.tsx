import type { CollectionPlaylistItem, components } from "@playlisted/client-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { authedApi } from "@/lib/authedApi";
import { playlistPath, studioCollectionEditPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

const typeOptions = [
  { value: "PLAYLIST" as const, label: "Collection" },
];

type PlaylistSummary = components["schemas"]["PlaylistSummary"];
type StudioCollectionListItem = (PlaylistSummary | CollectionPlaylistItem) & {
  listSource: "owned" | "followed";
};

export function StudioCollectionsPage() {
  const { user, accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const ownedCollectionsQuery = useQuery({
    queryKey: ["me", "playlists"],
    queryFn: () => client.me.playlists(),
    enabled: Boolean(accessToken),
  });

  const followedCollectionsQuery = useQuery({
    queryKey: ["me", "collections", "playlists", 100],
    queryFn: () => client.me.collectionPlaylists({ pageSize: 100 }),
    enabled: Boolean(accessToken),
  });

  const createMutation = useMutation({
    mutationFn: (type: (typeof typeOptions)[number]["value"]) =>
      client.playlists.create({
        ownerId: user!.id,
        title: "Untitled collection",
        type,
        status: "DRAFT",
        visibility: "PUBLIC",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      window.location.href = studioCollectionEditPath(created.id);
    },
  });

  const removeCollectionMutation = useMutation({
    mutationFn: (playlistId: string) => client.me.removeCollectionPlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "collections", "playlists"] });
    },
  });

  const ownedCollections = ownedCollectionsQuery.data?.data ?? [];
  const ownedCollectionIds = new Set(ownedCollections.map((playlist) => playlist.id));
  const followedCollections =
    followedCollectionsQuery.data?.data.filter((playlist) => !ownedCollectionIds.has(playlist.id)) ?? [];
  const collections: StudioCollectionListItem[] = [
    ...ownedCollections.map((playlist) => ({ ...playlist, listSource: "owned" as const })),
    ...followedCollections.map((playlist) => ({ ...playlist, listSource: "followed" as const })),
  ];
  const removingCollectionId = removeCollectionMutation.variables;

  if (ownedCollectionsQuery.isLoading || followedCollectionsQuery.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold text-white">Your collections</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Albums, playlists, podcast channels, and collections you follow.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => createMutation.mutate(opt.value)}
            disabled={createMutation.isPending}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-white hover:border-[var(--color-brand)]"
          >
            + New {opt.label}
          </button>
        ))}
      </div>

      {!collections.length ? (
        <div className="mt-10">
          <EmptyState title="No collections yet" description="Create or follow a collection to get started." />
        </div>
      ) : (
        <ul className="mt-10 flex flex-col gap-2">
          {collections.map((playlist) => (
            <li key={playlist.id}>
              <div
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 transition hover:border-white/20"
              >
                <Link
                  to={
                    playlist.listSource === "owned"
                      ? studioCollectionEditPath(playlist.id)
                      : playlistPath({
                          id: playlist.id,
                          href: playlist.href,
                          username: playlist.owner.username,
                          slug: playlist.slug,
                        })
                  }
                  className="min-w-0 flex-1"
                >
                  <p className="font-semibold text-white">{playlist.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {playlist.type} • {playlist.status} • {playlist.itemCount} tracks
                    {playlist.listSource === "followed" ? ` • by ${playlist.owner.displayName}` : ""}
                  </p>
                </Link>
                {playlist.listSource === "owned" ? (
                  <Link
                    to={studioCollectionEditPath(playlist.id)}
                    className="ml-4 text-sm text-[var(--color-brand)]"
                  >
                    Edit
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeCollectionMutation.mutate(playlist.id)}
                    disabled={removeCollectionMutation.isPending}
                    className="ml-4 text-sm font-medium text-[var(--color-text-muted)] hover:text-white disabled:opacity-60"
                  >
                    {removingCollectionId === playlist.id ? "Removing..." : "Unfollow"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
