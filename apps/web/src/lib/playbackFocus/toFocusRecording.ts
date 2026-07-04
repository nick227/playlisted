import type { components } from "@playlisted/client-sdk";

import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import type { FocusArtist, FocusRecording } from "@/lib/playbackFocus/types";
import { normalizeSubtitlePosition, normalizeSubtitleStyleId } from "@/lib/subtitleStylePresets";

type RadioNowPlaying = components["schemas"]["RadioNowPlaying"];

function mapTrackSubtitleStyle(track: ActiveTrack) {
  const source = track as { subtitlePosition?: string; subtitleStyleId?: string } | null | undefined;
  return {
    subtitlePosition: normalizeSubtitlePosition(source?.subtitlePosition),
    subtitleStyleId: normalizeSubtitleStyleId(source?.subtitleStyleId),
  };
}

type ActiveTrack = QueueTrack | RadioNowPlaying | null | undefined;

function isRadioTrack(track: ActiveTrack): track is RadioNowPlaying {
  return Boolean(track && "uploader" in track && "playlist" in track);
}

export function toFocusRecording(track: ActiveTrack): FocusRecording | null {
  if (!track) return null;

  if (isRadioTrack(track)) {
    return {
      id: track.id,
      title: track.title,
      ownerName: track.uploader.displayName,
      ownerUsername: track.uploader.username,
      artworkUrl: track.artworkUrl,
      artistImageUrl: track.uploader.avatarUrl,
      description: track.description,
      playlistTitle: track.playlist.title,
      durationSeconds: track.durationSeconds,
      hasSubtitleTrack: track.subtitle != null,
      ...mapTrackSubtitleStyle(track),
    };
  }

  return {
    id: track.id,
    title: track.title,
    ownerName: track.ownerName,
    ownerUsername: track.ownerUsername,
    artworkUrl: track.artworkUrl,
    artistImageUrl: track.artistImageUrl,
    description: track.description,
    playlistTitle: track.playlistTitle,
    recordingType: track.recordingType,
    durationSeconds: track.durationSeconds,
    hasSubtitleTrack: track.subtitle != null,
    ...mapTrackSubtitleStyle(track),
  };
}

export function toFocusArtist(recording: FocusRecording): FocusArtist | null {
  if (!recording.ownerName) return null;

  return {
    artistName: recording.ownerName,
    imageUrl: recording.artistImageUrl ?? null,
    bioLine: recording.description?.trim() || undefined,
  };
}
