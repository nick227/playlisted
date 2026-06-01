export type FaceSkull = 'round' | 'angular' | 'long'

export type FacePresetDef = {
  id: string
  label: string
  skull: FaceSkull
  /** Base wrongness before modifiers / audio. */
  distort: number
  cheekDepth: number
  scanLines: number
}

export const FACE_PRESETS: Record<string, FacePresetDef> = {
  'face.round':   { id: 'face.round',   label: 'Round',   skull: 'round',   distort: 0.28, cheekDepth: 0.18, scanLines: 3 },
  'face.angular': { id: 'face.angular', label: 'Angular', skull: 'angular', distort: 0.38, cheekDepth: 0.22, scanLines: 4 },
  'face.long':    { id: 'face.long',    label: 'Long',    skull: 'long',    distort: 0.32, cheekDepth: 0.15, scanLines: 4 },
  'face.sunken':  { id: 'face.sunken',  label: 'Sunken',  skull: 'angular', distort: 0.45, cheekDepth: 0.28, scanLines: 5 },
  'face.soft':    { id: 'face.soft',    label: 'Soft',    skull: 'round',   distort: 0.22, cheekDepth: 0.12, scanLines: 3 },
}

export const FACE_PRESET_IDS = Object.keys(FACE_PRESETS)
