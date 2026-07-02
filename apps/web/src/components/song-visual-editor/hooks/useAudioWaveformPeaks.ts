import { useEffect, useState } from "react";

import { resolveAssetUrl } from "../types";

const PEAK_COUNT = 480;

export type WaveformPeaksState = {
  peaks: number[];
  durationSec: number;
};

export function useAudioWaveformPeaks(audioUrl?: string | null) {
  const [data, setData] = useState<WaveformPeaksState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setData(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const response = await fetch(resolveAssetUrl(audioUrl));
        if (!response.ok) throw new Error("Could not load audio for waveform.");

        const buffer = await response.arrayBuffer();
        const context = new AudioContext();
        const decoded = await context.decodeAudioData(buffer.slice(0));
        await context.close();

        const channel = decoded.getChannelData(0);
        const blockSize = Math.max(1, Math.floor(channel.length / PEAK_COUNT));
        const peaks: number[] = [];

        for (let index = 0; index < PEAK_COUNT; index += 1) {
          let peak = 0;
          const start = index * blockSize;
          const end = Math.min(channel.length, start + blockSize);
          for (let sample = start; sample < end; sample += 1) {
            peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
          }
          peaks.push(peak);
        }

        if (!cancelled) {
          setData({ peaks, durationSec: decoded.duration });
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "Waveform decode failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  return { data, loading, error };
}
