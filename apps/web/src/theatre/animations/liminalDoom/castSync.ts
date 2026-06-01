import { getVenue, resolveCastIds } from '../../sceneKit'
import type { CastMemberDef } from '../../sceneKit'
import type { SceneType } from './types'

export function collectSceneCast(
  sceneType: SceneType,
  extraCast: readonly CastMemberDef[],
): CastMemberDef[] {
  const venue = getVenue(sceneType)
  return [...resolveCastIds(venue?.castPresetIds ?? []), ...extraCast]
}

export function castSignature(members: readonly CastMemberDef[]): string {
  return members.map((m) => m.id).join('|')
}
