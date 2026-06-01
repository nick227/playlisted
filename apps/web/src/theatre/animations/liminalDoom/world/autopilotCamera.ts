import { getRoomAtZ, getUpcomingRoom } from './world'
import type { AudioMotionInput, AutopilotState, CameraPose, LiminalRoom, LiminalWorld } from '../core/types'

export type AutopilotOptions = {
  seed?: number
  startZ?: number
  eyeHeight?: number
  focalLength?: number
  near?: number
}

const DEFAULT_EYE_HEIGHT = 2.6

export function createAutopilotState(options: AutopilotOptions = {}): AutopilotState {
  const seed = options.seed ?? 7331
  const camera: CameraPose = {
    position: {
      x: 0,
      y: DEFAULT_EYE_HEIGHT,
      z: options.startZ ?? 0,
    },
    yaw: 0,
    pitch: 0,
    roll: 0,
    focalLength: options.focalLength ?? 520,
    near: options.near ?? 0.15,
  }

  return {
    seed,
    elapsed: 0,
    phase: 'approach',
    camera,
    currentRoomId: null,
    watchRoomId: null,
    watchElapsed: 0,
    completedRoomIds: new Set<string>(),
    passagePulse: 0,
  }
}

export function updateAutopilotCamera(
  state: AutopilotState,
  world: LiminalWorld,
  deltaSeconds: number,
  audio: AudioMotionInput = {},
): AutopilotState {
  const dt = Math.max(0, Math.min(deltaSeconds, 0.1))
  const elapsed = state.elapsed + dt
  const currentZ = state.camera.position.z
  const currentRoom = getRoomAtZ(world, currentZ)
  const upcomingRoom = getUpcomingRoom(world, currentZ)
  const room = currentRoom ?? upcomingRoom
  const bass = clamp01(audio.bass ?? 0)
  const mids = clamp01(audio.mids ?? 0)
  const chaos = clamp01(audio.chaos ?? 0)
  const completedRoomIds = new Set(state.completedRoomIds)
  let phase = state.phase
  let watchRoomId = state.watchRoomId
  let watchElapsed = state.watchElapsed
  let z = currentZ
  let passagePulse = Math.max(0, state.passagePulse - dt * 1.8)

  if (!room) {
    z += getApproachSpeed(elapsed, bass, chaos) * dt
    phase = 'approach'
  } else if (shouldWatchRoom(room, completedRoomIds, z, watchRoomId)) {
    phase = 'watch'
    watchRoomId = room.id
    watchElapsed = watchRoomId === state.watchRoomId ? watchElapsed + dt : dt
    z = approachValue(z, room.holdZ, 7.5 * dt)

    const targetWatch = getTargetWatchDuration(room, audio)
    if (watchElapsed >= targetWatch || audio.onset || (audio.beat && watchElapsed >= room.watchBudget.min)) {
      completedRoomIds.add(room.id)
      phase = 'threshold'
      watchRoomId = null
      watchElapsed = 0
      passagePulse = 1
    }
  } else {
    const thresholdDistance = room.zEnd - z
    phase = thresholdDistance < 3.5 && thresholdDistance > -1 ? 'threshold' : 'approach'
    const speed = phase === 'threshold' ? getPassageSpeed(elapsed, bass, chaos) : getApproachSpeed(elapsed, bass, chaos)
    z += speed * dt

    if (z > room.zEnd) {
      phase = 'passage'
      z += (2.4 + passagePulse * 3) * dt
    }
  }

  const drift = getSyntheticDrift(elapsed, state.seed, bass, mids, chaos, passagePulse)
  const shellWidth = room?.shell.width ?? 10
  const shellHeight = room?.shell.height ?? 6.5
  const maxX = shellWidth * 0.18

  return {
    ...state,
    elapsed,
    phase,
    currentRoomId: room?.id ?? null,
    watchRoomId,
    watchElapsed,
    completedRoomIds,
    passagePulse,
    camera: {
      ...state.camera,
      position: {
        x: clamp(drift.x, -maxX, maxX),
        y: clamp(DEFAULT_EYE_HEIGHT + drift.y, 1.4, shellHeight - 1),
        z,
      },
      yaw: drift.yaw,
      pitch: drift.pitch,
      roll: drift.roll,
    },
  }
}

export function getTargetWatchDuration(room: LiminalRoom, audio: AudioMotionInput = {}) {
  const energy = Math.max(clamp01(audio.bass ?? 0), clamp01(audio.mids ?? 0), clamp01(audio.highs ?? 0))
  const target = room.watchBudget.target + energy * (room.watchBudget.max - room.watchBudget.target)
  return clamp(target, room.watchBudget.min, room.watchBudget.max)
}

function shouldWatchRoom(
  room: LiminalRoom,
  completedRoomIds: Set<string>,
  z: number,
  watchRoomId: string | null,
) {
  if (completedRoomIds.has(room.id)) {
    return false
  }

  return watchRoomId === room.id || z >= room.holdZ
}

function getApproachSpeed(elapsed: number, bass: number, chaos: number) {
  const breath = 0.5 + Math.sin(elapsed * 0.37) * 0.18 + Math.sin(elapsed * 0.11 + 2.1) * 0.1
  return 2.4 + breath + bass * 0.8 + chaos * 1.1
}

function getPassageSpeed(elapsed: number, bass: number, chaos: number) {
  return getApproachSpeed(elapsed, bass, chaos) + 1.8 + chaos * 3
}

function getSyntheticDrift(
  elapsed: number,
  seed: number,
  bass: number,
  mids: number,
  chaos: number,
  passagePulse: number,
) {
  const a = seed * 0.001
  const driftAmp = 1 + bass * 0.45 + chaos * 0.8
  const lurch = passagePulse * (0.18 + chaos * 0.14)

  return {
    x:
      driftAmp *
      (Math.sin(elapsed * 0.19 + a) * 0.55 +
        Math.sin(elapsed * 0.071 + a * 2.7) * 0.35 +
        Math.sin(elapsed * 0.031 + a * 7.1) * 0.24),
    y: Math.sin(elapsed * 0.83 + a) * (0.045 + bass * 0.08) + Math.sin(elapsed * 0.21) * 0.035,
    yaw:
      Math.sin(elapsed * 0.13 + a * 3.1) * 0.055 +
      Math.sin(elapsed * 0.047 + a) * 0.04 +
      lurch,
    pitch: Math.sin(elapsed * 0.17 + a * 5.3) * 0.025 + mids * 0.012 - passagePulse * 0.025,
    roll:
      Math.sin(elapsed * 0.11 + a * 4.4) * 0.035 +
      Math.sin(elapsed * 0.29 + a) * 0.018 +
      passagePulse * 0.06,
  }
}

function approachValue(current: number, target: number, maxStep: number) {
  if (Math.abs(target - current) <= maxStep) {
    return target
  }

  return current + Math.sign(target - current) * maxStep
}

function clamp01(value: number) {
  return clamp(value, 0, 1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
