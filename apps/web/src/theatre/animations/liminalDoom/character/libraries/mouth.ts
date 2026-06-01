export type MouthPresetDef = {
  id: string
  label: string
  widthMul: number
  heightMul: number
  yBias: number
}

export const MOUTH_PRESETS: Record<string, MouthPresetDef> = {
  'mouth.small':   { id: 'mouth.small',   label: 'Small',   widthMul: 0.85, heightMul: 0.9,  yBias: 0 },
  'mouth.average': { id: 'mouth.average', label: 'Average', widthMul: 1,    heightMul: 1,    yBias: 0 },
  'mouth.wide':    { id: 'mouth.wide',    label: 'Wide',    widthMul: 1.18, heightMul: 1.05, yBias: 0.02 },
  'mouth.thin':    { id: 'mouth.thin',    label: 'Thin',    widthMul: 1.05, heightMul: 0.75, yBias: 0.03 },
  'mouth.pursed':  { id: 'mouth.pursed',  label: 'Pursed',  widthMul: 0.78, heightMul: 0.65, yBias: 0.04 },
}

export const MOUTH_PRESET_IDS = Object.keys(MOUTH_PRESETS)
