import type { TopSongItem } from "@playlisted/client-sdk";

import { homeChartSongOrigin } from "@/lib/playbackOrigin";
import { chartItemPlaybackContext, topSongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { HOME_CHART_SONG_SECTION } from "./chartConfig";

const SEGMENT_LABEL = "Top Songs";

export function useHomeChartSongPlayback() {
  const { playTrack, currentTrack, activeOriginKey, togglePlay } = useAudioPlayer();

  function play(item: TopSongItem, siblings: TopSongItem[]) {
    const origin = homeChartSongOrigin(HOME_CHART_SONG_SECTION, item.recordingId);
    if (currentTrack?.id === item.recordingId && activeOriginKey === origin) {
      togglePlay();
      return;
    }
    const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
    if (idx < 0) return;
    const tracks = siblings.map((s) => topSongToQueueTrack(s, SEGMENT_LABEL));
    playTrack(topSongToQueueTrack(item, SEGMENT_LABEL), tracks, chartItemPlaybackContext(item), {
      segmentLabel: SEGMENT_LABEL,
      playbackOrigin: origin,
    });
  }

  return { play };
}
