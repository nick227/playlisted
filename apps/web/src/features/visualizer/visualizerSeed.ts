import type { VisualizerSeed } from "./visualizerTypes";

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unit(seed: number, salt: number): number {
  const value = Math.imul(seed ^ Math.imul(salt, 2654435761), 2246822519) >>> 0;
  return value / 4294967295;
}

export function createVisualizerSeed(recordingId: string | undefined): VisualizerSeed {
  const value = hashString(recordingId ?? "playlisted-idle-visualizer");
  return {
    value,
    barSpacing: 0.75 + unit(value, 1) * 0.75,
    curveDensity: 0.6 + unit(value, 2) * 0.8,
    rotationOffset: unit(value, 3) * Math.PI * 2,
    pulseSoftness: 0.35 + unit(value, 4) * 0.5,
    accentEmphasis: 0.35 + unit(value, 5) * 0.65,
    drift: unit(value, 6) > 0.5 ? 1 : -1,
  };
}
