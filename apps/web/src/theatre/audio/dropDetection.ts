/** Conservative silence-then-impact detector for shared drop edges. */

export type DropDetectorState = {
  silenceMs: number
  impactActive: boolean
}

const SILENCE_ENERGY_THRESHOLD = 0.08
const SILENCE_MS_REQUIRED = 1_200
const IMPACT_ENERGY_THRESHOLD = 0.6

export function createDropDetectorState(): DropDetectorState {
  return { silenceMs: 0, impactActive: false }
}

export function tickDropDetector(
  state: DropDetectorState,
  energy: number,
  deltaMs: number,
): { state: DropDetectorState; edge: boolean } {
  let silenceMs = state.silenceMs
  if (energy < SILENCE_ENERGY_THRESHOLD) {
    silenceMs += deltaMs
  } else {
    silenceMs = 0
  }

  const impact = silenceMs >= SILENCE_MS_REQUIRED && energy > IMPACT_ENERGY_THRESHOLD
  const edge = impact && !state.impactActive

  return {
    state: {
      silenceMs: edge ? 0 : silenceMs,
      impactActive: impact,
    },
    edge,
  }
}
