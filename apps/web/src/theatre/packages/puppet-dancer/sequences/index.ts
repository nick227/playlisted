import type { DanceMap } from './sequenceTypes'
import { twoStepSequence } from './twoStep.sequence'
import { bounceSequence } from './bounce.sequence'
import { robotSequence } from './robot.sequence'
import { noodleArmsSequence } from './noodleArms.sequence'
import { shoulderShimmySequence } from './shoulderShimmy.sequence'
import { panicKneesSequence } from './panicKnees.sequence'
import { chickenWalkSequence } from './chickenWalk.sequence'
import { moonwalkSequence } from './moonwalk.sequence'
import { discoPointSequence } from './discoPoint.sequence'
import { salsaSideSequence } from './salsaSide.sequence'
import { tinyMarchSequence } from './tinyMarch.sequence'
import { windmillArmsSequence } from './windmillArms.sequence'
import { sleepySwaySequence } from './sleepySway.sequence'
import { jumpJiveSequence } from './jumpJive.sequence'
import { twistSequence } from './twist.sequence'
import { wavePopSequence } from './wavePop.sequence'
import { crabShuffleSequence } from './crabShuffle.sequence'
import { createDynamicRandomSequence, dynamicRandomSequence, dynamicRandomSequenceId, type DynamicDanceAttributes } from './dynamicRandom.sequence'

export const danceSequences: Record<string, DanceMap> = {
  twoStep: twoStepSequence,
  goofyTwoStep: twoStepSequence,
  bounce: bounceSequence,
  robot: robotSequence,
  stiffRobot: robotSequence,
  noodleArms: noodleArmsSequence,
  shoulderShimmy: shoulderShimmySequence,
  panicKnees: panicKneesSequence,
  chickenWalk: chickenWalkSequence,
  moonwalk: moonwalkSequence,
  discoPoint: discoPointSequence,
  salsaSide: salsaSideSequence,
  tinyMarch: tinyMarchSequence,
  windmillArms: windmillArmsSequence,
  sleepySway: sleepySwaySequence,
  jumpJive: jumpJiveSequence,
  twist: twistSequence,
  wavePop: wavePopSequence,
  crabShuffle: crabShuffleSequence,
  [dynamicRandomSequenceId]: dynamicRandomSequence,
}

export type DanceOption = {
  id: string
  label: string
}

export function listDanceOptions(): DanceOption[] {
  const seen = new Set<string>()
  const options: DanceOption[] = []
  for (const [id, dance] of Object.entries(danceSequences)) {
    if (seen.has(dance.id)) continue
    seen.add(dance.id)
    options.push({ id, label: dance.label })
  }
  return options
}

export function getDanceSequence(id: unknown, reducedMotion = false, attributes?: DynamicDanceAttributes): DanceMap {
  const dance = id === dynamicRandomSequenceId
    ? createDynamicRandomSequence(attributes)
    : typeof id === 'string' && danceSequences[id] ? danceSequences[id] : twoStepSequence
  if (reducedMotion && dance.reducedMotion?.sequence && danceSequences[dance.reducedMotion.sequence]) {
    return danceSequences[dance.reducedMotion.sequence]
  }
  return dance
}

export {
  twoStepSequence,
  bounceSequence,
  robotSequence,
  noodleArmsSequence,
  shoulderShimmySequence,
  panicKneesSequence,
  chickenWalkSequence,
  moonwalkSequence,
  discoPointSequence,
  salsaSideSequence,
  tinyMarchSequence,
  windmillArmsSequence,
  sleepySwaySequence,
  jumpJiveSequence,
  twistSequence,
  wavePopSequence,
  crabShuffleSequence,
  createDynamicRandomSequence,
  dynamicRandomSequence,
  dynamicRandomSequenceId,
}
