import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type AudioAnalyserConnection = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
};

type AudioAnalyserState = {
  analyser: AnalyserNode | null;
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  connected: boolean;
  error: Error | null;
  resume: () => Promise<void>;
};

export const ANALYSER_FFT_SIZE = 1024;

const analyserConnections = new WeakMap<HTMLMediaElement, AudioAnalyserConnection>();

const emptyFrequencyData = new Uint8Array(ANALYSER_FFT_SIZE / 2);
const emptyTimeData = new Uint8Array(ANALYSER_FFT_SIZE);

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? null;
}

function createConnection(audio: HTMLAudioElement): AudioAnalyserConnection {
  const existing = analyserConnections.get(audio);
  if (existing) return existing;

  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    throw new Error("Web Audio API is unavailable.");
  }

  const context = new AudioContextConstructor();
  const source = context.createMediaElementSource(audio);
  const analyser = context.createAnalyser();
  analyser.fftSize = ANALYSER_FFT_SIZE;
  analyser.smoothingTimeConstant = 0.84;
  source.connect(analyser);
  analyser.connect(context.destination);

  const connection = {
    context,
    source,
    analyser,
    frequencyData: new Uint8Array(analyser.frequencyBinCount),
    timeData: new Uint8Array(analyser.fftSize),
  };
  analyserConnections.set(audio, connection);
  return connection;
}

export function useAudioAnalyser(audioRef: RefObject<HTMLAudioElement | null>): AudioAnalyserState {
  const connectionRef = useRef<AudioAnalyserConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || connectionRef.current) return connectionRef.current;
    try {
      const connection = createConnection(audio);
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
