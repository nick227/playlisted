import { palette } from './palette'
import { hash01 } from './types'
import type { BodyGender, BodyStyle } from './bodies'

export type { BodyGender, BodyStyle }

export type HairStyle = 'buzz' | 'crop' | 'bob' | 'long' | 'spiky' | 'mohawk' | 'bun'
export type ShoeStyle = 'sneaker' | 'boot' | 'heel' | 'loafer'

export type FashionSet = {
  skin: string
  skinShadow: string
  top: string
  topLight: string
  bottom: string
  bottomLight: string
  accent: string
  accentBright: string
  hair: string
  hairHi: string
  shoe: string
  shoeSole: string
  rim: string
  hairStyle: HairStyle
  shoeStyle: ShoeStyle
  hasJacket: boolean
  hasCollar: boolean
  hasBelt: boolean
}

const HAIR_STYLES: HairStyle[] = ['crop', 'bob', 'long', 'spiky', 'buzz', 'mohawk', 'bun']

export function resolveHairStyle(seed: number, gender: BodyGender): HairStyle {
  const i = Math.floor(hash01(seed, 41) * HAIR_STYLES.length)
  let style = HAIR_STYLES[i]
  if (gender === 'female' && hash01(seed, 42) > 0.55 && style === 'buzz') style = 'bob'
  if (gender === 'male' && style === 'bun' && hash01(seed, 43) > 0.4) style = 'crop'
  return style
}

export function resolveShoeStyle(style: BodyStyle, gender: BodyGender, seed: number): ShoeStyle {
  if (style === 'formal') return gender === 'female' ? 'heel' : 'loafer'
  if (style === 'punk' || style === 'street') return 'boot'
  if (hash01(seed, 44) > 0.7) return gender === 'female' ? 'heel' : 'sneaker'
  return 'sneaker'
}

export function resolveFashion(style: BodyStyle, gender: BodyGender, seed: number): FashionSet {
  const female = gender === 'female'
  const base = basePalette(style, female)
  return {
    ...base,
    hairStyle: resolveHairStyle(seed, gender),
    shoeStyle: resolveShoeStyle(style, gender, seed),
    hasJacket: style === 'street' || style === 'formal' || style === 'punk',
    hasCollar: style === 'classic' || style === 'formal',
    hasBelt: style !== 'neon' && hash01(seed, 45) > 0.35,
  }
}

function basePalette(style: BodyStyle, female: boolean): Omit<FashionSet, 'hairStyle' | 'shoeStyle' | 'hasJacket' | 'hasCollar' | 'hasBelt'> {
  switch (style) {
    case 'punk':
      return {
        skin: '#4a3438', skinShadow: '#2a2024',
        top: '#140c18', topLight: '#2a1830',
        bottom: '#1a0c14', bottomLight: '#2a1420',
        accent: '#c04088', accentBright: '#e060a8',
        hair: '#0c060c', hairHi: '#281018',
        shoe: '#120810', shoeSole: palette.figure,
        rim: '#6a4868',
      }
    case 'neon':
      return {
        skin: '#3a3448', skinShadow: '#222028',
        top: '#0a2838', topLight: '#1a4868',
        bottom: '#101828', bottomLight: '#1a3050',
        accent: '#40a8c8', accentBright: '#70d8f0',
        hair: '#080c20', hairHi: '#1a2848',
        shoe: '#0a1020', shoeSole: '#1a2840',
        rim: '#508898',
      }
    case 'classic':
      return {
        skin: female ? '#4a4044' : '#443c40', skinShadow: '#2a2428',
        top: '#2a2430', topLight: '#3a3440',
        bottom: '#1c1824', bottomLight: '#2a2834',
        accent: palette.amber, accentBright: palette.amberBright,
        hair: '#18141c', hairHi: '#2a2830',
        shoe: '#141018', shoeSole: '#0a080c',
        rim: '#7a6878',
      }
    case 'thrift':
      return {
        skin: '#4a4034', skinShadow: '#2e2820',
        top: '#5a4838', topLight: '#6a5848',
        bottom: '#3a3028', bottomLight: '#4a4038',
        accent: '#8a6848', accentBright: '#aa8860',
        hair: '#2a2018', hairHi: '#3a3028',
        shoe: '#241c14', shoeSole: '#1a140c',
        rim: '#6a5848',
      }
    case 'street':
      return {
        skin: '#3c3844', skinShadow: '#242028',
        top: '#38304a', topLight: '#484060',
        bottom: '#242030', bottomLight: '#343048',
        accent: palette.amberBright, accentBright: '#f0c868',
        hair: '#141018', hairHi: '#282030',
        shoe: '#1a1824', shoeSole: '#0c0a10',
        rim: '#6a6080',
      }
    case 'formal':
      return {
        skin: female ? '#463c42' : '#3c383c', skinShadow: '#262228',
        top: '#141020', topLight: '#242030',
        bottom: '#0c0a14', bottomLight: '#1a1824',
        accent: '#a090b8', accentBright: '#c8b8d8',
        hair: '#0a080c', hairHi: '#1a1820',
        shoe: '#08080c', shoeSole: '#141018',
        rim: '#9080a8',
      }
    default:
      return basePalette('classic', female)
  }
}
