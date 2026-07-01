import type { Features } from '../audio/AudioFeatureExtractor'
import type { TheatreAudioSnapshot } from '../audio/TheatreAudioBus'
import type { TriggerFrame } from '../audio/VisualTriggers'

export type AnimationRole = 'background' | 'subject' | 'foreground' | 'overlay' | 'any'
export type AnimationLayerType = 'image' | 'video' | 'canvas' | 'ui' | 'hybrid'
export type AnimationMood = 'calm' | 'dynamic' | 'chaos' | 'nightmare'

export type AnimationOptions = {
  role?: AnimationRole
  opacity?: number
  zIndex?: number
  blendMode?: string
  sensitivity?: number
  intensity?: number
  preset?: 'tame' | 'vivid' | 'chaos' | 'nightmare' | string
  [key: string]: any
}

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

export type AnimationContext = {
  audioElement?: HTMLMediaElement | null
  analyser?: AnalyserNode | null
  mediaSrc?: string
  artworkUrl?: string
  metadata?: { title?: string; artist?: string }
  options?: AnimationOptions
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

export type ScenePreset = {
  id: string
  label: string
  layers: SceneLayer[]
  runToEnd?: boolean
  meta?: any
}

export type RegistryEntry = Omit<SceneLayer, 'type'> & {
  label: string
  visualType: AnimationLayerType
  mood: AnimationMood
  role?: AnimationRole
  runToEnd?: boolean
  weight?: number
}
