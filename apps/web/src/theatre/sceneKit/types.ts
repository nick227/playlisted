/** Shared frame context — venue and cast read the same audio/time state. */
export type SceneFrame = {
  width: number
  height: number
  time: number
  seed: number
  bass: number
  mids: number
  highs: number
  beat: number
  chaos: number
  reducedMotion: boolean
  lowPower: boolean
}

export type StageRect = {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
}

export function stageRect(width: number, height: number): StageRect {
  const top = height * 0.2
  const bottom = height * 0.68
  const left = width * 0.14
  const right = width * 0.86
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) * 0.5,
    centerY: (top + bottom) * 0.5,
  }
}

/** Normalized placement on the stage (0–1). */
export type CastPlacement = {
  nx: number
  ny: number
  scale: number
  z?: number
}

export type FaceMode = 'idle' | 'watching' | 'talking' | 'dissolving'

export type CastMemberDef = {
  id: string
  placement: CastPlacement
  /** When true, shows a speech shard tied to this face. */
  speaks?: boolean
  phraseSalt?: number
  phraseBank?: string
  eyeTrackX?: number
  eyeTrackY?: number
  alpha?: number
  faceMode?: FaceMode
}

export type DrawOpts = {
  alpha?: number
  tint?: string
  mirror?: boolean
}

export type SceneDrawSink = {
  pushFaceMask(
    z: number, x: number, y: number, scale: number, talk: number,
    trackX: number, trackY: number, opt?: DrawOpts,
  ): void
  pushPhraseShard(
    z: number, phrase: string, x: number, y: number, w: number, reveal: number, opt?: DrawOpts,
  ): void
}

/** Venue = background/scene geometry only (no talking cast). */
export type VenueComposer = (sink: SceneDrawSink, stage: StageRect, frame: SceneFrame) => void

export type VenueSceneDef = {
  id: string
  compose: VenueComposer
  /** Cast preset ids layered on top by default. */
  castPresetIds?: string[]
}
