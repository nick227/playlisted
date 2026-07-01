import { useEffect, useState } from "react";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";
import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";

export function useActivePlayback() {
  const { currentTrack, isPlaying: sitePlaying } = useAudioPlayer();
  const { currentTime: siteCurrentTime } = usePlaybackTransport();
  
  const { playing: radioPlaying, nowPlaying, audioRef: radioAudioRef } = useRadioPlayer();

  const isRadioActive = radioPlaying && Boolean(nowPlaying);
  const [radioTime, setRadioTime] = useState(0);

  useEffect(() => {
    if (!isRadioActive) return;
    const audio = radioAudioRef.current;
    if (!audio) return;
    
    // Set initial time
    setRadioTime(audio.currentTime);

    const onTimeUpdate = () => {
      setRadioTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [isRadioActive, radioAudioRef]);

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
