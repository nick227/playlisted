import type { UserDetail } from "@playlisted/client-sdk";
import { ChevronDown, Pause, Play, Shuffle } from "lucide-react";
import { useState } from "react";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import { TrackList } from "@/components/tracks/TrackList";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { usePlaylistByUsernameSlug } from "@/hooks/usePlaylistByUsernameSlug";
import { formatDurationLong, formatProfileDate } from "@/lib/format";
import { coverFallback, playlistPath } from "@/lib/routes";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

type PlaylistSummary = UserDetail["publicPlaylists"][number];

type ArtistProfileCollectionPanelProps = {
  playlist: PlaylistSummary;
  owner: UserDetail;
  defaultExpanded?: boolean;
};

export function ArtistProfileCollectionPanel({
  playlist,
  owner,
  defaultExpanded = false,
}: ArtistProfileCollectionPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { data: detail, isLoading } = usePlaylistByUsernameSlug(
    expanded ? owner.username : undefined,
    expanded ? playlist.slug : undefined,
  );
  const { setQueue, togglePlay, playbackContext, state } = useAudioPlayer();

  const isActive = playbackContext.playlistId === playlist.id;
  const isPlaying = isActive && state === "playing";

  const recordings = (detail?.recordings ?? []) as CollectionRecording[];
  const queueTracks: QueueTrack[] = recordings.map((recording) => ({
    ...recording,
    playlistTitle: playlist.title,
    ownerName: owner.displayName,
  }));

  function playAll(shuffle = false) {
    if (isActive) {
      togglePlay();
      return;
    }
    if (queueTracks.length === 0) return;
    const tracks = shuffle ? [...queueTracks].sort(() => Math.random() - 0.5) : queueTracks;
    setQueue(tracks, 0, {
      playlistId: playlist.id,
      playlistOwnerUsername: owner.username,
      playlistSlug: playlist.slug,
      sourceContext: "artist-profile",
    });
  }

  function playTrack(_recording: CollectionRecording, index: number) {
    setQueue(queueTracks, index, {
      playlistId: playlist.id,
      playlistOwnerUsername: owner.username,
      playlistSlug: playlist.slug,
      sourceContext: "artist-profile",
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-white/6 bg-[var(--color-surface)]/70">
      <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
        <button
          type="button"
          onClick={() => playAll()}
          className="group relative h-36 w-36 shrink-0 overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
        >
          {playlist.coverArtUrl ? (
            <img src={playlist.coverArtUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: coverFallback(playlist.title) }} />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            {isPlaying ? (
              <Pause size={28} className="text-white" fill="currentColor" />
            ) : (
              <Play size={28} className="ml-1 text-white" fill="currentColor" />
            )}
          </div>
        </button>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {playlist.isPinnedOnProfile ? (
              <span className="rounded-full bg-[var(--color-brand)]/20 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-brand)] uppercase">
                Pinned
              </span>
            ) : null}
            <span className="text-[10px] font-semibold tracking-wider text-[var(--color-text-subtle)] uppercase">
              {playlist.type.replace("_", " ")}
            </span>
          </div>
          <h3 className="text-2xl font-black tracking-tight text-white md:text-3xl">{playlist.title}</h3>
          {playlist.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {playlist.description}
            </p>
          ) : null}
          <p className="text-xs text-[var(--color-text-subtle)]">
            {playlist.itemCount} tracks · {formatDurationLong(playlist.totalDurationSeconds)}
            {playlist.publishedAt ? ` · Published ${formatProfileDate(playlist.publishedAt)}` : ""}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => playAll()}
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-white/90"
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {isPlaying ? "Pause" : "Play all"}
          </button>
          <button
            type="button"
            onClick={() => playAll(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            <Shuffle size={16} />
            Shuffle
          </button>
          <FavoriteHeartButton target="playlist" id={playlist.id} variant="inline" className="!opacity-100" />
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
            aria-expanded={expanded}
          >
            Tracks
            <ChevronDown size={16} className={`transition ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-white/6 px-4 pb-4 pt-2 md:px-6">
          {isLoading ? (
            <p className="py-6 text-sm text-[var(--color-text-muted)]">Loading tracks…</p>
          ) : recordings.length === 0 ? (
            <p className="py-6 text-sm text-[var(--color-text-muted)]">No tracks in this collection.</p>
          ) : (
            <TrackList
              recordings={recordings}
              ownerName={owner.displayName}
              playlistContext={{
                playlistId: playlist.id,
                playlistTitle: playlist.title,
                ownerUsername: owner.username,
                ownerDisplayName: owner.displayName,
                slug: playlist.slug,
              }}
              onPlay={playTrack}
            />
          )}
          <a
            href={playlistPath({ id: playlist.id, href: playlist.href, username: owner.username, slug: playlist.slug })}
            className="mt-4 inline-block text-xs font-medium text-[var(--color-text-muted)] hover:text-white"
          >
            Open collection page →
          </a>
        </div>
      ) : null}
    </article>
  );
}
