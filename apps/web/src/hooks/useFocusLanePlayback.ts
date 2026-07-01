import { useEffect, useState } from "react";

import { getRadioSeekTime } from "@/lib/radio/radioPlayback";
import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

export function useFocusLanePlayback() {
  const { currentTrack, isPlaying: sitePlaying } = useAudioPlayer();
  const { currentTime: siteCurrentTime } = usePlaybackTransport();
  const { playing: radioPlaying, nowPlaying, audioRef } = useRadioPlayer();

  const isRadio = Boolean(radioPlaying && nowPlaying);
  const track = isRadio ? nowPlaying : currentTrack;
  const isPlaying = isRadio ? radioPlaying : sitePlaying;
  const [radioTime, setRadioTime] = useState(0);

  useEffect(() => {
    if (!isRadio || !nowPlaying) {
      setRadioTime(0);
      return;
    }

    const audio = audioRef.current;
    const stationElapsed = getRadioSeekTime(nowPlaying.elapsedSeconds, nowPlaying.durationSeconds);

    if (!audio) {
      setRadioTime(stationElapsed);
      return;
    }

    const syncFromAudio = () => {
      setRadioTime(audio.currentTime);
    };

    if (audio.currentTime < 0.5 && stationElapsed > 0.5) {
      setRadioTime(stationElapsed);
    } else {
      syncFromAudio();
    }

    audio.addEventListener("timeupdate", syncFromAudio);
    audio.addEventListener("seeked", syncFromAudio);
    return () => {
      audio.removeEventListener("timeupdate", syncFromAudio);
      audio.removeEventListener("seeked", syncFromAudio);
    };
  }, [audioRef, isRadio, nowPlaying]);

  const currentTime = isRadio ? radioTime : siteCurrentTime;

  return {
    track,
    isPlaying,
    currentTime,
    isRadio,
  };
}
