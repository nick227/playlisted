import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

import type { AnimationContext } from '../core/IAnimation'
import registry from '../registry'
import { getPreset } from '../registry/scenePresets'
import { sdkSmokePackage } from '../packages/sdk-smoke'
import '../registry/seed'

const theatreRoot = fileURLToPath(new URL('..', import.meta.url))
const packagesRoot = join(theatreRoot, 'packages')

/** SDK-compliant author packages — add new public author packages here. */
const AUTHOR_SDK_PACKAGE_DIRS = ['sdk-smoke']

const FORBIDDEN_IMPORT_PREFIXES = [
  '@/theatre/core',
  '@/theatre/registry',
  '@/theatre/runtime',
  '@/theatre/controller',
  '@/theatre/author/publicContext',
  '@/theatre/author/defineAnimationPackage',
]

const FORBIDDEN_RELATIVE_PREFIXES = [
  '../../core',
  '../../../core',
  '../../registry',
  '../../../registry',
  '../../runtime',
  '../../../runtime',
  '../../controller',
  '../../../controller',
  '../../author/publicContext',
  '../../author/defineAnimationPackage',
  '../../../author/publicContext',
  '../../../author/defineAnimationPackage',
]

function listTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listTsFiles(full))
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

function extractImportSources(source: string): string[] {
  const specs: string[] = []
  const fromRe = /\bfrom\s+['"]([^'"]+)['"]/g
  let match = fromRe.exec(source)
  while (match) {
    specs.push(match[1])
    match = fromRe.exec(source)
  }
  const sideEffectRe = /\bimport\s+['"]([^'"]+)['"]/g
  match = sideEffectRe.exec(source)
  while (match) {
    specs.push(match[1])
    match = sideEffectRe.exec(source)
  }
  return specs
}

function isForbiddenImport(spec: string): boolean {
  if (spec === '@/theatre/author' || spec === '../../author' || spec === '../../../author') {
    return false
  }
  for (const prefix of FORBIDDEN_IMPORT_PREFIXES) {
    if (spec === prefix || spec.startsWith(`${prefix}/`)) return true
  }
  for (const prefix of FORBIDDEN_RELATIVE_PREFIXES) {
    if (spec === prefix || spec.startsWith(`${prefix}/`)) return true
  }
  if (spec.startsWith('@/theatre/author/')) return true
  return false
}

describe('author SDK import boundary', () => {
  it('author SDK package files do not import private theatre paths', () => {
    const violations: string[] = []

    for (const packageDir of AUTHOR_SDK_PACKAGE_DIRS) {
      const root = join(packagesRoot, packageDir)
      for (const file of listTsFiles(root)) {
        const rel = relative(theatreRoot, file)
        for (const spec of extractImportSources(readFileSync(file, 'utf8'))) {
          if (isForbiddenImport(spec)) {
            violations.push(`${rel}: "${spec}"`)
          }
        }
      }
    }

    expect(violations).toEqual([])
  })
})

describe('sdk-smoke reference package', () => {
  it('matches the canonical defineAnimationPackage shape', () => {
    expect(sdkSmokePackage.manifest.id).toBe('sdk-smoke')
    expect(sdkSmokePackage.animations).toHaveLength(1)
    expect(sdkSmokePackage.animations[0].visualType).toBe('canvas')
    expect(sdkSmokePackage.presets).toHaveLength(1)
    expect(sdkSmokePackage.presets[0].layers[0].animationId).toBe('sdkSmoke')
  })

  it('registers through seed', () => {
    expect(registry.get('sdkSmoke')).not.toBeNull()
    expect(getPreset('sdkSmokeLab')?.layers[0]?.animationId).toBe('sdkSmoke')
  })

  it('renders one frame without private runtime imports', async () => {
    const entry = registry.get('sdkSmoke')
    expect(entry).not.toBeNull()

    const mockCtx = createMockCanvasContext()
    const { container, canvas } = createCanvasDom(mockCtx)
    const frameContext: AnimationContext = {
      options: { preset: 'tame', opacity: 1, zIndex: 101 },
      shared: {
        reducedMotion: false,
        lowPower: false,
        dprClamp: 2,
        particleScale: 1,
        time: { elapsed: 16, delta: 16, frame: 1 },
        getTriggers: () => ({
          bassHit: false,
          midsHit: false,
          highsHit: false,
          beat: false,
          chaosHit: false,
          energy: 0.2,
          brightness: 0.5,
        }),
      },
    }

    const animation = entry!.factory(frameContext)
    await animation.init(container, frameContext)
    animation.enableExternalDriving?.()
    await animation.start()

    animation.renderFrame(frameContext)

    expect(mockCtx.fillRect).toHaveBeenCalled()
    expect(canvas.width).toBeGreaterThan(0)

    await animation.stop()
    animation.destroy()
  })
})

function createMockCanvasContext() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
  }
}

function createCanvasDom(mockCtx: ReturnType<typeof createMockCanvasContext>) {
  let canvasParent: HTMLElement | null = null
  const canvas = {
    tagName: 'CANVAS',
    style: {} as CSSStyleDeclaration,
    width: 0,
    height: 0,
    get parentElement() {
      return canvasParent
    },
    getContext: vi.fn(() => mockCtx),
  } as unknown as HTMLCanvasElement

  const container = {
    tagName: 'DIV',
    style: {} as CSSStyleDeclaration,
    getBoundingClientRect: () => ({
      width: 320,
      height: 200,
      top: 0,
      left: 0,
      right: 320,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
    appendChild: vi.fn((child: Node) => {
      if (child === canvas) canvasParent = container as unknown as HTMLElement
      return child
    }),
    removeChild: vi.fn((child: Node) => child),
  } as unknown as HTMLElement

  vi.stubGlobal('document', {
    createElement: vi.fn((tag: string) => {
      if (tag === 'canvas') return canvas
      return { tagName: tag.toUpperCase(), style: {}, appendChild: vi.fn() }
    }),
  })
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: vi.fn(() => ({ matches: false })),
    screen: { width: 1920, height: 1080 },
  })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())

  return { container, canvas }
}
