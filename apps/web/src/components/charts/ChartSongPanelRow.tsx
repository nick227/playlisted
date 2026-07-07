import { useTrackPlayback } from "@/hooks/useTrackPlayback";

import { ChartPanelRow } from "./ChartPanelRow";

interface ChartSongPanelRowProps {
  rank: number;
  recordingId: string;
  playbackOrigin: string;
  title: string;
  titleHref: string;
  subtitle: string;
  subtitleHref: string;
  genre?: { name: string; slug: string } | null;
  imageUrl?: string | null;
  playCount: number;
  onPlay: () => void;

  secondaryMeta?: string;
  variant?: "panel" | "page";
  audioUrl?: string | null;
}

export function ChartSongPanelRow({
  recordingId,
  playbackOrigin,
  onPlay,
  audioUrl,
  ...row
}: ChartSongPanelRowProps) {
  const { isActive, trackIsPlaying } = useTrackPlayback(recordingId, playbackOrigin);

  return (
    <ChartPanelRow
      {...row}
      audioUrl={audioUrl}
      play={{ isActive, isPlaying: trackIsPlaying, onPlay }}
      favorite={{ target: "recording", id: recordingId }}
    />
  );
}
