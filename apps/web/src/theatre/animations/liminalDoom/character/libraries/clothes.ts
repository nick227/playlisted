import type { BodyStyle } from '../../bodies'

export type ClothesPresetDef = {
  id: string
  label: string
  style: BodyStyle
  hasJacket?: boolean
  hasCollar?: boolean
  hasBelt?: boolean
}

export const CLOTHES_PRESETS: Record<string, ClothesPresetDef> = {
  'clothes.punk':    { id: 'clothes.punk',    label: 'Punk',    style: 'punk' },
  'clothes.neon':    { id: 'clothes.neon',    label: 'Neon',    style: 'neon' },
  'clothes.classic': { id: 'clothes.classic', label: 'Classic', style: 'classic', hasCollar: true },
  'clothes.thrift':  { id: 'clothes.thrift',  label: 'Thrift',  style: 'thrift' },
  'clothes.street':  { id: 'clothes.street',  label: 'Street',  style: 'street', hasJacket: true },
  'clothes.formal':  { id: 'clothes.formal',  label: 'Formal',  style: 'formal', hasJacket: true, hasCollar: true, hasBelt: true },
}

export const CLOTHES_PRESET_IDS = Object.keys(CLOTHES_PRESETS)
