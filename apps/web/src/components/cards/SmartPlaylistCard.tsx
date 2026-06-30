import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { PlaylistActionMenu } from "@/components/media/PlaylistActionMenu";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { usePlaylist } from "@/hooks/usePlaylist";
import { usePlaylistPlayback } from "@/hooks/usePlaylistPlayback";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { libraryGenrePath } from "@/lib/libraryPaths";
import { coverFallback, playlistPath } from "@/lib/routes";

export interface SmartPlaylistCardProps {
  id: string;
  title: string;
  creatorName?: string | null;
  coverArtUrl?: string | null;
  ownerUsername?: string | null;
  slug?: string | null;
  meta?: string | null;
  genre?: { name: string; slug: string } | null;
  className?: string;
  actionSlot?: ReactNode;
  /** When set, only this card shows active for the current playlist (homepage grids). */
  playbackOrigin?: string;
}

export function SmartPlaylistCard({
  id,
  title,
  creatorName,
  coverArtUrl,
  ownerUsername,
  slug,
  meta,
  genre,
  className,
  actionSlot,
  playbackOrigin,
}: SmartPlaylistCardProps) {
  // Lazy fetch — triggered on hover so the page doesn't fire N requests on mount
  const [shouldFetch, setShouldFetch] = useState(false);
  const { data: playlist } = usePlaylist(shouldFetch ? id : undefined);

  const { currentTrack, setQueue, togglePlay } = useAudioPlayer();
  const { isActive, isPlaying } = usePlaylistPlayback(id, playbackOrigin);

  const [hovered, setHovered] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(coverArtUrl ?? "");
  const [fadeIn, setFadeIn] = useState(true);

  const displaySrcRef = useRef(coverArtUrl ?? "");
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cycleIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const pendingPlayRef = useRef(false);

  const artworks = useMemo(() => {
    if (!playlist?.recordings) return [];
    return playlist.recordings
      .map((r) => r.artworkUrl)
      .filter((a): a is string => Boolean(a));
  }, [playlist?.recordings]);

  const href = playlistPath({ id, username: ownerUsername, slug });

  // ── image crossfade ──────────────────────────────────────────────────────────

  const changeTo = useCallback((newSrc: string) => {
    if (!newSrc || newSrc === displaySrcRef.current) return;
    clearTimeout(fadeTimeoutRef.current);
    setFadeIn(false);
    fadeTimeoutRef.current = setTimeout(() => {
      displaySrcRef.current = newSrc;
      setDisplaySrc(newSrc);
      setFadeIn(true);
    }, 150);
  }, []);

  // Sync cover art when prop changes and the card is idle
  useEffect(() => {
    if (!hovered && !isActive && coverArtUrl) {
      displaySrcRef.current = coverArtUrl;
      setDisplaySrc(coverArtUrl);
      setFadeIn(true);
    }
  }, [coverArtUrl, hovered, isActive]);

  // While active: mirror the current track's artwork
  useEffect(() => {
    if (isActive && currentTrack?.artworkUrl) {
      changeTo(currentTrack.artworkUrl);
    }
  }, [isActive, currentTrack?.id, currentTrack?.artworkUrl, changeTo]);

  // Hover: cycle through song artworks
  useEffect(() => {
    clearInterval(cycleIntervalRef.current);
    if (!hovered || isActive || artworks.length < 2) return;

    if (artworks[0]) changeTo(artworks[0]);

    let idx = 0;
    cycleIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % artworks.length;
      changeTo(artworks[idx]);
    }, 1400);

    return () => clearInterval(cycleIntervalRef.current);
  }, [hovered, isActive, artworks, changeTo]);

  // Reset to cover when hover ends (and not playing)
  useEffect(() => {
    if (!hovered && !isActive && coverArtUrl) {
      clearInterval(cycleIntervalRef.current);
      changeTo(coverArtUrl);
    }
  }, [hovered, isActive, coverArtUrl, changeTo]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearTimeout(fadeTimeoutRef.current);
      clearInterval(cycleIntervalRef.current);
    },
    [],
  );

  // ── playback ─────────────────────────────────────────────────────────────────

  const startPlaying = useCallback(
    (pl: NonNullable<typeof playlist>) => {
      if (!pl.recordings?.length) return;
      const queue = pl.recordings.map((r) => ({
        ...r,
        playlistTitle: pl.title,
        ownerName: pl.owner.displayName,
      }));
      setQueue(
        queue,
        0,
        {
          playlistId: id,
          playlistOwnerUsername: ownerUsername ?? pl.owner.username,
          playlistSlug: slug ?? pl.slug,
          sourceContext: "card",
        },
        {
          segmentLabel: pl.title,
          playbackOrigin,
          originScope: playbackOrigin ? "playlist" : undefined,
        },
      );
    },
    [id, ownerUsername, playbackOrigin, slug, setQueue],
  );

  // Auto-play once data arrives after an early click
  useEffect(() => {
    if (pendingPlayRef.current && playlist?.recordings?.length) {
      pendingPlayRef.current = false;
      startPlaying(playlist);
    }
  }, [playlist, startPlaying]);

  function handleMouseEnter() {
    setHovered(true);
    if (!shouldFetch) setShouldFetch(true);
  }

  function handlePlay() {
    if (isActive) {
      togglePlay();
      return;
    }
    if (!playlist?.recordings?.length) {
      if (!shouldFetch) setShouldFetch(true);
      pendingPlayRef.current = true;
      return;
    }
    startPlaying(playlist);
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className={`group/card flex flex-col ${className ?? ""}`}>
      <div className="relative">
        {/* Image — click plays, hover previews */}
        <button
          type="button"
          className="group relative aspect-square w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setHovered(false)}
          onClick={handlePlay}
          aria-label={isActive ? (isPlaying ? `Pause ${title}` : `Resume ${title}`) : `Play ${title}`}
        >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt=""
            loading="lazy"
            decoding="async"
            className={[
              "h-full w-full object-cover transition-opacity duration-150",
              fadeIn ? "opacity-100" : "opacity-0",
            ].join(" ")}
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: coverFallback(title) }}
            aria-hidden
          />
        )}
        <span
          className={[
            "playback-thumb-glow rounded-lg",
            isActive ? "is-active" : "",
            isPlaying ? "is-playing" : "",
          ].join(" ")}
          aria-hidden="true"
        />
        <PlaybackBars variant="thumb" active={isActive} playing={isPlaying} />

        {/* Play / pause overlay */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-200",
            hovered || isActive ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] shadow-xl">
            {isPlaying ? (
              <Pause size={20} fill="white" className="text-white" />
            ) : (
              <Play size={20} fill="white" className="ml-1 text-white" />
            )}
          </div>
        </div>

        {/* Active brand ring */}
        {isActive && (
          <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-[var(--color-brand)]" />
        )}

        {/* Currently playing track info */}
        {isActive && currentTrack && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <p className="truncate text-xs font-semibold text-white">{currentTrack.title}</p>
            <p className="truncate text-xs text-white/50">{currentTrack.ownerName}</p>
          </div>
        )}

        </button>

        <div className="absolute right-1.5 top-1.5 z-50">
          {actionSlot ?? (
            <PlaylistActionMenu
              playlistId={id}
              title={title}
              ownerUsername={ownerUsername}
              slug={slug}
            />
          )}
        </div>

        <FavoriteHeartButton target="playlist" id={id} />
      </div>

      {/* Text — navigates to the playlist page */}
      <Link to={href} className="min-w-0 transition-opacity hover:opacity-80 bg-[var(--color-canvas)]/90 rounded-lg p-2">
        <p className="truncate text-sm font-medium text-white">{title}</p>
        {creatorName && (
          <p className="truncate text-xs text-[var(--color-text-muted)]">{creatorName}</p>
        )}
        {meta && (
          <p className="truncate text-xs text-[var(--color-text-subtle)]">{meta}</p>
        )}
      </Link>
      {genre && (
        <Link
          to={libraryGenrePath(genre.slug)}
          className="-mt-1 block truncate text-xs text-[var(--color-text-subtle)] transition hover:text-[var(--color-text-muted)] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {genre.name}
        </Link>
      )}
    </div>
  );
}
