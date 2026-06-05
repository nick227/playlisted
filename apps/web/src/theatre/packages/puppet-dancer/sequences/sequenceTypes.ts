import type { PuppetPoseMap } from '../poses/poseTypes'
import type { TriggerFrame } from '../../../audio/VisualTriggers'

export type DanceEase = 'linear' | 'easeInOut' | 'easeOutBack' | 'elasticOut' | 'snap'
export type DanceTrigger = keyof Pick<TriggerFrame, 'beat' | 'bassHit' | 'midsHit' | 'highsHit' | 'chaosHit'>

export type MotionStep = {
  pose: string
  durationMs: number
  holdMs?: number
  ease?: DanceEase
  intensity?: number
  accents?: string[]
  advanceOn?: DanceTrigger
  beatSnap?: boolean
}

export type DanceMap = {
  schemaVersion: 1
  id: string
  label: string
  description?: string
  author?: string
  loop: boolean
  defaultBpm?: number
  intensity?: number
  loose?: number
  reducedMotion?: {
    sequence?: string
    intensity?: number
    disableAccents?: boolean
  }
  poses: Record<string, PuppetPoseMap>
  triggerAccents?: Partial<Record<DanceTrigger, string[]>>
  steps: MotionStep[]
}

export type DanceSequence = DanceMap
export type DanceStep = MotionStep
