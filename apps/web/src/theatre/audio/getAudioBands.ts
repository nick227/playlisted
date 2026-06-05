import type { AnimationContext } from '../core/IAnimation'

export type AudioBands = { bass: number; mids: number; highs: number }

/** Single shared fallback buffer when `shared.features` is unavailable (not per canvas layer). */
let sharedFallbackFreq: Uint8Array<ArrayBuffer> | null = null

export function bandsFromContext(context: AnimationContext): AudioBands {
  const bands = context.shared?.features?.bands
  if (bands) {
    return { bass: bands.bass ?? 0, mids: bands.mids ?? 0, highs: bands.highs ?? 0 }
  }
  const analyser = context.analyser
  if (analyser) {
    if (!sharedFallbackFreq || sharedFallbackFreq.length !== analyser.frequencyBinCount) {
      sharedFallbackFreq = new Uint8Array(analyser.frequencyBinCount)
    }
    return getAudioBands(analyser, sharedFallbackFreq)
  }
  return getAudioBands(null, null)
}

export function getAudioBands(
  analyser: AnalyserNode | null | undefined,
  data: Uint8Array<ArrayBuffer> | null | undefined,
): AudioBands {
  if (analyser && data) {
    analyser.getByteFrequencyData(data)
    const len = data.length
    const lowEnd = Math.max(1, Math.floor(len * 0.06))
    const midEnd = Math.max(lowEnd + 1, Math.floor(len * 0.25))
    let lowSum = 0, midSum = 0, highSum = 0
    for (let i = 0; i < len; i++) {
      const v = data[i]
      if (i < lowEnd) lowSum += v
      else if (i < midEnd) midSum += v
      else highSum += v
    }
    return {
      bass: lowSum / Math.max(1, lowEnd) / 255,
      mids: midSum / Math.max(1, midEnd - lowEnd) / 255,
      highs: highSum / Math.max(1, len - midEnd) / 255,
    }
  }
  const t = Date.now()
  return {
    bass:  Math.abs(Math.sin(t / 500)) * 0.38,
    mids:  Math.abs(Math.sin(t / 400 + 1)) * 0.28,
    highs: Math.abs(Math.sin(t / 300 + 2)) * 0.16,
  }
}
