import { composeCast } from './cast'
import { resolveCastIds } from './castRegistry'
import type { CastMemberDef, SceneDrawSink, SceneFrame, StageRect } from './types'
import { getVenue } from './venueRegistry'

export type ComposedScene = {
  venueId: string
  cast: CastMemberDef[]
}

/** One entry point: venue geometry, then cast on top. */
export function composeVenueAndCast(
  sink: SceneDrawSink,
  stage: StageRect,
  frame: SceneFrame,
  venueId: string,
  extraCast: readonly CastMemberDef[] = [],
) {
  const venue = getVenue(venueId)
  venue?.compose(sink, stage, frame)

  const cast = [
    ...resolveCastIds(venue?.castPresetIds ?? []),
    ...extraCast,
  ]
  if (cast.length > 0) composeCast(sink, stage, frame, cast)
}
