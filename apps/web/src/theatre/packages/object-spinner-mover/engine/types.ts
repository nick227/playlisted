export type BackgroundPreset =
  | 'radialGradient' | 'checkerboard' | 'starfield' | 'liquidLava' | 'vhsGrid'
  | 'comicBurst' | 'spotlightStage' | 'tunnelWarp' | 'paperCollage' | 'neonCity'

export type ShapeKind =
  | 'smiley' | 'burger' | 'ghost' | 'dice' | 'knife' | 'bee' | 'taco' | 'duck'
  | 'pizza' | 'skull' | 'moon' | 'star' | 'ufo' | 'donut' | 'hotdog' | 'heart'
  | 'discoBall' | 'poop' | 'lightning'

export type ShapePack =
  | 'fastFood' | 'spooky' | 'party' | 'kitchen' | 'nature' | 'gambling'
  | 'cosmic' | 'silly' | 'rave' | 'horrorSnack'

export type MotionPreset =
  | 'float' | 'swarm' | 'orbit' | 'falling' | 'rising' | 'bounce'
  | 'spiral' | 'tunnel' | 'waveRows' | 'panic'

export type BeatBehavior =
  | 'scaleOnBeat' | 'spinKick' | 'burstSpawn' | 'backgroundFlash'
  | 'bassGravity' | 'snareShuffle' | 'dropExplosion' | 'colorFlash' | 'spawnMore'

export type SpawnStyle =
  | 'edges' | 'centerBurst' | 'gridFill' | 'randomPop' | 'beatBurst'
  | 'fountain' | 'rain' | 'orbitRing'

export type PalettePreset =
  | 'candy' | 'toxic' | 'midnight' | 'sunset' | 'monoChrome' | 'acid'
  | 'pastel' | 'poster' | 'chrome' | 'horror'

export type PersonalityPreset =
  | 'lazy' | 'hyper' | 'drunk' | 'wobbly' | 'magnetic' | 'bouncy'
  | 'shy' | 'raver' | 'heavy'

export type HeroBehavior = 'centerWobble' | 'orbitPulse' | 'spinIdle' | 'bounceHero'

export type HeroObjectConfig = {
  shape: ShapeKind
  behavior: HeroBehavior
  scale: number
}

export type ObjectTheatrePreset = {
  backgroundPreset: BackgroundPreset
  shapePack: ShapePack
  motionPreset: MotionPreset
  beatBehavior: BeatBehavior
  spawnStyle: SpawnStyle
  palette: PalettePreset
  depthBands?: number
  heroObject?: HeroObjectConfig
  personality?: PersonalityPreset
  objectCount?: number
}

export type TheatreObject = {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  rotSpeed: number
  baseScale: number
  scalePulse: number
  shape: ShapeKind
  zBand: number
  personality: PersonalityPreset
  colorIndex: number
  orbitAngle: number
  orbitRadius: number
  wavePhase: number
  spawnDelay: number
  alive: boolean
  isHero: boolean
}

export type EngineFrame = {
  w: number
  h: number
  cx: number
  cy: number
  time: number
  delta: number
  energy: number
  bass: number
  mids: number
  beat: boolean
  bassHit: boolean
  midsHit: boolean
  chaosHit: boolean
  bgFlash: number
  dropBurst: number
  particleScale: number
  reducedMotion: boolean
}
