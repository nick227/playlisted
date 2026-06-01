export type Vec3 = {
  x: number
  y: number
  z: number
}

export type Vec2 = {
  x: number
  y: number
}

export type CameraPose = {
  position: Vec3
  yaw: number
  pitch: number
  roll: number
  focalLength: number
  near: number
}

export type Viewport = {
  width: number
  height: number
}

export type ProjectedPoint = Vec2 & {
  depth: number
}

export type SceneType = 'bandStage' | 'bar' | 'danceFloor' | 'conversation' | 'hallwayCrowd'

export type RoomPhase = 'approach' | 'watch' | 'threshold' | 'passage' | 'inhabited' | 'voidBloom'

export type FigurePose = 'stand' | 'lean' | 'drum' | 'guitar' | 'bartender' | 'watch'

export type AudioReact = {
  bass: number
  mids: number
  highs: number
  beat: number
  chaos: number
}

export type BackWallBounds = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export type SceneComposeParams = {
  bounds: BackWallBounds
  audio: AudioReact
  phase: RoomPhase
  time: number
  seed: number
  reducedMotion: boolean
  lowPower: boolean
}

export type RoomShell = {
  width: number
  height: number
  length: number
  transitionLength: number
}

export type WatchBudget = {
  min: number
  target: number
  max: number
}

export type LiminalRoom = {
  id: string
  index: number
  seed: number
  /** Drives room shell geometry — floor, walls, ceiling, back-wall furniture. */
  sceneType: SceneType
  /** Drives which cast preset loads — independent from sceneType. */
  castType: SceneType
  zStart: number
  zEnd: number
  holdZ: number
  shell: RoomShell
  watchBudget: WatchBudget
  intensity: number
}

export type LiminalWorld = {
  seed: number
  rooms: LiminalRoom[]
  nextIndex: number
  nextZ: number
}

export type AutopilotPhase = 'approach' | 'watch' | 'threshold' | 'passage'

export type AutopilotState = {
  seed: number
  elapsed: number
  phase: AutopilotPhase
  camera: CameraPose
  currentRoomId: string | null
  watchRoomId: string | null
  watchElapsed: number
  completedRoomIds: Set<string>
  passagePulse: number
}

export type AudioMotionInput = {
  bass?: number
  mids?: number
  highs?: number
  chaos?: number
  onset?: boolean
  beat?: boolean
}

export type RoomGenerationOptions = {
  seed?: number
  minRoomLength?: number
  maxRoomLength?: number
  minTransitionLength?: number
  maxTransitionLength?: number
}
