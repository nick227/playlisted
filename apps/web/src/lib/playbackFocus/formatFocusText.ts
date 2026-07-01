import type { FocusRecording } from "@/lib/playbackFocus/types";

export function formatTrackDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function buildArtistInfoLine(recording: FocusRecording): string | null {
  if (!recording.ownerName) return null;
  const genre = recording.genreLabel ?? formatRecordingType(recording.recordingType);
  return genre ? `${recording.ownerName} · ${genre}` : recording.ownerName;
}

export function buildFallbackInfoText(recording: FocusRecording): string | null {
  const metaParts = [
    recording.genreLabel ?? formatRecordingType(recording.recordingType),
    formatTrackDuration(recording.durationSeconds),
  ].filter(Boolean);

  if (metaParts.length > 0) return metaParts.join(" · ");
  if (recording.ownerName && recording.playlistTitle) {
    return `From ${recording.ownerName}'s ${recording.playlistTitle}`;
  }
  if (recording.ownerName) return `From ${recording.ownerName}'s uploads`;
  if (recording.title) return `Now playing: ${recording.title}`;
  return null;
}

function formatRecordingType(recordingType: string | null | undefined): string | null {
  if (!recordingType) return null;
  return recordingType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
