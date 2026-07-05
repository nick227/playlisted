import { useCallback } from "react";
import { Link } from "react-router-dom";

import {
  fetchPlaylistForPlayback,
  pickArtistProfilePlaylist,
  playlistRecordingsToQueue,
} from "@/components/charts/chartPlaylistPlayback";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { api } from "@/lib/api";
import { libraryArtistOrigin } from "@/lib/playbackOrigin";
import { profilePath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { MediaCover } from "./MediaCover";

export interface SmartArtistCardProps {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
  className?: string;
  shape?: "square" | "circle";
  playbackOrigin?: string;
}

export function SmartArtistCard({
  id,
  username,
  displayName,
  avatarUrl,
  subtitle,
  className,
  shape = "square",
  playbackOrigin,
}: SmartArtistCardProps) {
  const { accessToken } = useAuth();
  const { setQueue, togglePlay, activeOriginKey, isPlaying: playerIsPlaying } = useAudioPlayer();
  const origin = playbackOrigin ?? libraryArtistOrigin(id);
  const isActive = activeOriginKey === origin;
  const isPlaying = isActive && playerIsPlaying;

  const play = useCallback(async () => {
    if (isActive) {
      togglePlay();
      return;
    }

    const user = await api.users.getByUsername(username);
    const summary = pickArtistProfilePlaylist(user.publicPlaylists);
    if (!summary) return;

    const detail = await fetchPlaylistForPlayback(accessToken, summary.id);
    const recordings = detail?.recordings ?? [];
    if (recordings.length === 0) return;

    const tracks = playlistRecordingsToQueue(recordings, {
      playlistTitle: summary.title,
      ownerName: displayName,
      artistImageUrl: avatarUrl,
    });

    setQueue(
      tracks,
      0,
      {
        playlistId: summary.id,
        playlistOwnerUsername: username,
        playlistSlug: summary.slug,
        sourceContext: "library",
      },
      {
        segmentLabel: "Library",
        playbackOrigin: origin,
        originScope: "artist",
      },
    );
  }, [accessToken, avatarUrl, displayName, isActive, origin, setQueue, togglePlay, username]);

  return (
    <div className={`group/card flex flex-col ${className ?? ""}`}>
      <div className="relative">
        <MediaCover
          title={displayName}
          imageUrl={avatarUrl}
          shape={shape}
          onPlay={() => void play()}
          isActive={isActive}
          isPlaying={isPlaying}
          showPlaybackBars
        />
        <FavoriteHeartButton target="artist" id={id} />
      </div>
      <Link to={profilePath(username)} className="min-w-0 transition-opacity hover:opacity-80">
        <p className="truncate text-sm font-semibold text-white">{displayName}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>
        ) : null}
      </Link>
    </div>
  );
}
