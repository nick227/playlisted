import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { PlaylistCard } from "@/components/cards/PlaylistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RowSkeleton } from "@/components/feedback/Skeleton";
import { usePlaylists } from "@/hooks/usePlaylists";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";

  const { data: playlists, isLoading: playlistsLoading } = usePlaylists(50);
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["users", "search"],
    queryFn: () => api.users.list({ page: 1, pageSize: 50 }),
    enabled: q.length > 0,
  });

  const isLoading = playlistsLoading || usersLoading;

  const { playlistResults, userResults } = useMemo(() => {
    if (!q) return { playlistResults: [], userResults: [] };
    const lower = q.toLowerCase();
    return {
      playlistResults:
        playlists?.data.filter(
          (p) =>
            p.title.toLowerCase().includes(lower) ||
            p.owner.displayName.toLowerCase().includes(lower),
        ) ?? [],
      userResults:
        users?.data.filter(
          (u) =>
            u.displayName.toLowerCase().includes(lower) ||
            u.username.toLowerCase().includes(lower),
        ) ?? [],
    };
  }, [q, playlists, users]);

  if (!q) {
    return (
      <EmptyState
        title="Search MusicPop"
        description="Find songs, playlists, and artists from the search bar above."
      />
    );
  }

  if (isLoading) return <RowSkeleton />;

  const hasResults = playlistResults.length > 0 || userResults.length > 0;

  if (!hasResults) {
    return <EmptyState title={`No results for "${q}"`} description="Try a different search term." />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-2xl font-bold">
        Results for <span className="text-[var(--color-brand)]">{q}</span>
      </h1>
      {playlistResults.length > 0 ? (
        <ContentRow title="Playlists">
          {playlistResults.map((p) => (
            <PlaylistCard
              key={p.id}
              id={p.id}
              title={p.title}
              creatorName={p.owner.displayName}
              coverArtUrl={p.coverArtUrl}
            />
          ))}
        </ContentRow>
      ) : null}
      {userResults.length > 0 ? (
        <ContentRow title="Artists">
          {userResults.map((u) => (
            <ArtistCard
              key={u.id}
              id={u.id}
              username={u.username}
              displayName={u.displayName}
              subtitle={`@${u.username}`}
              avatarUrl={u.avatarUrl}
            />
          ))}
        </ContentRow>
      ) : null}
    </div>
  );
}
