import { describe, expect, it, vi } from 'vitest'

import { VideoAnimation } from '../core/VideoAnimation'
import {
  computeVideoBeatFxFrame,
  parseVideoBeatFx,
  tickVideoBeatFxPulse,
} from '../core/videoBeatFxUtils'
import { ImageAnimation } from '../core/ImageAnimation'
import { attachmentToScenePreset } from '../media/attachmentToScenePreset'
import type { VisualMediaAttachment } from '../media/types'
import { createFallbackAudioSnapshot } from '../audio/TheatreAudioBus'

describe('videoBeatFxUtils', () => {
  it('returns null when beatFx is missing or disabled', () => {
    expect(parseVideoBeatFx(undefined)).toBeNull()
    expect(parseVideoBeatFx({ enabled: false })).toBeNull()
  })

  it('parses enabled beatFx with default scale and brightness effects', () => {
    const config = parseVideoBeatFx({ enabled: true, intensity: 'subtle' })
    expect(config?.effects.has('scale')).toBe(true)
    expect(config?.effects.has('brightness')).toBe(true)
  })

  it('disables transform changes when reducedMotion is active', () => {
    const config = parseVideoBeatFx({
      enabled: true,
      intensity: 'strong',
      effects: ['scale', 'brightness', 'dropPunch'],
    })
    expect(config).not.toBeNull()

    const frame = computeVideoBeatFxFrame({
      beatFx: config!,
      reducedMotion: true,
      lowPower: false,
      energy: 0.9,
      beatPulse: 1,
      dropPulse: 1,
    })

    expect(frame).toEqual({ scale: 1, brightness: 1, contrast: 1 })
  })

  it('computes safe clamped scale and brightness when enabled', () => {
    const config = parseVideoBeatFx({
      enabled: true,
      intensity: 'normal',
      effects: ['scale', 'brightness', 'dropPunch'],
    })

    const pulse = tickVideoBeatFxPulse(
      { beatPulse: 0, dropPulse: 0 },
      { beatEdge: true, dropEdge: true, deltaMs: 16 },
    )

    const frame = computeVideoBeatFxFrame({
      beatFx: config!,
      reducedMotion: false,
      lowPower: false,
      energy: 0.8,
      beatPulse: pulse.beatPulse,
      dropPulse: pulse.dropPulse,
    })

    expect(frame.scale).toBeGreaterThan(1)
    expect(frame.scale).toBeLessThanOrEqual(1.08)
    expect(frame.brightness).toBeGreaterThan(1)
    expect(frame.brightness).toBeLessThanOrEqual(1.14)
    expect(frame.contrast).toBeLessThanOrEqual(1.08)
  })
})

describe('attachment beatFx wiring', () => {
  it('carries beatFx into video layer options', () => {
    const attachment: VisualMediaAttachment = {
      id: 'clip-beat',
      mediaType: 'video',
      url: '/uploads/user/clip-beat.mp4',
      beatFx: {
        enabled: true,
        intensity: 'subtle',
        effects: ['scale', 'brightness'],
      },
    }

    const preset = attachmentToScenePreset(attachment)
    expect(preset.layers[0]?.options?.beatFx).toEqual(attachment.beatFx)
    expect(preset.layers[0]?.options?.loop).toBe(true)
  })

  it('leaves image attachments without video beatFx requirements', () => {
    const preset = attachmentToScenePreset({
      id: 'still-a',
      mediaType: 'image',
      url: '/uploads/user/still-a.jpg',
      beatFx: { enabled: true, effects: ['scale'] },
    })

    expect(preset.layers[0]?.animationId).toBe('userImageMedia')
    expect(preset.layers[0]?.options?.beatFx?.enabled).toBe(true)
    expect(() => new ImageAnimation()).not.toThrow()
  })
})

describe('VideoAnimation beatFx integration', () => {
  it('does not apply renderFrame transforms when beatFx is disabled', async () => {
    const style: Record<string, string> = {}
    const videoEl = {
      style,
      muted: false,
      loop: false,
      playsInline: false,
      crossOrigin: '',
      decoding: '',
      preload: '',
      src: '/demo.mp4',
      currentTime: 0,
      addEventListener: () => {},
      play: async () => {},
      pause: () => {},
      load: () => {},
      removeAttribute: () => {},
    }

    vi.stubGlobal('document', {
      createElement: () => videoEl,
    })

    const animation = new VideoAnimation()
    animation.enableExternalDriving()
    await animation.init({ appendChild: () => {} } as unknown as HTMLElement, {
      options: { videoUrl: '/demo.mp4', preset: 'tame' },
    })
    await animation.start()

    animation.renderFrame({
      options: { videoUrl: '/demo.mp4', preset: 'tame' },
      shared: {
        reducedMotion: false,
        lowPower: false,
        time: { elapsed: 0, delta: 16, frame: 1 },
        audio: { ...createFallbackAudioSnapshot(), edges: { beat: true, drop: true, bassHit: false, midsHit: false, highsHit: false, chaosHit: false } },
        getTriggers: () => ({
          bassHit: false,
          midsHit: false,
          highsHit: false,
          beat: true,
          chaosHit: false,
          energy: 0.9,
          brightness: 1,
        }),
      },
    })

    expect(style.transform).toBeUndefined()
    expect(style.filter).toBeUndefined()
    animation.destroy()
  })

  it('applies clamped transforms when beatFx is enabled', async () => {
    const style: Record<string, string> = {}
    const videoEl = {
      style,
      muted: false,
      loop: false,
      playsInline: false,
      crossOrigin: '',
      decoding: '',
      preload: '',
      src: '/demo.mp4',
      currentTime: 0,
      addEventListener: () => {},
      play: async () => {},
      pause: () => {},
      load: () => {},
      removeAttribute: () => {},
    }

    vi.stubGlobal('document', {
      createElement: () => videoEl,
    })

    const animation = new VideoAnimation()
    animation.enableExternalDriving()
    await animation.init({ appendChild: () => {} } as unknown as HTMLElement, {
      options: {
        videoUrl: '/demo.mp4',
        preset: 'tame',
        beatFx: { enabled: true, intensity: 'subtle', effects: ['scale', 'brightness'] },
      },
    })
    await animation.start()

    animation.renderFrame({
      options: {
        videoUrl: '/demo.mp4',
        preset: 'tame',
        beatFx: { enabled: true, intensity: 'subtle', effects: ['scale', 'brightness'] },
      },
      shared: {
        reducedMotion: false,
        lowPower: false,
        time: { elapsed: 0, delta: 16, frame: 1 },
        audio: { ...createFallbackAudioSnapshot(), edges: { beat: true, drop: false, bassHit: false, midsHit: false, highsHit: false, chaosHit: false } },
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

    expect(style.transform).toMatch(/^scale\(1\.\d{4}\)$/)
    expect(style.filter).toContain('brightness(')
    animation.destroy()
  })
})
