export type FaceSkull = 'round' | 'angular' | 'long'
export type FaceRenderStyle = 'studio' | 'rubberHose' | 'sculpted'

/** Nine rubber-hose / Cuphead-style expressions (3×3 reference sheet). */
export type RubberExpression =
  | 'nervous'
  | 'grin'
  | 'flirty'
  | 'smirk'
  | 'squint'
  | 'worried'
  | 'goofy'
  | 'mustache'
  | 'shocked'

export const RUBBER_EXPRESSIONS: RubberExpression[] = [
  'nervous', 'grin', 'flirty', 'smirk', 'squint', 'worried', 'goofy', 'mustache', 'shocked',
]

export type FacePresetDef = {
  id: string
  label: string
  skull: FaceSkull
  distort: number
  cheekDepth: number
  browWeight: number
  renderStyle?: FaceRenderStyle
  rubberExpr?: RubberExpression
}

const STUDIO_FACES: Record<string, FacePresetDef> = {
  'face.round':   { id: 'face.round',   label: 'Round',   skull: 'round',   distort: 0.28, cheekDepth: 0.18, browWeight: 0.9 },
  'face.angular': { id: 'face.angular', label: 'Angular', skull: 'angular', distort: 0.38, cheekDepth: 0.22, browWeight: 1.15 },
  'face.long':    { id: 'face.long',    label: 'Long',    skull: 'long',    distort: 0.32, cheekDepth: 0.15, browWeight: 1 },
  'face.sunken':  { id: 'face.sunken',  label: 'Sunken',  skull: 'angular', distort: 0.45, cheekDepth: 0.28, browWeight: 1.2 },
  'face.soft':    { id: 'face.soft',    label: 'Soft',    skull: 'round',   distort: 0.22, cheekDepth: 0.12, browWeight: 0.75 },
  'face.wide':    { id: 'face.wide',    label: 'Wide',    skull: 'round',   distort: 0.34, cheekDepth: 0.2,  browWeight: 1.05 },
  'face.pinched': { id: 'face.pinched', label: 'Pinched', skull: 'long',    distort: 0.4,  cheekDepth: 0.25, browWeight: 1.25 },
}

const SCULPTED_FACES: Record<string, FacePresetDef> = {
  'face.sculpted':      { id: 'face.sculpted',      label: 'Sculpted',      skull: 'angular', distort: 0.12, cheekDepth: 0.1, browWeight: 1.1, renderStyle: 'sculpted' },
  'face.sculpted.soft': { id: 'face.sculpted.soft', label: 'Sculpted Soft', skull: 'round',   distort: 0.1,  cheekDepth: 0.08, browWeight: 0.95, renderStyle: 'sculpted' },
}

const RUBBER_FACES: Record<string, FacePresetDef> = {
  'face.rubber.nervous':  { id: 'face.rubber.nervous',  label: 'Rubber Nervous',  skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'nervous' },
  'face.rubber.grin':     { id: 'face.rubber.grin',     label: 'Rubber Grin',     skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'grin' },
  'face.rubber.flirty':   { id: 'face.rubber.flirty',   label: 'Rubber Flirty',   skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'flirty' },
  'face.rubber.smirk':    { id: 'face.rubber.smirk',    label: 'Rubber Smirk',    skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'smirk' },
  'face.rubber.squint':   { id: 'face.rubber.squint',   label: 'Rubber Squint',   skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'squint' },
  'face.rubber.worried':  { id: 'face.rubber.worried',  label: 'Rubber Worried',  skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'worried' },
  'face.rubber.goofy':    { id: 'face.rubber.goofy',    label: 'Rubber Goofy',    skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'goofy' },
  'face.rubber.mustache': { id: 'face.rubber.mustache', label: 'Rubber Stache',   skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'mustache' },
  'face.rubber.shocked':  { id: 'face.rubber.shocked',  label: 'Rubber Shocked',  skull: 'round', distort: 0.2, cheekDepth: 0, browWeight: 1, renderStyle: 'rubberHose', rubberExpr: 'shocked' },
}

export const FACE_PRESETS: Record<string, FacePresetDef> = {
  ...STUDIO_FACES,
  ...SCULPTED_FACES,
  ...RUBBER_FACES,
}

export const FACE_PRESET_IDS = Object.keys(FACE_PRESETS)
export const RUBBER_FACE_PRESET_IDS = Object.keys(RUBBER_FACES)
export const SCULPTED_FACE_PRESET_IDS = Object.keys(SCULPTED_FACES)

export function isRubberFace(face: FacePresetDef): boolean {
  return face.renderStyle === 'rubberHose' || face.id.startsWith('face.rubber.')
}

export function isSculptedFace(face: FacePresetDef): boolean {
  return face.renderStyle === 'sculpted' || face.id.startsWith('face.sculpted')
}

/** Only sculpted heads use the clump / scalp hair system. */
export function faceSupportsHair(face: FacePresetDef): boolean {
  return isSculptedFace(face)
}

export function rubberExprFromSeed(seed: number): RubberExpression {
  let v = (seed ^ 0x7f4a7c15) >>> 0
  v = Math.imul(v ^ (v >>> 16), 0x85ebca6b) >>> 0
  return RUBBER_EXPRESSIONS[v % RUBBER_EXPRESSIONS.length]
}
