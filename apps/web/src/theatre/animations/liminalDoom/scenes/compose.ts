import { composeVenueAndCast, type CastMemberDef, type SceneFrame } from '../../../sceneKit'
import type { LiminalRenderer } from '../render/renderer'
import type { SceneComposeParams, SceneType } from '../core/types'
import { ensureLiminalScenesRegistered } from './register'

export function toSceneFrame(p: SceneComposeParams): SceneFrame {
  return {
    width: p.bounds.width,
    height: p.bounds.height,
    time: p.time,
    seed: p.seed,
    bass: p.audio.bass,
    mids: p.audio.mids,
    highs: p.audio.highs,
    beat: p.audio.beat,
    chaos: p.audio.chaos,
    reducedMotion: p.reducedMotion,
    lowPower: p.lowPower,
  }
}

/** Venue geometry + registered cast + optional extra people. */
export function composeScene(
  renderer: LiminalRenderer,
  type: SceneType,
  p: SceneComposeParams,
  extraCast: readonly CastMemberDef[] = [],
) {
  ensureLiminalScenesRegistered()
  composeVenueAndCast(renderer, p.bounds, toSceneFrame(p), type, extraCast)
}

export { VENUE_PHRASES as PHRASE_BANK } from '../../../sceneKit'
