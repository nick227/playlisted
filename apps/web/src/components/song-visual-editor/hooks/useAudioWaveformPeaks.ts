import { useEffect, useState } from "react";

import { resolveAssetUrl } from "../types";

const PEAK_COUNT = 480;
/** Peaks scanned per slice before yielding, so a long track never blocks input. */
const PEAKS_PER_SLICE = 40;

export type WaveformPeaksState = {
  peaks: number[];
  durationSec: number;
};

type PeaksJob = {
  url: string;
  subscribers: number;
  controller: AbortController;
  promise: Promise<WaveformPeaksState>;
  resolve: (value: WaveformPeaksState) => void;
  reject: (reason: unknown) => void;
};

// Track lists mount a scrubber per row; without these, every visit re-downloads
// and re-decodes every track at once and keeps the main thread busy for seconds.
const resolvedPeaks = new Map<string, WaveformPeaksState>();
const jobs = new Map<string, PeaksJob>();
const queue: PeaksJob[] = [];
let draining = false;
let sharedContext: AudioContext | null = null;

function yieldToBrowser() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function computePeaks(job: PeaksJob): Promise<WaveformPeaksState> {
  const response = await fetch(resolveAssetUrl(job.url), { signal: job.controller.signal });
  if (!response.ok) throw new Error("Could not load audio for waveform.");

  const buffer = await response.arrayBuffer();
  sharedContext ??= new AudioContext();
  const decoded = await sharedContext.decodeAudioData(buffer.slice(0));

  const channel = decoded.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / PEAK_COUNT));
  const peaks: number[] = [];

  for (let index = 0; index < PEAK_COUNT; index += 1) {
    if (index > 0 && index % PEAKS_PER_SLICE === 0) {
      await yieldToBrowser();
      job.controller.signal.throwIfAborted();
    }
    let peak = 0;
    const start = index * blockSize;
    const end = Math.min(channel.length, start + blockSize);
    for (let sample = start; sample < end; sample += 1) {
      peak = Math.max(peak, Math.abs(channel[sample] ?? 0));
    }
    peaks.push(peak);
  }

  return { peaks, durationSec: decoded.duration };
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    for (let job = queue.shift(); job; job = queue.shift()) {
      // Every row that wanted this track unmounted while it waited.
      if (job.controller.signal.aborted) continue;
      try {
        const result = await computePeaks(job);
        resolvedPeaks.set(job.url, result);
        job.resolve(result);
      } catch (err) {
        job.reject(err);
      } finally {
        // An aborted job may already have been replaced by a fresh subscription.
        if (jobs.get(job.url) === job) jobs.delete(job.url);
      }
    }
  } finally {
    draining = false;
  }
}

function subscribe(url: string): PeaksJob {
  let job = jobs.get(url);
  if (!job) {
    let resolve!: PeaksJob["resolve"];
    let reject!: PeaksJob["reject"];
    const promise = new Promise<WaveformPeaksState>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    job = { url, subscribers: 0, controller: new AbortController(), promise, resolve, reject };
    jobs.set(url, job);
    queue.push(job);
    void drainQueue();
  }
  job.subscribers += 1;
  return job;
}

function unsubscribe(job: PeaksJob) {
  job.subscribers -= 1;
  if (job.subscribers > 0 || resolvedPeaks.has(job.url)) return;
  job.controller.abort();
  jobs.delete(job.url);
}

export function useAudioWaveformPeaks(audioUrl?: string | null) {
  const cached = audioUrl ? resolvedPeaks.get(audioUrl) ?? null : null;
  const [data, setData] = useState<WaveformPeaksState | null>(cached);
  const [loading, setLoading] = useState(Boolean(audioUrl) && !cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioUrl) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const known = resolvedPeaks.get(audioUrl);
    if (known) {
      setData(known);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const job = subscribe(audioUrl);
    job.promise.then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setData(null);
        setError(err instanceof Error ? err.message : "Waveform decode failed.");
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe(job);
    };
  }, [audioUrl]);

  return { data, loading, error };
}
