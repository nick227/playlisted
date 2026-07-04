/**
 * Theatre animation author SDK (v1).
 *
 * Registration model: **curated packages** merged via PR into `registry/seed.ts`.
 * Runtime plugin loading and sandboxed user code are out of scope for v1.
 *
 * Scope: single-layer canvas scenes extending `CanvasAnimation`.
 * Not supported in v1: composites, video/image layers, object-spinner engines, story DSL.
 *
 * Public import path: `@/theatre/author` only. Do not import runtime modules in author packages.
 */
export { defineAnimationPackage } from './defineAnimationPackage'
export type { DefineAnimationPackageOptions } from './defineAnimationPackage'
export { bandsFromPublicContext } from './publicContext'
export type {
  PublicAnimationContext,
  PublicSharedContext,
  ReadonlyFeatures,
  TheatreLayerOptions,
  TriggerPreset,
} from './types'

export { default as CanvasAnimation } from '../core/CanvasAnimation'
export type { CanvasAnimationInitOptions } from '../core/CanvasAnimation'
export type { AnimationMood, AnimationRole, IAnimation } from '../core/IAnimation'
export type { AudioBands } from '../audio/getAudioBands'
export type { TriggerFrame } from '../audio/VisualTriggers'
