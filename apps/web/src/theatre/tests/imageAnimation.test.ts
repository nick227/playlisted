import { describe, expect, it, vi } from 'vitest'

import { ImageAnimation } from '../core/ImageAnimation'
import {
  computeImageFrameTransform,
  resolveImageUrl,
} from '../core/imageAnimationUtils'
import type { AnimationContext } from '../core/IAnimation'
import registry from '../registry'
import { getPreset } from '../registry/scenePresets'
import { albumArtPackage } from '../packages/album-art'
import '../registry/seed'

describe('imageAnimationUtils', () => {
  it('prefers preset imageUrl over artworkUrl', () => {
    const ctx: AnimationContext = {
      artworkUrl: 'https://cdn.example/artwork.jpg',
      options: { imageUrl: 'https://cdn.example/preset.jpg' },
    }
    expect(resolveImageUrl(ctx)).toBe('https://cdn.example/preset.jpg')
  })

  it('falls back to artworkUrl when imageUrl is missing', () => {
    const ctx: AnimationContext = {
      artworkUrl: 'https://cdn.example/artwork.jpg',
      options: {},
    }
    expect(resolveImageUrl(ctx)).toBe('https://cdn.example/artwork.jpg')
  })

  it('returns null when no image sources exist', () => {
    expect(resolveImageUrl({ options: {} })).toBeNull()
  })

  it('disables Ken Burns motion when reducedMotion is active', () => {
    const transform = computeImageFrameTransform({
      elapsedMs: 120_000,
      reducedMotion: true,
      lowPower: false,
      energy: 0.9,
      beatEdge: true,
    })
    expect(transform).toEqual({
      scale: 1,
      translateXPercent: 0,
      translateYPercent: 0,
      brightness: 1,
    })
  })
})

describe('albumArtStill preset', () => {
  it('pins rotation per track via preset metadata', () => {
    const preset = albumArtPresetsFromPackage()
    expect(preset.rotation?.mode).toBe('perTrack')
  })

  it('registers visualType image in the animation registry', () => {
    const entry = registry.get('albumArtImage')
    expect(entry?.visualType).toBe('image')
  })

  it('is available after seed registration', () => {
    expect(getPreset('albumArtStill')?.rotation?.mode).toBe('perTrack')
  })
})

describe('ImageAnimation init', () => {
  it('does not throw when artwork is missing', async () => {
    const container = createDomContainer()
    const animation = new ImageAnimation()
    await expect(
      animation.init(container, { options: { preset: 'tame' } }),
    ).resolves.toBeUndefined()
    animation.destroy()
  })

  it('does not throw when image load fails', async () => {
    const container = createDomContainer()
    const animation = new ImageAnimation()
    await animation.init(container, {
      options: { imageUrl: 'https://invalid.example/missing.jpg', preset: 'tame' },
    })
    animation.enableExternalDriving()
    await animation.start()
    animation.renderFrame({
      options: { imageUrl: 'https://invalid.example/missing.jpg', preset: 'tame' },
      shared: {
        reducedMotion: false,
        lowPower: false,
        time: { elapsed: 0, delta: 16, frame: 0 },
        getTriggers: () => ({
          bassHit: false,
          midsHit: false,
          highsHit: false,
          beat: false,
          chaosHit: false,
          energy: 0,
          brightness: 1,
        }),
      },
    })
    const img = container.querySelector('img')
    img?.onerror?.(new Event('error') as Event)
    expect(() => animation.destroy()).not.toThrow()
  })

  it('applies beatFx transforms when pulse is enabled', async () => {
    const container = createDomContainer()
    const animation = new ImageAnimation()
    await animation.init(container, {
      options: {
        imageUrl: 'https://cdn.example/photo.jpg',
        preset: 'tame',
        beatFx: { enabled: true, intensity: 'subtle', effects: ['scale', 'brightness'] },
      },
    })
    animation.enableExternalDriving()
    await animation.start()

    const img = container.querySelector('img') as HTMLElement & { style: Record<string, string> }
    img.onload?.()

    animation.renderFrame({
      options: {
        imageUrl: 'https://cdn.example/photo.jpg',
        preset: 'tame',
        beatFx: { enabled: true, intensity: 'subtle', effects: ['scale', 'brightness'] },
      },
      shared: {
        reducedMotion: false,
        lowPower: false,
        time: { elapsed: 0, delta: 16, frame: 1 },
        audio: {
          edges: { beat: true, drop: false, bassHit: false, midsHit: false, highsHit: false, chaosHit: false },
        },
        getTriggers: () => ({
          bassHit: false,
          midsHit: false,
          highsHit: false,
          beat: true,
          chaosHit: false,
          energy: 0.6,
          brightness: 1,
        }),
      },
    })

    expect(img.style.transform).toMatch(/^scale\(1\.\d{4}\)$/)
    expect(img.style.filter).toContain('brightness(')
    animation.destroy()
  })
})

function albumArtPresetsFromPackage() {
  return albumArtPackage.presets[0]
}

function createDomContainer() {
  const elements: HTMLElement[] = []
  const createElement = vi.fn((tag: string) => {
    const style: Record<string, string> = {}
    const children: Node[] = []
    const el = {
      tagName: tag.toUpperCase(),
      style,
      children,
      appendChild(child: Node) {
        children.push(child)
        return child
      },
      removeChild(child: Node) {
        const index = children.indexOf(child)
        if (index >= 0) children.splice(index, 1)
        return child
      },
      parentElement: null as HTMLElement | null,
      onload: null as (() => void) | null,
      onerror: null as ((event: Event) => void) | null,
      src: '',
      crossOrigin: '',
      decoding: '',
      alt: '',
      setAttribute() {},
      removeAttribute() {},
      querySelector(selector: string) {
        if (selector === 'img') {
          for (const child of elements) {
            if (child.tagName === 'IMG') return child
          }
        }
        return null
      },
    } as unknown as HTMLElement
    elements.push(el)
    return el
  })

  vi.stubGlobal('document', { createElement })
  const container = createElement('div') as HTMLElement
  return container
}
