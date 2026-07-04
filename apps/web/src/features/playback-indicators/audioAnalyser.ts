export const ANALYSER_FFT_SIZE = 1024;

export type AudioAnalyserConnection = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  frequencyData: Uint8Array<ArrayBuffer>;
  timeData: Uint8Array<ArrayBuffer>;
};

const analyserConnections = new WeakMap<HTMLMediaElement, AudioAnalyserConnection>();

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null;
}

export function getOrCreateAudioAnalyserConnection(audio: HTMLMediaElement): AudioAnalyserConnection {
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

  const connection: AudioAnalyserConnection = {
    context,
    source,
    analyser,
    frequencyData: new Uint8Array(analyser.frequencyBinCount),
    timeData: new Uint8Array(analyser.fftSize),
  };

  analyserConnections.set(audio, connection);
  return connection;
}

export function getAudioAnalyserConnection(audio: HTMLMediaElement): AudioAnalyserConnection | null {
  return analyserConnections.get(audio) ?? null;
}
