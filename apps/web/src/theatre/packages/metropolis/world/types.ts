export type DistrictId =
  | 'projects'
  | 'industrial'
  | 'strip'
  | 'clubRow'
  | 'theatre'
  | 'venue'
  | 'horror'
  | 'haze'
  | 'rust'
  | 'waterfront'
  | 'core'
  | 'park'

export type CityCell = {
  district: DistrictId
  floors: number
  road: boolean
  water: boolean
  rail: boolean
  seed: number
  archetypeId: number
}

export type ScreenPoint = { sx: number; sy: number }

export type ProjectedPoint = ScreenPoint & { depth: number }

export type CameraState = {
  originX: number
  originY: number
  zoom: number
  swayX: number
  swayY: number
}

export type CarState = {
  id: number
  gx: number
  gy: number
  displayGx: number
  displayGy: number
  dir: 0 | 1 | 2 | 3
  speed: number
  headlight: boolean
  trailX: number
  trailY: number
}

export type MetropolisAudio = {
  bass: number
  mids: number
  highs: number
  energy: number
  beat: boolean
  chaos: boolean
}
