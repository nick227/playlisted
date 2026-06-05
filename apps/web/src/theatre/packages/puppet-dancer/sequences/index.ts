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

export type AutoDanceAttributes = DynamicDanceAttributes

const staticAutoDancePools = {
  calm: ['sleepySway', 'moonwalk', 'twoStep', 'salsaSide'],
  bassy: ['bounce', 'jumpJive', 'panicKnees', 'crabShuffle', 'twist', 'chickenWalk'],
  bright: ['discoPoint', 'wavePop', 'windmillArms', 'noodleArms', 'shoulderShimmy'],
  busy: ['salsaSide', 'shoulderShimmy', 'chickenWalk', 'tinyMarch', 'windmillArms', 'crabShuffle'],
  wild: ['panicKnees', 'noodleArms', 'windmillArms', 'jumpJive', 'wavePop', 'crabShuffle'],
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

export function isDynamicDance(id: unknown): boolean {
  return id === dynamicRandomSequenceId
}

export function pickAutoDanceSequenceId(attributes: AutoDanceAttributes = {}, currentId?: string | null): string {
  const energy = attributes.energy ?? 0
  const bass = attributes.bass ?? 0
  const highs = attributes.highs ?? 0
  const centroid = attributes.centroid ?? 0
  const flux = attributes.flux ?? 0
  const bassFlux = attributes.bassFlux ?? 0
  const highsFlux = attributes.highsFlux ?? 0
  const accidentEnergy = Math.max(flux, bassFlux, highsFlux, energy * 0.75)
  const staticSlotChance = Math.min(0.42, 0.12 + accidentEnergy * 1.45)

  if (Math.random() > staticSlotChance) return dynamicRandomSequenceId

  let pool = staticAutoDancePools.calm
  if (bass > 0.28 || bassFlux > 0.055) pool = staticAutoDancePools.bassy
  else if (centroid > 0.32 || highs > 0.14 || highsFlux > 0.04) pool = staticAutoDancePools.bright
  else if (flux > 0.055 || energy > 0.075) pool = staticAutoDancePools.busy
  if (accidentEnergy > 0.13 && Math.random() < 0.34) pool = staticAutoDancePools.wild

  const available = pool.filter(id => id !== currentId && danceSequences[id])
  if (available.length === 0) return dynamicRandomSequenceId
  return available[Math.floor(Math.random() * available.length)]
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
