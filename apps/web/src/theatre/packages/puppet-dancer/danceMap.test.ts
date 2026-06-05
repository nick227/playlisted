import { describe, expect, it } from 'vitest'

import { danceSequences, dynamicRandomSequenceId, getDanceSequence, isDynamicDance, pickAutoDanceSequenceId } from './sequences'

describe('puppet dancer DanceMap v1', () => {
  it('keeps every dance on schemaVersion 1 with string pose references', () => {
    for (const dance of Object.values(danceSequences)) {
      expect(dance.schemaVersion).toBe(1)
      expect(Object.keys(dance.poses).length).toBeGreaterThan(0)
      expect(dance.steps.length).toBeGreaterThan(0)
      for (const step of dance.steps) {
        expect(typeof step.pose).toBe('string')
        expect(dance.poses[step.pose], `${dance.id} step references missing pose ${step.pose}`).toBeDefined()
      }
    }
  })

  it('registers chicken walk as a map-only authoring example', () => {
    const dance = getDanceSequence('chickenWalk')
    expect(dance.id).toBe('chicken-walk')
    expect(dance.steps.map(step => step.pose)).toContain('chickenLeft')
  })

  it('generates a fresh dynamic random map whenever the random dance is activated', () => {
    const first = getDanceSequence(dynamicRandomSequenceId)
    const second = getDanceSequence(dynamicRandomSequenceId)
    expect(first.id).not.toBe(second.id)
    expect(Object.keys(first.poses)).not.toEqual(Object.keys(second.poses))
    for (const step of second.steps) {
      expect(second.poses[step.pose], `dynamic random step references missing pose ${step.pose}`).toBeDefined()
    }
  })

  it('lets auto switching slot static sequence ids around the dynamic mainline', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 80; i += 1) {
      const id = pickAutoDanceSequenceId({
        energy: 0.22,
        bass: 0.5,
        highs: 0.18,
        centroid: 0.3,
        flux: 0.2,
        bassFlux: 0.18,
        highsFlux: 0.12,
      })
      expect(danceSequences[id]).toBeDefined()
      seen.add(id)
    }
    expect(seen.has(dynamicRandomSequenceId)).toBe(true)
    expect(Array.from(seen).some(id => !isDynamicDance(id))).toBe(true)
  })

  it('uses reduced-motion fallback maps when declared', () => {
    expect(getDanceSequence('noodleArms', true).id).toBe('two-step')
  })
})
