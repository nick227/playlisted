import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { authedApi } from "@/lib/authedApi";
import { studioCollectionEditPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";

const typeOptions = [
  { value: "ALBUM" as const, label: "Album" },
  { value: "PLAYLIST" as const, label: "Playlist" },
  { value: "PODCAST_CHANNEL" as const, label: "Podcast channel" },
  { value: "RELEASE" as const, label: "Release / singles" },
];

export function StudioCollectionsPage() {
  const { user, accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["me", "playlists"],
    queryFn: () => client.me.playlists(),
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

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold text-white">Your collections</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Albums, playlists, and podcast channels — edit with the same layout fans will see.
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

      {!data?.data.length ? (
        <div className="mt-10">
          <EmptyState title="No collections yet" description="Create an album or playlist to get started." />
        </div>
      ) : (
        <ul className="mt-10 flex flex-col gap-2">
          {data.data.map((playlist) => (
            <li key={playlist.id}>
              <Link
                to={studioCollectionEditPath(playlist.id)}
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 transition hover:border-white/20"
              >
                <div>
                  <p className="font-semibold text-white">{playlist.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {playlist.type} • {playlist.status} • {playlist.itemCount} tracks
                  </p>
                </div>
                <span className="text-sm text-[var(--color-brand)]">Edit</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
