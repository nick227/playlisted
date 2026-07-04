import type { Features } from '../audio/AudioFeatureExtractor'
import type { TheatreAudioSnapshot } from '../audio/TheatreAudioBus'
import type { TriggerFrame } from '../audio/VisualTriggers'
import type { VisualMediaBeatFx } from '../media/types'
import type { TheatreLayerOptions } from '../author/types'

export type { TheatreLayerOptions } from '../author/types'

export type AnimationRole = 'background' | 'subject' | 'foreground' | 'overlay' | 'any'
export type AnimationLayerType = 'image' | 'video' | 'canvas' | 'ui' | 'hybrid'
export type AnimationMood = 'calm' | 'dynamic' | 'chaos' | 'nightmare'

/** Platform/runtime layer options — extends public layer options with internal keys. */
export type InternalAnimationOptions = TheatreLayerOptions & {
  imageUrl?: string
  videoUrl?: string
  loop?: boolean
  muted?: boolean
  objectFit?: 'cover' | 'contain'
  startOffsetMs?: number
  beatFx?: VisualMediaBeatFx
  mediaAttachmentId?: string
  timelineSync?: {
    timelineStartSec: number
    startOffsetSec?: number
    loop: boolean
    naturalDurationSec: number
  }
  objectTheatrePresetId?: string
  objectTheatre?: unknown
  switchMs?: number
  fadeMs?: number
  [key: string]: unknown
}

/** @deprecated Prefer TheatreLayerOptions for author code; InternalAnimationOptions for platform code. */
export type AnimationOptions = InternalAnimationOptions

export type SharedContext = {
  features?: Features
  audio?: TheatreAudioSnapshot
  reducedMotion?: boolean
  lowPower?: boolean
  dprClamp?: number
  particleScale?: number
  time?: {
    elapsed: number
    delta: number
    frame: number
  }
  getTriggers?: (preset?: string) => TriggerFrame
}

/** Full runtime context — internal. Authors receive PublicAnimationContext in draw(). */
export type AnimationContext = {
  audioElement?: HTMLMediaElement | null
  /** @internal Platform-only. Not exposed to public author draw(). */
  analyser?: AnalyserNode | null
  mediaSrc?: string
  artworkUrl?: string
  metadata?: { title?: string; artist?: string }
  options?: InternalAnimationOptions
  signals?: AbortSignal
  shared?: SharedContext
}

export interface IAnimation {
  init(container: HTMLElement, context: AnimationContext): Promise<void>
  start(): Promise<void>
  pause(): void
  resume(): void
  stop(): Promise<void>
  destroy(): void
  /** Called each frame by the controller's RAF loop. Only implemented by externally-driven animations. */
  renderFrame?(context: AnimationContext): void
  /** Opt in to external RAF driving. After this, start() must not create its own loop. */
  enableExternalDriving?(): void
}

export type AnimationFactory = (ctx: AnimationContext) => IAnimation

export type SceneLayer = {
  id: string
  type: AnimationLayerType
  factory: AnimationFactory
}

export type RegistryEntry = Omit<SceneLayer, 'type'> & {
  label: string
  visualType: AnimationLayerType
  mood: AnimationMood
  role?: AnimationRole
  runToEnd?: boolean
  weight?: number
}
