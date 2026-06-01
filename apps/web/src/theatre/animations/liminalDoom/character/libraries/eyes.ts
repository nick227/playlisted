export type EyesPresetDef = {
  id: string
  label: string
  spreadMul: number
  sizeMul: number
  lidTilt: number
  pupilMul: number
}

export const EYES_PRESETS: Record<string, EyesPresetDef> = {
  'eyes.narrow':  { id: 'eyes.narrow',  label: 'Narrow',  spreadMul: 0.9,  sizeMul: 0.88, lidTilt: 0.12, pupilMul: 0.9 },
  'eyes.average': { id: 'eyes.average', label: 'Average', spreadMul: 1,    sizeMul: 1,    lidTilt: 0,    pupilMul: 1 },
  'eyes.wide':    { id: 'eyes.wide',    label: 'Wide',    spreadMul: 1.12, sizeMul: 1.08, lidTilt: -0.08, pupilMul: 1.05 },
  'eyes.heavy':   { id: 'eyes.heavy',   label: 'Heavy',   spreadMul: 0.95, sizeMul: 0.92, lidTilt: 0.2,  pupilMul: 0.85 },
  'eyes.lazy':    { id: 'eyes.lazy',    label: 'Lazy',    spreadMul: 1.05, sizeMul: 1,    lidTilt: 0.25, pupilMul: 1.1 },
}

export const EYES_PRESET_IDS = Object.keys(EYES_PRESETS)
