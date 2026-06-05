import type { AnimationPackage } from '../../registry/packages'
import puppetDancerFactory from './PuppetDancerScene'
import { puppetDancerManifest } from './manifest'
import { puppetDancerPresets } from './presets'

export { PuppetDancerScene, puppetDancerFactory } from './PuppetDancerScene'

export const puppetDancerPackage: AnimationPackage = {
  manifest: puppetDancerManifest,
  animations: [
    { id: 'puppetDancer', label: 'Puppet Dancer', factory: puppetDancerFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 2 },
  ],
  presets: puppetDancerPresets,
}

