import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  ANALYSER_FFT_SIZE,
  getOrCreateAudioAnalyserConnection,
  type AudioAnalyserConnection,
} from "./audioAnalyser";

export { ANALYSER_FFT_SIZE } from "./audioAnalyser";

type AudioAnalyserState = {
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array<ArrayBuffer>;
  timeData: Uint8Array<ArrayBuffer>;
  connected: boolean;
  error: Error | null;
  resume: () => Promise<void>;
};

const emptyFrequencyData = new Uint8Array(ANALYSER_FFT_SIZE / 2);
const emptyTimeData = new Uint8Array(ANALYSER_FFT_SIZE);

export function useAudioAnalyser(audioRef: RefObject<HTMLAudioElement | null>): AudioAnalyserState {
  const connectionRef = useRef<AudioAnalyserConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || connectionRef.current) return connectionRef.current;
    try {
      const connection = getOrCreateAudioAnalyserConnection(audio);
      connectionRef.current = connection;
      setConnected(true);
      setError(null);
      return connection;
    } catch (err) {
      setConnected(false);
      setError(err instanceof Error ? err : new Error("Unable to initialize audio analyser."));
      return null;
    }
  }, [audioRef]);

  const resume = useCallback(async () => {
    const connection = connect();
    if (!connection || connection.context.state === "running") return;
    try {
      await connection.context.resume();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unable to resume audio analyser."));
    }
  }, [connect]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlaybackIntent = () => {
      void resume();
    };

    if (!audio.paused) {
      onPlaybackIntent();
    }

    audio.addEventListener("play", onPlaybackIntent);
    audio.addEventListener("playing", onPlaybackIntent);
    return () => {
      audio.removeEventListener("play", onPlaybackIntent);
      audio.removeEventListener("playing", onPlaybackIntent);
    };
  }, [audioRef, resume]);

  const connection = connectionRef.current;
  return {
    analyser: connection?.analyser ?? null,
    frequencyData: connection?.frequencyData ?? emptyFrequencyData,
    timeData: connection?.timeData ?? emptyTimeData,
    connected,
    error,
    resume,
  };
}
