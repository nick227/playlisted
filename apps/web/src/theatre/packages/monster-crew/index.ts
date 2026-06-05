import type { AnimationPackage } from '../../registry/packages'
import monsterCrewFactory from './MonsterCrewScene'
import { monsterCrewManifest } from './manifest'
import { monsterCrewPresets } from './presets'

export { monsterCrewFactory }

export const monsterCrewPackage: AnimationPackage = {
  manifest: monsterCrewManifest,
  animations: [
    { id: 'monsterCrew', label: 'Monster Cycle', factory: monsterCrewFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 4 },
  ],
  presets: monsterCrewPresets,
}
