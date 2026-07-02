import registry from './index'
import { registerAnimationPackage } from './registerAnimationPackage'
import { registerUserMediaEngine } from '../media/userMediaEngine'
import { createIndividualVideoPackages, SEED_VIDEO_ENTRIES } from '../packages/createVideoPackage'

import { albumArtPackage } from '../packages/album-art'
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
import { cheechChongPackage } from '../packages/cheech-chong'
import { rainPackage } from '../packages/rain'
import { puppetDancerPackage } from '../packages/puppet-dancer'
import { goopyPackage } from '../packages/goopy'
import { circuitBotPackage } from '../packages/circuit-bot'
import { eyeCloudPackage } from '../packages/eye-cloud'
import { jellyBellPackage } from '../packages/jelly-bell'
import { cuteMonstroPackage } from '../packages/cute-monstro'
import { monsterWavePackage } from '../packages/monster-wave'
import { rampagePackage } from '../packages/rampage'
import { cruisinPackage } from '../packages/cruisin'
import {
  registerObjectTheatreInSeed,
  knifeSpiralHorrorPackage,/*
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  ghostOrbitMidnightPackage,
  tacoRainAcidPackage,
  beeSwarmSunsetPackage,
  dicePanicCasinoPackage,
  smileyFloatCandyPackage,
  ufoTunnelCosmicPackage,
  discoDuckRavePackage,
  poopWaveSillyPackage,
  pizzaPortalPosterPackage,
  hotdogFountainToxicPackage,
  heartSpotlightPastelPackage,
  skullIdolGhostsPackage,*/
} from '../packages/object-spinner-mover'

registerUserMediaEngine()

// Package order matters only when presets reference animations owned by an
// earlier package. Keep quietPulse first so reduced-motion fallbacks can point
// at it, then register composite dependencies before their presets.
registerObjectTheatreInSeed([
  /*
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  ghostOrbitMidnightPackage,
  tacoRainAcidPackage,
  beeSwarmSunsetPackage,
  dicePanicCasinoPackage,
  smileyFloatCandyPackage,
  poopWaveSillyPackage,
  ufoTunnelCosmicPackage,
  discoDuckRavePackage,
  pizzaPortalPosterPackage,
  hotdogFountainToxicPackage,
  heartSpotlightPastelPackage,
  skullIdolGhostsPackage,
  */
  knifeSpiralHorrorPackage,
])

;[
  cheechChongPackage,
  rampagePackage,
  cruisinPackage,
  speakerPackage,
  albumArtPackage,
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
  ...createIndividualVideoPackages(SEED_VIDEO_ENTRIES, {
    category: 'lab',
    reducedMotionPreset: 'quietPulse',
  }),
].forEach(registerAnimationPackage)

export default registry
