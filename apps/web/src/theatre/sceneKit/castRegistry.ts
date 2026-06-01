import type { CastMemberDef } from './types'

const presets = new Map<string, readonly CastMemberDef[]>()

export function registerCastPreset(id: string, members: readonly CastMemberDef[]) {
  presets.set(id, members)
}

export function getCastPreset(id: string): readonly CastMemberDef[] | undefined {
  return presets.get(id)
}

export function resolveCastIds(ids: readonly string[]): CastMemberDef[] {
  const out: CastMemberDef[] = []
  for (const id of ids) {
    const members = presets.get(id)
    if (members) out.push(...members)
  }
  return out
}
