import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readTheatreBreadcrumbs, theatreBreadcrumb } from '../controller/theatreBreadcrumbs'
import {
  getQuarantinedPresetIds,
  isPresetQuarantined,
  quarantinePreset,
} from '../controller/presetQuarantine'
import { assertTheatreDeckInvariants } from '../controller/theatreDeckInvariants'
import AnimationBridge from '../controller/AnimationBridge'
import type { AnimationContext, IAnimation } from '../core/IAnimation'

describe('theatre stability utilities', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => {
          storage.delete(key)
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stores theatre breadcrumbs in localStorage', () => {
    theatreBreadcrumb('manual:change:start', { presetId: 'rainstorm' })
    theatreBreadcrumb('manual:change:complete', { presetId: 'rainstorm' })

    const crumbs = readTheatreBreadcrumbs()
    expect(crumbs).toHaveLength(2)
    expect(crumbs[0].action).toBe('manual:change:start')
    expect(crumbs[0].presetId).toBe('rainstorm')
    expect(crumbs[1].action).toBe('manual:change:complete')
  })

  it('quarantines presets for the session in dev', () => {
    expect(isPresetQuarantined('bioMachineTunnel')).toBe(false)
    quarantinePreset('bioMachineTunnel')
    if (import.meta.env.DEV) {
      expect(isPresetQuarantined('bioMachineTunnel')).toBe(true)
      expect(getQuarantinedPresetIds()).toContain('bioMachineTunnel')
    }
  })

  it('can initialize a bridge without starting hidden preload instances', async () => {
    const animation: IAnimation = {
      init: vi.fn(async () => {}),
      start: vi.fn(async () => {}),
      pause: vi.fn(),
      resume: vi.fn(),
      stop: vi.fn(async () => {}),
      destroy: vi.fn(),
    }
    const bridge = new AnimationBridge()

    await bridge.enter(
      {} as HTMLElement,
      [() => animation],
      {} as AnimationContext,
      { presetId: 'video17' },
      { start: false },
    )

    expect(animation.init).toHaveBeenCalledOnce()
    expect(animation.start).not.toHaveBeenCalled()
  })

  it('allows idle preloaded next scene without transitioning', () => {
    const container = { children: [{}, {}] } as unknown as HTMLElement
    const activeBridge = { getInstances: () => [{}] } as unknown as AnimationBridge
    const nextBridge = { getInstances: () => [{}] } as unknown as AnimationBridge

    assertTheatreDeckInvariants(
      'preload-idle',
      container,
      activeBridge,
      nextBridge,
      'video48',
      'video28',
      false,
    )

    const crumbs = readTheatreBreadcrumbs()
    expect(crumbs.some(crumb => crumb.action === 'invariant:violation')).toBe(false)
  })

  it('records invariant violations without throwing', () => {
    const container = { children: [{}, {}, {}] } as unknown as HTMLElement

    assertTheatreDeckInvariants(
      'test',
      container,
      null,
      null,
      'broken',
      null,
      false,
    )

    const crumbs = readTheatreBreadcrumbs()
    expect(crumbs.some(crumb => crumb.action === 'invariant:violation')).toBe(true)
  })
})
