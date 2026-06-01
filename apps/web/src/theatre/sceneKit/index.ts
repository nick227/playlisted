export type {
  CastMemberDef,
  CastActivity,
  CastFaceLayer,
  CastPlacement,
  CastRole,
  CharacterRecipe,
  CharacterRecipeModifiers,
  BodyGender,
  BodyStyle,
  FaceMode,
  SceneDrawSink,
  SceneFrame,
  StageRect,
  VenueComposer,
  VenueSceneDef,
} from './types'
export { stageRect } from './types'
export { composeCast, placementToXY } from './cast'
export { composeVenueAndCast } from './compose'
export { registerCastPreset, getCastPreset, resolveCastIds } from './castRegistry'
export { registerVenue, getVenue, listVenues } from './venueRegistry'
export { pickPhrase, phraseReveal, registerPhraseBank, VENUE_PHRASES } from './phrases'
