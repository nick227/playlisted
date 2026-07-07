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
  genre?: { name: string; slug: string } | null;
  imageUrl?: string | null;
  playCount: number;
  onPlay: () => void;
  actionSlot: ReactNode;
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
  const { isActive, isPlaying } = useTrackPlayback(recordingId, playbackOrigin);

  return (
    <ChartPanelRow
      {...row}
      audioUrl={audioUrl}
      play={{ isActive, isPlaying, onPlay }}
      favorite={{ target: "recording", id: recordingId }}
    />
  );
}
