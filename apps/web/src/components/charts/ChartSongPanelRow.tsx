import type { ReactNode } from "react";

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
  imageUrl?: string | null;
  playCount: number;
  onPlay: () => void;
  actionSlot: ReactNode;
}

export function ChartSongPanelRow({
  recordingId,
  playbackOrigin,
  onPlay,
  ...row
}: ChartSongPanelRowProps) {
  const { isActive, isPlaying } = useTrackPlayback(recordingId, playbackOrigin);

  return (
    <ChartPanelRow
      {...row}
      play={{ isActive, isPlaying, onPlay }}
      favorite={{ target: "recording", id: recordingId }}
    />
  );
}
