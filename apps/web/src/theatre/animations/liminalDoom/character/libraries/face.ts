export type FaceSkull = 'round' | 'angular' | 'long'

export type FacePresetDef = {
  id: string
  label: string
  skull: FaceSkull
  /** Base wrongness before modifiers / audio. */
  distort: number
  cheekDepth: number
  /** Brow thickness / arch emphasis. */
  browWeight: number
}

export const FACE_PRESETS: Record<string, FacePresetDef> = {
  'face.round':   { id: 'face.round',   label: 'Round',   skull: 'round',   distort: 0.28, cheekDepth: 0.18, browWeight: 0.9 },
  'face.angular': { id: 'face.angular', label: 'Angular', skull: 'angular', distort: 0.38, cheekDepth: 0.22, browWeight: 1.15 },
  'face.long':    { id: 'face.long',    label: 'Long',    skull: 'long',    distort: 0.32, cheekDepth: 0.15, browWeight: 1 },
  'face.sunken':  { id: 'face.sunken',  label: 'Sunken',  skull: 'angular', distort: 0.45, cheekDepth: 0.28, browWeight: 1.2 },
  'face.soft':    { id: 'face.soft',    label: 'Soft',    skull: 'round',   distort: 0.22, cheekDepth: 0.12, browWeight: 0.75 },
  'face.wide':    { id: 'face.wide',    label: 'Wide',    skull: 'round',   distort: 0.34, cheekDepth: 0.2,  browWeight: 1.05 },
  'face.pinched': { id: 'face.pinched', label: 'Pinched', skull: 'long',    distort: 0.4,  cheekDepth: 0.25, browWeight: 1.25 },
}

export const FACE_PRESET_IDS = Object.keys(FACE_PRESETS)
