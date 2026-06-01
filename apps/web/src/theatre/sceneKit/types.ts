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

export type CastRole = 'speaker' | 'listener' | 'ambient'

/** Studio cast: one preset id per visual library (liminal doom POC). */
export type CharacterRecipe = {
  bodyId: string
  faceId: string
  hairId: string
  eyesId: string
  mouthId: string
  clothesId: string
}

export type CharacterRecipeModifiers = {
  scaleBias?: number
  distortBias?: number
}

/** `studio` = high-fidelity face director (e.g. liminal doom); skips primitive renderer faces. */
export type CastFaceLayer = 'primitive' | 'studio'

export type BodyGender = 'male' | 'female'
export type BodyStyle = 'punk' | 'neon' | 'classic' | 'thrift' | 'street' | 'formal'
export type CastActivity =
  | 'hangOut'
  | 'stand'
  | 'look'
  | 'wander'
  | 'dance'
  | 'drink'
  | 'smoke'
  | 'playDrums'
  | 'playGuitar'
  | 'playBass'
  | 'bartend'

export type CastMemberDef = {
  id: string
  placement: CastPlacement
  role?: CastRole
  faceLayer?: CastFaceLayer
  /** Body pose — most cast hang out; only some speak. */
  activity?: CastActivity
  gender?: BodyGender
  style?: BodyStyle
  /** Body scale (defaults to placement.scale). */
  bodyScale?: number
  /** Face overlay scale when showFace (defaults to placement.scale). */
  faceScale?: number
  /** Draw procedural face on head (default: only when speaks). */
  showFace?: boolean
  /** Normalized wander radius for `wander` activity. */
  wanderRadius?: number
  /** When true, may deliver a timed phrase line to the viewer. */
  speaks?: boolean
  phraseSalt?: number
  phraseBank?: string
  /** Ms after watch phase before line starts. */
  speakDelayMs?: number
  /** Preferred phrase presentation (studio layer). */
  phraseFormat?: 'subtitleShard' | 'wallText' | 'tornCaption' | 'bubble'
  eyeTrackX?: number
  eyeTrackY?: number
  alpha?: number
  faceMode?: FaceMode
  /** Partial recipe — missing slots filled from seed at spawn. */
  recipe?: Partial<CharacterRecipe>
  recipeModifiers?: CharacterRecipeModifiers
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
