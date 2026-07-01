import type { components } from "@playlisted/client-sdk";

import type { QueueTrack } from "@/providers/AudioPlayerProvider";
import type { FocusArtist, FocusRecording } from "@/lib/playbackFocus/types";
import { buildArtistInfoLine } from "@/lib/playbackFocus/formatFocusText";

type RadioNowPlaying = components["schemas"]["RadioNowPlaying"];

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
    };
  }

  return {
    id: track.id,
    title: track.title,
    ownerName: track.ownerName,
    ownerUsername: track.ownerUsername,
    artworkUrl: track.artworkUrl,
    description: track.description,
    playlistTitle: track.playlistTitle,
    recordingType: track.recordingType,
    durationSeconds: track.durationSeconds,
    hasSubtitleTrack: track.subtitle != null,
  };
}

export function toFocusArtist(recording: FocusRecording): FocusArtist | null {
  if (!recording.ownerName) return null;

  return {
    artistName: recording.ownerName,
    imageUrl: recording.artistImageUrl ?? recording.artworkUrl,
    bioLine: recording.description?.trim() || buildArtistInfoLine(recording) || undefined,
  };
}
