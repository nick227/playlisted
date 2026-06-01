import type { HairStyle } from '../../fashion'

export type HairPresetDef = {
  id: string
  label: string
  hairStyle: HairStyle
}

export const HAIR_PRESETS: Record<string, HairPresetDef> = {
  'hair.buzz':    { id: 'hair.buzz',    label: 'Buzz',    hairStyle: 'buzz' },
  'hair.crop':    { id: 'hair.crop',    label: 'Crop',    hairStyle: 'crop' },
  'hair.bob':     { id: 'hair.bob',     label: 'Bob',     hairStyle: 'bob' },
  'hair.long':    { id: 'hair.long',    label: 'Long',    hairStyle: 'long' },
  'hair.spiky':   { id: 'hair.spiky',   label: 'Spiky',   hairStyle: 'spiky' },
  'hair.mohawk':  { id: 'hair.mohawk',  label: 'Mohawk',  hairStyle: 'mohawk' },
  'hair.bun':     { id: 'hair.bun',     label: 'Bun',     hairStyle: 'bun' },
}

export const HAIR_PRESET_IDS = Object.keys(HAIR_PRESETS)
