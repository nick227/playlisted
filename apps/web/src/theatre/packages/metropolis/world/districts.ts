import type { DistrictId } from './types'

export type DistrictStyle = {
  id: DistrictId
  base: string
  top: string
  accent: string
  window: string
  glow: string
  maxFloors: number
}

export const DISTRICTS: Record<DistrictId, DistrictStyle> = {
  projects: {
    id: 'projects', base: '#1a1820', top: '#2a2630', accent: '#4a4048',
    window: '#ffd56a', glow: '#886644', maxFloors: 5,
  },
  industrial: {
    id: 'industrial', base: '#141820', top: '#222830', accent: '#556070',
    window: '#ffaa44', glow: '#ff6600', maxFloors: 4,
  },
  strip: {
    id: 'strip', base: '#1a1028', top: '#281840', accent: '#ff44cc',
    window: '#ff88ff', glow: '#ff00aa', maxFloors: 3,
  },
  clubRow: {
    id: 'clubRow', base: '#120818', top: '#201028', accent: '#00ffcc',
    window: '#00ffaa', glow: '#00ff88', maxFloors: 4,
  },
  theatre: {
    id: 'theatre', base: '#181018', top: '#281828', accent: '#ff2244',
    window: '#ffcc88', glow: '#ff4466', maxFloors: 5,
  },
  venue: {
    id: 'venue', base: '#141018', top: '#221828', accent: '#8844ff',
    window: '#cc88ff', glow: '#6622ff', maxFloors: 4,
  },
  horror: {
    id: 'horror', base: '#0a080c', top: '#141018', accent: '#224422',
    window: '#88ff88', glow: '#004400', maxFloors: 6,
  },
  haze: {
    id: 'haze', base: '#141018', top: '#201828', accent: '#6644aa',
    window: '#aa88ff', glow: '#4422aa', maxFloors: 3,
  },
  rust: {
    id: 'rust', base: '#181410', top: '#282018', accent: '#886644',
    window: '#aa7744', glow: '#553311', maxFloors: 3,
  },
  waterfront: {
    id: 'waterfront', base: '#0c1418', top: '#142028', accent: '#4488aa',
    window: '#88ccff', glow: '#226688', maxFloors: 4,
  },
  core: {
    id: 'core', base: '#101018', top: '#181828', accent: '#6688cc',
    window: '#aaccff', glow: '#4466aa', maxFloors: 10,
  },
  park: {
    id: 'park', base: '#0c140c', top: '#142014', accent: '#224422',
    window: '#000000', glow: '#000000', maxFloors: 0,
  },
}

const ZONE: DistrictId[][] = [
  ['industrial', 'industrial', 'waterfront', 'waterfront', 'waterfront', 'rust'],
  ['industrial', 'rust', 'rust', 'core', 'core', 'core'],
  ['projects', 'projects', 'rust', 'core', 'clubRow', 'clubRow'],
  ['projects', 'haze', 'theatre', 'clubRow', 'clubRow', 'strip'],
  ['horror', 'haze', 'theatre', 'venue', 'strip', 'strip'],
  ['horror', 'park', 'venue', 'venue', 'strip', 'core'],
]

export function districtAt(gx: number, gy: number, size: number): DistrictId {
  const zx = Math.min(ZONE[0].length - 1, Math.floor((gx / size) * ZONE[0].length))
  const zy = Math.min(ZONE.length - 1, Math.floor((gy / size) * ZONE.length))
  return ZONE[zy][zx]
}
