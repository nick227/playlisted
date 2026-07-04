export type DistrictId =
  | 'projects' | 'industrial' | 'strip' | 'clubRow' | 'theatre' | 'venue'
  | 'horror' | 'haze' | 'rust' | 'waterfront' | 'core' | 'park'

export type MetropolisAudio = {
  bass: number
  mids: number
  highs: number
  energy: number
  beat: boolean
  chaos: boolean
}
