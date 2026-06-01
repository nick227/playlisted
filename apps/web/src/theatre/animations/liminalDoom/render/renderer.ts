import * as prim from './primitives'
import type { SmokeQuad } from './primitives'
import type { FigurePose } from '../core/types'

export const MAX_DRAW_ITEMS = 128
export const DEFAULT_FRAME_BUDGET = 128

export type DrawOp =
  | 'speaker'
  | 'drumKit'
  | 'figure'
  | 'guitarNeck'
  | 'barCounter'
  | 'bottle'
  | 'stool'
  | 'danceBody'
  | 'doorFrame'
  | 'smokeQuad'
  | 'posterShard'
  | 'phraseShard'
  | 'faceMask'
  | 'stageLight'
  | 'shellQuad'

type ShellPts = [number, number][]

export type DrawItem = {
  z: number
  op: DrawOp
  x: number
  y: number
  w: number
  h: number
  level: number
  angle: number
  pose: number
  phrase: string
  shellPts: ShellPts | null
  opt: prim.PrimitiveOptions
}

function emptyItem(): DrawItem {
  return {
    z: 0, op: 'speaker', x: 0, y: 0, w: 0, h: 0, level: 0, angle: 0, pose: 0,
    phrase: '', shellPts: null, opt: {},
  }
}

export class LiminalRenderer {
  private items: DrawItem[] = []
  private count = 0

  clear() {
    this.count = 0
  }

  get length() {
    return this.count
  }

  private slot(): DrawItem {
    if (this.count >= MAX_DRAW_ITEMS) return this.items[MAX_DRAW_ITEMS - 1]
    if (!this.items[this.count]) this.items[this.count] = emptyItem()
    const s = this.items[this.count]
    this.count++
    return s
  }

  pushSpeaker(z: number, x: number, y: number, w: number, h: number, bass: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'speaker'; s.x = x; s.y = y; s.w = w; s.h = h; s.level = bass; s.opt = opt
  }

  pushDrumKit(z: number, x: number, y: number, scale: number, beat: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'drumKit'; s.x = x; s.y = y; s.w = scale; s.level = beat; s.opt = opt
  }

  pushFigure(z: number, x: number, y: number, scale: number, pose: FigurePose, energy: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'figure'; s.x = x; s.y = y; s.w = scale; s.pose = poseToIndex(pose); s.level = energy; s.opt = opt
  }

  pushGuitarNeck(z: number, x: number, y: number, len: number, angle: number, energy: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'guitarNeck'; s.x = x; s.y = y; s.w = len; s.angle = angle; s.level = energy; s.opt = opt
  }

  pushBarCounter(z: number, x: number, y: number, w: number, h: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'barCounter'; s.x = x; s.y = y; s.w = w; s.h = h; s.opt = opt
  }

  pushBottle(z: number, x: number, y: number, scale: number, highs: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'bottle'; s.x = x; s.y = y; s.w = scale; s.level = highs; s.opt = opt
  }

  pushStool(z: number, x: number, y: number, scale: number, tap: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'stool'; s.x = x; s.y = y; s.w = scale; s.level = tap; s.opt = opt
  }

  pushDanceBody(z: number, x: number, y: number, scale: number, variant: number, strobe: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'danceBody'; s.x = x; s.y = y; s.w = scale; s.pose = variant; s.level = strobe; s.opt = opt
  }

  pushDoorFrame(z: number, x: number, y: number, w: number, h: number, bend: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'doorFrame'; s.x = x; s.y = y; s.w = w; s.h = h; s.level = bend; s.opt = opt
  }

  pushSmokeQuad(z: number, quad: SmokeQuad, alpha: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'smokeQuad'; s.x = quad.x; s.y = quad.y; s.w = quad.w; s.h = quad.h; s.level = alpha; s.opt = opt
  }

  pushPosterShard(z: number, x: number, y: number, w: number, h: number, peel: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'posterShard'; s.x = x; s.y = y; s.w = w; s.h = h; s.level = peel; s.opt = opt
  }

