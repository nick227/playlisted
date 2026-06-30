import registry from './index'
import { registerAnimationPackage } from './registerAnimationPackage'
import { createVideoPackage } from '../packages/createVideoPackage'

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
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  ghostOrbitMidnightPackage,
  tacoRainAcidPackage,
  beeSwarmSunsetPackage,
  dicePanicCasinoPackage,
  smileyFloatCandyPackage,
  knifeSpiralHorrorPackage,
  ufoTunnelCosmicPackage,
  discoDuckRavePackage,
  poopWaveSillyPackage,
  pizzaPortalPosterPackage,
  hotdogFountainToxicPackage,
  heartSpotlightPastelPackage,
  skullIdolGhostsPackage,
} from '../packages/object-spinner-mover'

// Package order matters only when presets reference animations owned by an
// earlier package. Keep quietPulse first so reduced-motion fallbacks can point
// at it, then register composite dependencies before their presets.
registerObjectTheatreInSeed([
  osmCalmFloatPackage,
  burgerBounceCarnivalPackage,
  ghostOrbitMidnightPackage,
  tacoRainAcidPackage,
  beeSwarmSunsetPackage,
  dicePanicCasinoPackage,
  smileyFloatCandyPackage,
  knifeSpiralHorrorPackage,
  ufoTunnelCosmicPackage,
  discoDuckRavePackage,
  poopWaveSillyPackage,
  pizzaPortalPosterPackage,
  hotdogFountainToxicPackage,
  heartSpotlightPastelPackage,
  skullIdolGhostsPackage,
])

;[
  cheechChongPackage,
  /*
  rampagePackage,
  rampagePackage,
  cruisinPackage,
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
  createVideoPackage({ id: 'video1', label: 'Video 1', videoUrl: '/1.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video2', label: 'Video 2', videoUrl: '/2.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video3', label: 'Video 3', videoUrl: '/3.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video4', label: 'Video 4', videoUrl: '/4.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video5', label: 'Video 5', videoUrl: '/5.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video6', label: 'Video 6', videoUrl: '/6.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video7', label: 'Video 7', videoUrl: '/7.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video8', label: 'Video 8', videoUrl: '/8.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video9', label: 'Video 9', videoUrl: '/9.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video10', label: 'Video 10', videoUrl: '/10.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video11', label: 'Video 11', videoUrl: '/11.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video12', label: 'Video 12', videoUrl: '/12.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video13', label: 'Video 13', videoUrl: '/13.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video14', label: 'Video 14', videoUrl: '/14.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video15', label: 'Video 15', videoUrl: '/15.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video16', label: 'Video 16', videoUrl: '/16.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video17', label: 'Video 17', videoUrl: '/17.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video18', label: 'Video 18', videoUrl: '/18.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video19', label: 'Video 19', videoUrl: '/19.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video20', label: 'Video 20', videoUrl: '/20.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'video21', label: 'Video 21', videoUrl: '/21.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video22', label: 'Video 22', videoUrl: '/22.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video23', label: 'Video 23', videoUrl: '/23.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video24', label: 'Video 24', videoUrl: '/24.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video25', label: 'Video 25', videoUrl: '/25.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video26', label: 'Video 26', videoUrl: '/26.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video27', label: 'Video 27', videoUrl: '/27.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video28', label: 'Video 28', videoUrl: '/28.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video29', label: 'Video 29', videoUrl: '/29.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video30', label: 'Video 30', videoUrl: '/30.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video31', label: 'Video 31', videoUrl: '/31.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video32', label: 'Video 32', videoUrl: '/32.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video33', label: 'Video 33', videoUrl: '/33.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video34', label: 'Video 34', videoUrl: '/34.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video35', label: 'Video 35', videoUrl: '/35.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video36', label: 'Video 36', videoUrl: '/36.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video37', label: 'Video 37', videoUrl: '/37.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video38', label: 'Video 38', videoUrl: '/38.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video39', label: 'Video 39', videoUrl: '/39.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video40', label: 'Video 40', videoUrl: '/40.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video41', label: 'Video 41', videoUrl: '/41.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video42', label: 'Video 42', videoUrl: '/42.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video43', label: 'Video 43', videoUrl: '/43.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video44', label: 'Video 44', videoUrl: '/44.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video45', label: 'Video 45', videoUrl: '/45.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video46', label: 'Video 46', videoUrl: '/46.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video47', label: 'Video 47', videoUrl: '/47.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video48', label: 'Video 48', videoUrl: '/48.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video49', label: 'Video 49', videoUrl: '/49.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video50', label: 'Video 50', videoUrl: '/50.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video51', label: 'Video 51', videoUrl: '/51.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video52', label: 'Video 52', videoUrl: '/52.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video53', label: 'Video 53', videoUrl: '/53.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video54', label: 'Video 54', videoUrl: '/54.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video55', label: 'Video 55', videoUrl: '/55.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video56', label: 'Video 56', videoUrl: '/56.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video57', label: 'Video 57', videoUrl: '/57.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
createVideoPackage({ id: 'video58', label: 'Video 58', videoUrl: '/58.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'demo1', label: 'demo1', videoUrl: '/demo1.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),
  createVideoPackage({ id: 'demo2', label: 'demo2', videoUrl: '/demo2.mp4', category: 'lab', reducedMotionPreset: 'quietPulse' }),*/
].forEach(registerAnimationPackage)

export default registry
