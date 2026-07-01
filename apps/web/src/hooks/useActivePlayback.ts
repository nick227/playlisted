import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";
import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { getRadioSeekTime } from "@/lib/radio/radioPlayback";

export function useActivePlayback() {
  const { currentTrack, isPlaying: sitePlaying } = useAudioPlayer();
  const { currentTime: siteCurrentTime } = usePlaybackTransport();

  const { playing: radioPlaying, nowPlaying, audioRef: radioAudioRef } = useRadioPlayer();

  const isRadioActive = radioPlaying && Boolean(nowPlaying);
  const [radioTime, setRadioTime] = useState(0);

  useEffect(() => {
    if (!isRadioActive || !nowPlaying) return;
    const audio = radioAudioRef.current;
    if (!audio) return;

    const syncFromAudio = () => {
      setRadioTime(audio.currentTime);
    };

    const stationElapsed = getRadioSeekTime(nowPlaying.elapsedSeconds, nowPlaying.durationSeconds);
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
  }, [isRadioActive, nowPlaying, radioAudioRef]);

  const activeTrack = isRadioActive ? nowPlaying : currentTrack;
  const isPlaying = isRadioActive ? radioPlaying : sitePlaying;
  const currentTime = isRadioActive ? radioTime : siteCurrentTime;

  return {
    track: activeTrack,
    isPlaying,
    currentTime,
    isRadio: isRadioActive,
  };
}
