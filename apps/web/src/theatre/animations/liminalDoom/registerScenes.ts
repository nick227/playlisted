import { registerLiminalCastPresets } from './castPresets'
import { registerLiminalVenues } from './venues'

let registered = false

/** Idempotent — safe to call from every frame init. */
export function ensureLiminalScenesRegistered() {
  if (registered) return
  registered = true
  registerLiminalVenues()
  registerLiminalCastPresets()
}
