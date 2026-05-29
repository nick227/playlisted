import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { StudioCollectionCard } from "@/components/studio/StudioCollectionCard";
import type { StudioCollectionListItem } from "@/components/studio/studioCollectionUtils";
import { formatPlaylistDuration } from "@/components/studio/studioCollectionUtils";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { authedApi } from "@/lib/authedApi";
import { studioCollectionEditPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

const typeOptions = [{ value: "PLAYLIST" as const, label: "Collection" }];

function CollectionsSkeleton() {
  return (
    <div className="mt-10 space-y-4">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

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
  const ownedItems: StudioCollectionListItem[] = ownedCollections.map((playlist) => ({
    ...playlist,
    listSource: "owned",
  }));
  const followedItems: StudioCollectionListItem[] = followedCollections.map((playlist) => ({
    ...playlist,
    listSource: "followed",
  }));
  const allItems = [...ownedItems, ...followedItems];
  const totalTracks = allItems.reduce((sum, p) => sum + p.itemCount, 0);
  const totalDuration = allItems.reduce((sum, p) => sum + p.totalDurationSeconds, 0);

  if (ownedCollectionsQuery.isLoading || followedCollectionsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-96" />
        <CollectionsSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">Studio</p>
      <h1 className="mt-2 text-3xl font-extrabold text-white">Your collections</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">
        Collections you create and playlists you save from other artists — with cover art, status, and full stats.
      </p>

      {allItems.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat label="Yours" value={String(ownedItems.length)} />
          <SummaryStat label="Saved" value={String(followedItems.length)} />
          <SummaryStat label="Total tracks" value={String(totalTracks)} />
          <SummaryStat label="Total runtime" value={formatPlaylistDuration(totalDuration)} />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {typeOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => createMutation.mutate(opt.value)}
            disabled={createMutation.isPending}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-white transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] disabled:opacity-60"
          >
            + New {opt.label}
          </button>
        ))}
      </div>

      {!allItems.length ? (
        <div className="mt-10">
          <EmptyState title="No collections yet" description="Create or save a collection to get started." />
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {ownedItems.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-white">Created by you</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {ownedItems.length} collection{ownedItems.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-4 flex flex-col gap-4">
                {ownedItems.map((playlist) => (
                  <li key={playlist.id}>
                    <StudioCollectionCard playlist={playlist} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {followedItems.length > 0 ? (
            <section>
              <h2 className="text-lg font-bold text-white">Saved from others</h2>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                {followedItems.length} saved playlist{followedItems.length === 1 ? "" : "s"}
              </p>
              <ul className="mt-4 flex flex-col gap-4">
                {followedItems.map((playlist) => (
                  <li key={playlist.id}>
                    <StudioCollectionCard
                      playlist={playlist}
                      onUnfollow={(id) => removeCollectionMutation.mutate(id)}
                      unfollowPending={removeCollectionMutation.isPending}
                      unfollowTargetId={removeCollectionMutation.variables}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
