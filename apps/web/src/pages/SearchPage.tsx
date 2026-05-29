import { useSearchParams } from "react-router-dom";

import { ArtistCard } from "@/components/cards/ArtistCard";
import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { ContentRow } from "@/components/discovery/ContentRow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { RowSkeleton } from "@/components/feedback/Skeleton";
import { LibraryTrackRow } from "@/components/library/LibraryTrackRow";
import { api } from "@/lib/api";
import { librarySongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useQuery } from "@tanstack/react-query";

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const hasQuery = q.length > 0;
  const { currentTrack, playTrack, togglePlay } = useAudioPlayer();

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", "unified", q],
    queryFn: () => api.search.unified({ q, pageSize: 20 }),
    enabled: hasQuery,
  });

  const songResults = results?.songs ?? [];
  const playlistResults = results?.playlists ?? [];
  const artistResults = results?.artists ?? [];

  function playSong(song: (typeof songResults)[number]) {
    if (currentTrack?.id === song.id) {
      togglePlay();
      return;
    }

    const queue = songResults.map((item) => librarySongToQueueTrack(item, "Search"));
    const idx = songResults.findIndex((item) => item.id === song.id);
    playTrack(librarySongToQueueTrack(song, "Search"), queue.slice(idx >= 0 ? idx : 0), {
      playlistId: song.playlist.id,
      playlistOwnerUsername: song.uploader.username,
      playlistSlug: song.playlist.slug,
      sourceContext: "search",
    });
  }

  if (!q) {
    return (
      <EmptyState
        title="Search Playlisted"
        description="Find songs, playlists, and artists from the search bar above."
      />
    );
  }

  const hasResults = playlistResults.length > 0 || songResults.length > 0 || artistResults.length > 0;

  if (isLoading && !hasResults) return <RowSkeleton />;

  if (!hasResults) {
    return <EmptyState title={`No results for "${q}"`} description="Try a different search term." />;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-8 text-2xl font-bold">
        Results for <span className="text-[var(--color-brand)]">{q}</span>
      </h1>
      {songResults.length > 0 ? (
        <section className="mb-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Songs</h2>
          </div>
          <div className="space-y-1">
            {songResults.map((song) => (
              <LibraryTrackRow
                key={song.id}
                song={song}
                onPlay={() => playSong(song)}
                queueTrack={librarySongToQueueTrack(song, "Search")}
              />
            ))}
          </div>
        </section>
      ) : null}
      {playlistResults.length > 0 ? (
        <ContentRow title="Playlists">
          {playlistResults.map((p) => (
            <SmartPlaylistCard
              key={p.id}
              id={p.id}
              title={p.title}
              creatorName={p.owner.displayName}
              coverArtUrl={p.coverArtUrl}
              ownerUsername={p.owner.username}
              slug={p.slug}
            />
          ))}
        </ContentRow>
      ) : null}
      {artistResults.length > 0 ? (
        <ContentRow title="Artists">
          {artistResults.map((u) => (
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
