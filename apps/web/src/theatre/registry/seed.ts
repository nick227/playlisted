import registry from './index'
import { registerAnimationPackage } from './registerAnimationPackage'

import { speakerPackage } from '../packages/speaker'
import { bioMachinePackage } from '../packages/bio-machine'
import { spinAmpPackage } from '../packages/spin-amp'
import { weatherSpeakerPackage } from '../packages/weather-speaker'
import { stopMotionFlowerStormPackage } from '../packages/stop-motion-flower-storm'
import { impossibleAquariumPackage } from '../packages/impossible-aquarium'
import { signalOrganismPackage } from '../packages/signal-organism'
import { monsterCrewPackage } from '../packages/monster-crew'
import { liminalDoomPackage } from '../packages/liminal-doom'
import { eqBarsPackage } from '../packages/eq-bars'
import { rainPackage } from '../packages/rain'
import { puppetDancerPackage } from '../packages/puppet-dancer'
import { goopyPackage } from '../packages/goopy'
import { circuitBotPackage } from '../packages/circuit-bot'
import { eyeCloudPackage } from '../packages/eye-cloud'
import { jellyBellPackage } from '../packages/jelly-bell'
import { cuteMonstroPackage } from '../packages/cute-monstro'
import { monsterWavePackage } from '../packages/monster-wave'

// Package order matters only when presets reference animations owned by an
// earlier package. Keep quietPulse first so reduced-motion fallbacks can point
// at it, then register composite dependencies before their presets.
[
  speakerPackage,
  bioMachinePackage,
  spinAmpPackage,
  weatherSpeakerPackage,
  stopMotionFlowerStormPackage,
  impossibleAquariumPackage,
  signalOrganismPackage,
  monsterCrewPackage,
  liminalDoomPackage,
  eqBarsPackage,
  rainPackage,
  puppetDancerPackage,
  goopyPackage,
  circuitBotPackage,
  eyeCloudPackage,
  jellyBellPackage,
  cuteMonstroPackage,
  monsterWavePackage,
].forEach(registerAnimationPackage)

export default registry
