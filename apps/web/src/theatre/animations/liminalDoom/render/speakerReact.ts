import type { SceneFrame } from '../../../sceneKit'
import type { PrimitiveOptions } from './primitives'
import { clamp } from '../core/math'

export function speakerLevel(frame: Pick<SceneFrame, 'bass' | 'mids' | 'highs' | 'beat'>): number {
  return clamp(
    frame.bass * 0.5 + frame.mids * 0.28 + frame.beat * 0.42 + frame.highs * 0.12,
    0,
    1,
  )
}

export function speakerOpts(frame: Pick<SceneFrame, 'mids' | 'highs' | 'beat' | 'time'>): PrimitiveOptions {
  return { mids: frame.mids, highs: frame.highs, beat: frame.beat, time: frame.time }
}
