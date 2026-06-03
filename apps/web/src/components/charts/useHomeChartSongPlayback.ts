import type { TopSongItem } from "@playlisted/client-sdk";

import { homeChartSongOrigin } from "@/lib/playbackOrigin";
import { chartItemPlaybackContext, topSongToQueueTrack } from "@/lib/queueTrack";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { HOME_CHART_SONG_SECTION } from "./chartConfig";

export function useHomeChartSongPlayback(
  sectionKey = HOME_CHART_SONG_SECTION,
  segmentLabel = "Top Songs",
) {
  const { playTrack, currentTrack, activeOriginKey, togglePlay } = useAudioPlayer();

  function play(item: TopSongItem, siblings: TopSongItem[]) {
    const origin = homeChartSongOrigin(sectionKey, item.recordingId);
    if (currentTrack?.id === item.recordingId && activeOriginKey === origin) {
      togglePlay();
      return;
    }
    const idx = siblings.findIndex((s) => s.recordingId === item.recordingId);
    if (idx < 0) return;
    const tracks = siblings.map((s) => topSongToQueueTrack(s, segmentLabel));
    playTrack(topSongToQueueTrack(item, segmentLabel), tracks, chartItemPlaybackContext(item), {
      segmentLabel,
      playbackOrigin: origin,
      originScope: "track",
    });
  }

  return { play };
}