  pushPhraseShard(z: number, phrase: string, x: number, y: number, w: number, reveal: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'phraseShard'; s.phrase = phrase; s.x = x; s.y = y; s.w = w; s.level = reveal; s.opt = opt
  }

  pushFaceMask(z: number, x: number, y: number, scale: number, talk: number, trackX: number, trackY: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'faceMask'; s.x = x; s.y = y; s.w = scale; s.level = talk; s.angle = trackX; s.h = trackY; s.opt = opt
  }

  pushStageLight(z: number, x: number, y: number, radius: number, pulse: number, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'stageLight'; s.x = x; s.y = y; s.w = radius; s.level = pulse; s.opt = opt
  }

  pushShellQuad(z: number, points: ShellPts, fill: string, opt: prim.PrimitiveOptions = {}) {
    const s = this.slot()
    s.z = z; s.op = 'shellQuad'; s.shellPts = points; s.phrase = fill; s.opt = opt
  }

  /** Painter sort: far (low z) first. In-place insertion sort — no allocations. */
  sortDrawList() {
    const n = this.count
    const a = this.items
    for (let i = 1; i < n; i++) {
      const key = a[i]
      let j = i - 1
      while (j >= 0 && a[j].z > key.z) {
        a[j + 1] = a[j]
        j--
      }
      a[j + 1] = key
    }
  }

  render(ctx: CanvasRenderingContext2D, budget = DEFAULT_FRAME_BUDGET) {
    const limit = Math.min(this.count, budget)
    for (let i = 0; i < limit; i++) executeItem(ctx, this.items[i])
  }
}

const POSE_TABLE: FigurePose[] = ['stand', 'lean', 'drum', 'guitar', 'bartender', 'watch']

function poseToIndex(pose: FigurePose): number {
  const i = POSE_TABLE.indexOf(pose)
  return i >= 0 ? i : 0
}

function indexToPose(i: number): FigurePose {
  return POSE_TABLE[i] ?? 'stand'
}

function executeItem(ctx: CanvasRenderingContext2D, item: DrawItem) {
  switch (item.op) {
    case 'speaker':
      prim.drawSpeaker(ctx, item.x, item.y, item.w, item.h, item.level, item.opt)
      break
    case 'drumKit':
      prim.drawDrumKit(ctx, item.x, item.y, item.w, item.level, item.opt)
      break
    case 'figure':
      prim.drawFigure(ctx, item.x, item.y, item.w, indexToPose(item.pose), item.level, item.opt)
      break
    case 'guitarNeck':
      prim.drawGuitarNeck(ctx, item.x, item.y, item.w, item.angle, item.level, item.opt)
      break
    case 'barCounter':
      prim.drawBarCounter(ctx, item.x, item.y, item.w, item.h, item.opt)
      break
    case 'bottle':
      prim.drawBottle(ctx, item.x, item.y, item.w, item.level, item.opt)
      break
    case 'stool':
      prim.drawStool(ctx, item.x, item.y, item.w, item.level, item.opt)
      break
    case 'danceBody':
      prim.drawDanceBody(ctx, item.x, item.y, item.w, item.pose, item.level, item.opt)
      break
    case 'doorFrame':
      prim.drawDoorFrame(ctx, item.x, item.y, item.w, item.h, item.level, item.opt)
      break
    case 'smokeQuad':
      prim.drawSmokeQuad(ctx, { x: item.x, y: item.y, w: item.w, h: item.h }, item.level, item.opt)
      break
    case 'posterShard':
      prim.drawPosterShard(ctx, item.x, item.y, item.w, item.h, item.level, item.opt)
      break
    case 'phraseShard':
      prim.drawPhraseShard(ctx, item.phrase, item.x, item.y, item.w, item.level, item.opt)
      break
    case 'faceMask':
      prim.drawFaceMask(ctx, item.x, item.y, item.w, item.level, item.angle, item.h, item.opt)
      break
    case 'stageLight':
      prim.drawStageLight(ctx, item.x, item.y, item.w, item.level, item.opt)
      break
    case 'shellQuad':
      if (item.shellPts) prim.drawShellQuad(ctx, item.shellPts, item.phrase, item.opt)
      break
  }
}

export const sharedRenderer = new LiminalRenderer()
