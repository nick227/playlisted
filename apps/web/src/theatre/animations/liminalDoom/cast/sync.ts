import { getVenue, resolveCastIds } from '../../../sceneKit'
import type { CastMemberDef } from '../../../sceneKit'
import type { SceneType } from '../core/types'

export function collectSceneCast(
  sceneType: SceneType,
  extraCast: readonly CastMemberDef[],
): CastMemberDef[] {
  const venue = getVenue(sceneType)
  return [...resolveCastIds(venue?.castPresetIds ?? []), ...extraCast]
}

export function castSignature(members: readonly CastMemberDef[]): string {
  let sig = ''
  for (let i = 0; i < members.length; i++) {
    if (i > 0) sig += '|'
    sig += members[i].id
  }
  return sig
}
