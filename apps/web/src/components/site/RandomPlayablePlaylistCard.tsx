import { useMemo } from "react";

import { SmartPlaylistCard } from "@/components/cards/SmartPlaylistCard";
import { useTopPlaylists } from "@/hooks/useCharts";
import { playbackOriginKey } from "@/lib/playbackOrigin";

type RandomPlayablePlaylistCardProps = {
  pageKey: string;
};

function pickPlaylistIndex(count: number, pageKey: string) {
  if (count <= 1) return 0;

  const day = Math.floor(Date.now() / 86_400_000);
  let seed = day;
  for (const ch of pageKey) {
    seed = (seed * 33 + ch.charCodeAt(0)) >>> 0;
  }
  return seed % count;
}

export function RandomPlayablePlaylistCard({ pageKey }: RandomPlayablePlaylistCardProps) {
  const playlists = useTopPlaylists("all", 24);

  const playlist = useMemo(() => {
    const pool = playlists.data?.data ?? [];
    return pool[pickPlaylistIndex(pool.length, pageKey)] ?? null;
  }, [pageKey, playlists.data?.data]);

  return (
    <aside className="border-t border-[var(--color-border)] pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-subtle)]">
        AUDIO
      </p>
      <div className="mt-8 max-w-sm">
        {playlist ? (
          <SmartPlaylistCard
            id={playlist.playlistId}
            title={playlist.title}
            creatorName={playlist.owner.displayName}
            coverArtUrl={playlist.coverArtUrl}
            ownerUsername={playlist.owner.username}
            slug={playlist.slug}
            genre={playlist.genre}
            playbackOrigin={playbackOriginKey("site", "editorial", pageKey, playlist.playlistId)}
          />
        ) : (
          <div className="aspect-square rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]" />
        )}
      </div>
    </aside>
  );
}
