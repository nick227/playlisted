export type MediaPlaybackSyncInput = {
  audioCurrentSec: number
  timelineStartSec: number
  startOffsetSec?: number
  loop: boolean
  naturalDurationSec: number
  videoDurationSec?: number | null
}

export type MediaPlaybackSyncResult = {
  mediaTimeSec: number
  shouldPlay: boolean
  clipElapsedSec: number
}

export type TimelineSyncOptions = {
  timelineStartSec: number
  startOffsetSec?: number
  loop: boolean
  naturalDurationSec: number
}

export const MEDIA_SEEK_DRIFT_THRESHOLD_SEC = 0.2
export const MEDIA_SEEK_MIN_INTERVAL_MS = 250

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function resolveNaturalDurationSec(input: MediaPlaybackSyncInput): number {
  const fromVideo = input.videoDurationSec
  if (fromVideo != null && Number.isFinite(fromVideo) && fromVideo > 0) {
    return fromVideo
  }
  if (Number.isFinite(input.naturalDurationSec) && input.naturalDurationSec > 0) {
    return input.naturalDurationSec
  }
  return 0.001
}

export function resolveMediaPlaybackTime(
  input: MediaPlaybackSyncInput,
): MediaPlaybackSyncResult | null {
  const clipElapsedSec = input.audioCurrentSec - input.timelineStartSec
  if (clipElapsedSec < 0) return null

  const startOffsetSec = input.startOffsetSec ?? 0
  const naturalSec = resolveNaturalDurationSec(input)
  let mediaTimeSec = startOffsetSec + clipElapsedSec

  if (input.loop) {
    mediaTimeSec = mediaTimeSec % naturalSec
    return {
      mediaTimeSec,
      shouldPlay: true,
      clipElapsedSec,
    }
  }

  if (mediaTimeSec >= naturalSec) {
    return {
      mediaTimeSec: naturalSec,
      shouldPlay: false,
      clipElapsedSec,
    }
  }

  return {
    mediaTimeSec: clamp(mediaTimeSec, 0, naturalSec),
    shouldPlay: true,
    clipElapsedSec,
  }
}

export function shouldSeekMediaTime(
  currentTimeSec: number,
  targetTimeSec: number,
  thresholdSec = MEDIA_SEEK_DRIFT_THRESHOLD_SEC,
): boolean {
  if (!Number.isFinite(currentTimeSec) || !Number.isFinite(targetTimeSec)) return true
  return Math.abs(currentTimeSec - targetTimeSec) > thresholdSec
}

export function shouldThrottleMediaSeek(
  nowMs: number,
  lastSeekAtMs: number | null,
  minIntervalMs = MEDIA_SEEK_MIN_INTERVAL_MS,
): boolean {
  if (lastSeekAtMs == null) return false
  if (!Number.isFinite(nowMs) || !Number.isFinite(lastSeekAtMs)) return false
  return nowMs - lastSeekAtMs < minIntervalMs
}

export function readTimelineSyncOptions(
  options: Record<string, unknown> | undefined,
): TimelineSyncOptions | null {
  const sync = options?.timelineSync
  if (!sync || typeof sync !== 'object') return null

  const candidate = sync as Partial<TimelineSyncOptions>
  if (typeof candidate.timelineStartSec !== 'number') return null
  if (typeof candidate.loop !== 'boolean') return null
  if (typeof candidate.naturalDurationSec !== 'number') return null

  return {
    timelineStartSec: candidate.timelineStartSec,
    startOffsetSec: typeof candidate.startOffsetSec === 'number' ? candidate.startOffsetSec : 0,
    loop: candidate.loop,
    naturalDurationSec: candidate.naturalDurationSec,
  }
}
