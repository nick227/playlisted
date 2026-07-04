import { IAnimation } from '../core/IAnimation'
import type { PublicAnimationContext } from '../author/types'
import CanvasAnimation from '../core/CanvasAnimation'

const CHEECH_PALETTE = [
  '#000000', // 1 Outline
  '#FCD1A2', // 2 Skin
  '#FF0000', // 3 Red Beanie Base
  '#FFD700', // 4 Yellow Tank Base
  '#D2B48C', // 5 Khaki Pants
  '#8B4513', // 6 Suspenders
  '#808080', // 7 Switch Box Base
  '#E6A87C', // 8 Skin Shadow
  '#FF9999', // 9 Pink lips
  '#FFE4C4', // a Skin Highlight
  '#8B0000', // b Red Beanie Shadow
  '#FF6347', // c Red Beanie Highlight
  '#B8860B', // d Yellow Tank Shadow
  '#FFFFE0', // e Yellow Tank Highlight
  '#A0522D', // f Khaki Pants Shadow
  '#D3D3D3', // g Switch Box Highlight
  '#696969', // h Switch Box Shadow
  '#FFD700', // i Gold Chain
  '#B8860B', // j Gold Chain Shadow
]

const CHEECH_HEAD_STR = [
  "            111111111111            ",
  "          1133333333333311          ",
  "         133333333333333331         ",
  "        13333333333333333331        ",
  "       1333333333333333333331       ",
  "       1111111111111111111111       ",
  "      166666666666666666666661      ",
  "      166666666666666666666661      ",
  "     12222222222222222222222221     ",
  "     12222222222222222222222221     ",
  "    1222288822222222222888222221    ",
  "    1222222222222222222222222221    ",
  "    1222666662222222266666222221    ",
  "    1226666666222222666666622221    ",
  "    122       222222       22221    ",
  "    122       222222       22221    ",
  "    122       222222       22221    ",
  "    1228822222221112222222882221    ",
  "    1288882222112221122228888221    ",
  "    1288882222122222122228888221    ",
  "     12288222221111122222288221     ",
  "     12222222222222222222222221     ",
  "     12222666666666666662222221     ",
  "      122666666666666666622221      ",
  "      122666111111111166622221      ",
  "      122221777777777712222221      ",
  "       1222199999999991222221       ",
  "       1222211111111112222221       ",
  "        12222228888222222221        ",
  "         122222222222222221         ",
  "         112222222222222211         ",
  "       1114111111111111114111       "
]

const CHEECH_BODY_STR = [
  "     11444441222222222214444411     ",
  "    1444444441222222221444444441    ",
  "   144444444441222222144444444441   ",
  "  14444444444441111114444444444441  ",
  "  14444444444444444444444444444441  ",
  " 1444444444444444444444444444444441 ",
  " 1444444444444444444444444444444441 ",
  "144444444444444444444444444444444441",
  "144444444444444444444444444444444441",
  "144444444444444444444444444444444441",
  "144444444444444444444444444444444441",
  "144444444444444444444444444444444441",
  "114444444444444444444444444444444411",
  " 1144444444444444444444444444444411 ",
  "  11144444444444444444444444444111  ",
  "    1111111111111111111111111111    ",
  "   155555555555555555555555555551   ",
  "   155555555555555555555555555551   ",
  "   155555555555511115555555555551   ",
  "  15555555555551    15555555555551  ",
  "  1555555555551      1555555555551  ",
  "  155555555551        155555555551  ",
  "  15555555551          15555555551  ",
  " 155555555551          155555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 15555555551            15555555551 ",
  " 11111111111            11111111111 ",
  " 12222222221            12222222221 ",
  " 12222222221            12222222221 ",
  "1777777777771          1777777777771",
  "1777777777771          1777777777771",
  "1777777777771          1777777777771",
  "1111111111111          1111111111111",
  "                                    "
]

const CHEECH_ARM_STR = [
  "      1111      ",
  "    11222211    ",
  "   1222222221   ",
  "   1222222221   ",
  "   1222222221   ",
  "   1222222221   ",
  "   1222222221   ",
  "   1222222221   ",
  "   1222222221   ",
  "   1222222221   ",
  "    11222211    ",
  "    12222221    ",
  "    12222221    ",
  "    12222221    ",
  "    12222221    ",
  "    12222221    ",
  "    12222221    ",
  "    12222221    ",
  "    12222221    ",
  "    11111111    ", 
  "   1222222221   ",
  "   1222222221   ",
  "   1111111111   ",
  "  177777777771  ",
  "  177777777771  ",
  "  177117711771  ",
  "  177117711771  ",
  "  177777777771  ",
  "  177777777771  ",
  "   1111111111   ",
  "                ",
  "                "
]

const CHONG_PALETTE = [
  '#000000', // 1 Outline
  '#FCD1A2', // 2 Skin Base
  '#FF0000', // 3 Red Bandana Base
  '#4682B4', // 4 Denim Blue Base
  '#4A3018', // 5 Hair Base
  '#FFFFFF', // 6 Glasses Glare
  '#808080', // 7 Glasses Frame
  '#E6A87C', // 8 Skin Shadow
  '#FF9999', // 9 Pink lips
  '#8A2BE2', // a Tie-dye purple
  '#32CD32', // b Tie-dye green
  '#FFD700', // c Tie-dye yellow
  '#8B0000', // d Red Bandana Shadow
  '#191970', // e Denim Shadow
  '#271508', // f Hair Shadow
  '#FFE4C4', // g Skin Highlight
]

const CHONG_HEAD_STR = [
  "           11111111111111           ",
  "         113333333333333311         ",
  "       1133d3d3d3d3d3d3d3d311       ",
  "      1333d333333333333333d331      ",
  "     1333d33333333333333333d331     ",
  "    1111111111111111111111111111    ",
  "    1555555555555555555555555551    ",
  "   1f55111111111111111111111155f1   ",
  "   1f5188g2g22222222222g2g28815f1   ",
  "  1f5188g2g2222222222222g2g2881f51  ",
  "  1f5182g22222222222222222g2281f51  ",
  "  1f5182g22222222222222222g2281f51  ",
  "  1f5182g7777772222227777772281f51  ",
  " 1f551827      722227      72815f51 ",
  " 1f551827      722227      72815f51 ",
  " 1f551827      777777      72815f51 ",
  " 1f551827      722227      72815f51 ",
  " 1f55182277777722222277777722815f51 ",
  " 1f55182222222221112222222222815f51 ",
  " 1f55182222222112221122222222815f51 ",
  " 1f55182222222122222122222222815f51 ",
  " 1f55182222222211111222222222815f51 ",
  "  1f5155f822222222222222222f551f51  ",
  "  1f51f555f5f5f5f5f5f5f5f5f55f1f51  ",
  "  1f51f555f5111111111111f555f51f51  ",
  "  1f51f555f16666666666661555f51f51  ",
  "   1f51f55f1999999999999155f51f51   ",
  "   1f51f5555111111111111f55551f51   ",
  "   1f551f555555555555555555515f51   ",
  "    1f551f5f5f5f5f5f5f5f5f515f51    ",
  "    1f5551f55555555555555515f551    ",
  "     1f55511111111111111115f551     "
]

const CHONG_BODY_STR = [
  "     15f1cab4cbbaa4cbbaac41f51      ",
  "    1c4aaabb4cbbbaa4cbbbaac441      ",
  "   1c44aaabb4cbbbaa4cbbbaac4441     ",
  "  1c444aaabb4cbbbaa4cbbbaac44441    ",
  " 1b4444aaabb4cbbbaa4cbbbaac444441   ",
  "1b44444aaabb4cbbbaa4cbbbaac4444441  ",
  "1b44444aaabb4cbbbaa4cbbbaac4444441  ",
  "1b44444aaabb4cbbbaa4cbbbaac4444441  ",
  "1a44444bbaa4cbbbaa4cbbbaaac4444441  ",
  "1a44444bbaa4cbbbaa4cbbbaaac4444441  ",
  "1a44444bbaa4cbbbaa4cbbbaaac4444441  ",
  "1a444444bbaa4cbbbaa4cbbbaac4444441  ",
  " 1a44444bbaa4cbbbaa4cbbbaac444441   ",
  "  1a4444bbaa4cbbbaa4cbbbaac44441    ",
  "   1111111111111111111111111111     ",
  "   1444444444444444e4e4e4e4e4e1     ",
  "   1444444444444444e4e4e4e4e4e1     ",
  "   14444444444441111444e4e4e4e1     ",
  "  14444444444441    1444e4e4e4e1    ",
  "  1444444444441      1444e4e4e4e1   ",
  "  144444444441        1444e4e4e41   ",
  "  14444444441          1444e4e4e1   ",
  " 144444444441          14444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 14444444441            1444e4e4e1  ",
  " 11111111111            11111111111 ",
  " 182a2228881            182a2228881 ",
  " 182a2228881            182a2228881 ",
  "1555555555551          1555555555551",
  "1f5f5f5f5f5f1          1f5f5f5f5f5f1",
  "1f5f5f5f5f5f1          1f5f5f5f5f5f1",
  "1111111111111          1111111111111",
  "                                    ",
  "                                    "
]

const CHONG_ARM_STR = [
  "      1111      ",
  "    11bbaa11    ",
  "   1aabbbbaa1   ",
  "   1aabbbbaa1   ",
  "   1aabbbbaa1   ",
  "   1aabbbbaa1   ",
  "    11111111    ",
  "    182222g1    ",
  "    182222g1    ",
  "    182222g1    ",
  "    182222g1    ",
  "    182222g1    ",
  "    11111111    ",
  "   188222gg21   ",
  "   188222gg21   ",
  "   1111111111   ",
  " 11666666666611 ",
  " 16666666666661 ",
  " 16666666666661 ",
  " 11777777777711 ",
  "   1777777771   ",
  "    13333331    ",
  "    11333311    ",
  "      1111      ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                ",
  "                "
]

const LOWRIDER_PALETTE = [
  '#000000', // 1 Outline / Tires
  '#FFD700', // 2 Gold body
  '#FFFFFF', // 3 Chrome / Roof
  '#87CEFA', // 4 Glass
  '#FF0000', // 5 Tail light
  '#FFA500', // 6 Signal
  '#555555', // 7 Dark chrome
]

const LOWRIDER_ART = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,1,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,1,3,1,4,4,4,4,4,4,1,4,4,4,4,4,4,4,4,4,4,1,3,3,1,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,1,3,1,4,4,4,4,4,4,4,1,4,4,4,4,4,4,4,4,4,4,4,1,3,3,1,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,3,1,4,4,4,4,4,4,4,4,1,4,4,4,4,4,4,4,4,4,4,4,1,3,3,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,1],
  [1,5,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,6,1],
  [1,5,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,6,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1],
  [1,3,3,1,1,1,1,1,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,1,1,1,1,3,3,3,3,3,3,3,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [0,0,1,1,1,7,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,7,1,1,1,0,0,0,0,0,0,0,0],
  [0,1,1,7,7,3,3,7,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,7,7,3,3,7,1,1,0,0,0,0,0,0,0],
  [0,1,7,3,3,1,1,3,7,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,7,3,3,1,1,3,7,1,0,0,0,0,0,0,0],
  [0,1,1,7,7,3,3,7,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,7,7,3,3,7,1,1,0,0,0,0,0,0,0],
  [0,0,1,1,1,7,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,7,1,1,1,0,0,0,0,0,0,0,0]
]

const TRUCK_PALETTE = [
  '#000000', // 1 Outline/Tires
  '#FFFFFF', // 2 White body
  '#FF69B4', // 3 Pink trim
  '#87CEFA', // 4 Glass
  '#FFD700', // 5 Gold/Yellow cone
  '#8B4513', // 6 Cone crust
  '#AAAAAA', // 7 Hubcaps/Gray
]

const TRUCK_ART = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,3,2,3,3,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,3,3,2,3,3,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,5,5,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,2,2,6,6,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0],
  [0,1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,2,1,0,0,0,0,0],
  [1,2,2,2,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1,2,1,1,1,1,1,2,1,0,0,0,0,0],
  [1,2,2,2,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1,2,1,4,4,4,1,2,1,0,0,0,0,0],
  [1,2,2,2,1,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,1,2,1,4,4,4,1,2,1,0,0,0,0,0],
  [1,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,4,4,4,1,2,1,0,0,0,0,0],
  [1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,0,0],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0],
  [1,2,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,2,2,2,2,2,2,2,1,0],
  [1,1,1,0,0,0,0,1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,1,1,2,2,2,2,2,2,1,0],
  [0,1,0,0,1,1,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,1,1,0,0,1,2,2,2,1,1,1,0,0],
  [0,1,0,1,3,3,1,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,1,3,3,1,0,1,2,2,1,0,0,0,0,0],
  [0,1,0,1,3,3,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,3,3,1,0,1,1,1,0,0,0,0,0,0],
  [0,1,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0],
  [0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0]
]

const JOINT_PALETTE = [
  '#000000', // 1 Outline
  '#FFFFFF', // 2 Paper
  '#FF4500', // 3 Cherry (Red/Orange)
  '#A9A9A9', // 4 Ash
]

const JOINT_ART = [
  [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,0,1,1,2,2,2,2,1,1,0,0],
  [0,0,0,0,1,1,2,2,2,2,2,2,2,2,1,0],
  [0,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1],
  [0,1,4,4,1,2,2,2,2,2,2,2,2,2,2,1],
  [1,3,3,4,4,1,1,2,2,2,2,2,2,2,2,1],
  [1,3,3,4,4,1,1,2,2,2,2,2,2,2,2,1],
  [0,1,4,4,1,2,2,2,2,2,2,2,2,2,2,1],
  [0,0,1,1,2,2,2,2,2,2,2,2,2,2,1,1],
  [0,0,0,0,1,1,2,2,2,2,2,2,2,2,1,0],
  [0,0,0,0,0,0,1,1,2,2,2,2,1,1,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0],
]

type SmokeParticle = {
  x: number
  y: number
  radius: number
  vx: number
  vy: number
  life: number
  maxLife: number
  alphaMultiplier: number
}

type SmokeRing = {
  x: number
  y: number
  radius: number
  life: number
  maxLife: number
}

export function cheechChongFactory(): IAnimation {
  class CheechChongScene extends CanvasAnimation {
    private smokeParticles: SmokeParticle[] = []
    private smokeRings: SmokeRing[] = []
    
    private truckX = -500
    private jointX = 2000
    private jointY = 100
    
    constructor() {
      super({ useEffects: false, defaultZIndex: 100 })
      // Pre-fill some smoke
      for (let i = 0; i < 50; i++) {
        this.spawnSmoke(Math.random() * 2000, true)
      }
    }

    private spawnSmoke(x: number, randomY: boolean = false) {
      this.smokeParticles.push({
        x: x,
        y: randomY ? 300 + Math.random() * 600 : 700 + Math.random() * 200,
        radius: 100 + Math.random() * 300,
        vx: -1 - Math.random() * 3,
        vy: -0.5 - Math.random() * 2,
        life: 0,
        maxLife: 300 + Math.random() * 200,
        alphaMultiplier: 0.1 + Math.random() * 0.3
      })
    }

    private drawPixelArt(ctx: CanvasRenderingContext2D, art: number[][], palette: string[], x: number, y: number, scale: number) {
      for (let r = 0; r < art.length; r++) {
        for (let c = 0; c < art[r].length; c++) {
          const colorIdx = art[r][c]
          if (colorIdx > 0) {
            ctx.fillStyle = palette[colorIdx - 1]
            ctx.fillRect(x + c * scale, y + r * scale, scale, scale)
          }
        }
      }
    }

    private drawPixelArtString(ctx: CanvasRenderingContext2D, art: string[], palette: string[], x: number, y: number, scale: number) {
      for (let r = 0; r < art.length; r++) {
        const row = art[r]
        for (let c = 0; c < row.length; c++) {
          const char = row[c]
          if (char !== ' ') {
            const idx = parseInt(char, 16) - 1
            if (idx >= 0 && idx < palette.length) {
              ctx.fillStyle = palette[idx]
              ctx.fillRect(x + c * scale, y + r * scale, scale, scale)
            }
          }
        }
      }
    }

    private drawFarmBackground(ctx: CanvasRenderingContext2D, w: number, h: number, triggers: any) {
      const time = Date.now()

      // Cosmic Sunset Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6)
      skyGrad.addColorStop(0, '#2b1055') // Deep purple space
      skyGrad.addColorStop(0.5, '#7597de') // Blue transition
      skyGrad.addColorStop(1, '#ff7b54') // Sunset orange at horizon
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h * 0.6)

      // Twinkling Stars
      ctx.fillStyle = '#FFFFFF'
      for(let i=0; i<40; i++) {
        const sx = (Math.sin(i * 1234) * 0.5 + 0.5) * w
        const sy = (Math.cos(i * 4321) * 0.5 + 0.5) * h * 0.4
        const twinkle = Math.sin(time/200 + i) * 0.5 + 0.5
        ctx.globalAlpha = twinkle * 0.8
        ctx.fillRect(sx, sy, 2, 2)
      }
      ctx.globalAlpha = 1.0

      // Massive Retro Sun
      const sunX = w * 0.5
      const sunY = h * 0.6
      const sunRadius = Math.min(w, h) * 0.25
      
      const sunGrad = ctx.createLinearGradient(0, sunY - sunRadius, 0, sunY + sunRadius)
      sunGrad.addColorStop(0, '#FFD700')
      sunGrad.addColorStop(1, '#FF4500')
      ctx.fillStyle = sunGrad
      ctx.beginPath()
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2)
      ctx.fill()
      
      // Sun scanlines (retro effect)
      ctx.fillStyle = '#ff7b54' // matching horizon
      for(let i=0; i<10; i++) {
         const lineY = sunY + (i * sunRadius * 0.1)
         const thickness = (i + 1) * 1.5
         ctx.fillRect(sunX - sunRadius, lineY, sunRadius * 2, thickness)
      }

      // Distant Silhouetted Mountains
      ctx.fillStyle = '#1a0b2e' // Very dark purple
      ctx.beginPath()
      ctx.moveTo(0, h * 0.6)
      ctx.lineTo(0, h * 0.45)
      ctx.lineTo(w * 0.15, h * 0.35)
      ctx.lineTo(w * 0.3, h * 0.5)
      ctx.lineTo(w * 0.6, h * 0.3)
      ctx.lineTo(w * 0.85, h * 0.5)
      ctx.lineTo(w, h * 0.4)
      ctx.lineTo(w, h * 0.6)
      ctx.fill()

      // The Farm Ground (Neon Grid style)
      ctx.fillStyle = '#11051F' // Dark ground
      ctx.fillRect(0, h * 0.6, w, h * 0.4)

      ctx.strokeStyle = '#ff007f' // Neon pink grid lines
      ctx.lineWidth = 2
      // Perspective rows
      for (let i = 0; i <= 12; i++) {
        ctx.beginPath()
        const topX = w * 0.5
        const bottomX = (i - 6) * (w / 3) + w * 0.5
        ctx.moveTo(topX, h * 0.6)
        ctx.lineTo(bottomX, h)
        ctx.stroke()
      }
      
      // Horizontal grid lines
      for (let i = 0; i < 5; i++) {
         const yOffset = Math.pow(i / 4, 2) * (h * 0.4)
         ctx.beginPath()
         ctx.moveTo(0, h * 0.6 + yOffset)
         ctx.lineTo(w, h * 0.6 + yOffset)
         ctx.stroke()
      }

      // Add "Cyber-Farm" glowing plants along the grid lines
      ctx.fillStyle = '#39ff14' // Neon green
      for (let i = 1; i <= 11; i++) { // Skip the outermost edges
        const topX = w * 0.5
        const bottomX = (i - 6) * (w / 3) + w * 0.5
        // Draw a few plants along each perspective line
        for(let j = 1; j <= 4; j++) {
            const progress = j / 4
            const px = topX + (bottomX - topX) * Math.pow(progress, 1.5)
            const py = h * 0.6 + (Math.pow(progress, 2) * (h * 0.4))
            const plantScale = progress * 4 + 1
            
            // Draw a simple 3-pronged neon plant shape
            ctx.beginPath()
            ctx.arc(px, py, plantScale * 2, 0, Math.PI, true)
            ctx.lineTo(px - plantScale * 3, py - plantScale * 5)
            ctx.lineTo(px - plantScale, py - plantScale * 2)
            ctx.lineTo(px, py - plantScale * 7)
            ctx.lineTo(px + plantScale, py - plantScale * 2)
            ctx.lineTo(px + plantScale * 3, py - plantScale * 5)
            ctx.fill()
        }
      }

      // Draw the "Love Machine" lowrider parked in the back
      const carScale = Math.max(3, h / 200)
      
      // Calculate bouncing hydraulics based on bassHit
      // The front bounces slightly higher/independently of the back to simulate hopping
      const isBouncing = triggers.bassHit
      const bounceAngle = isBouncing ? -0.1 : 0
      const bounceY = isBouncing ? -10 * carScale : 0
      
      ctx.save()
      ctx.translate(w * 0.50, h * 0.58 - (19 * carScale)) // Center
      
      // Pivot around the rear wheels for the jump
      ctx.translate(25 * carScale, 15 * carScale)
      ctx.rotate(bounceAngle)
      ctx.translate(0, bounceY)
      ctx.translate(-25 * carScale, -15 * carScale)
      
      this.drawPixelArt(ctx, LOWRIDER_ART, LOWRIDER_PALETTE, 0, 0, carScale)
      ctx.restore()

      // The Ice Cream Truck (driving slowly)
      this.truckX -= 1 // drives left
      if (this.truckX < -1000) {
        this.truckX = w + 500
      }
      this.drawPixelArt(ctx, TRUCK_ART, TRUCK_PALETTE, this.truckX, h * 0.45, carScale * 0.8)

      // The Giant UFO Joint (flying through sky)
      this.jointX -= 3
      this.jointY = h * 0.2 + Math.sin(Date.now() / 500) * 50
      if (this.jointX < -1000) {
        this.jointX = w + 1000
      }
      ctx.save()
      ctx.translate(this.jointX, this.jointY)
      // Slight rotation based on movement
      ctx.rotate(-0.1)
      this.drawPixelArt(ctx, JOINT_ART, JOINT_PALETTE, 0, 0, carScale * 1.5)
      ctx.restore()
    }

    protected draw(context: PublicAnimationContext) {
      const { ctx } = this
      const triggers: any = context.shared?.getTriggers?.() || { bassHit: false, beat: false, energy: 0, kick: false, snare: false, hat: false }
      const w = this.cssWidth
      const h = this.cssHeight

      this.drawFarmBackground(ctx, w, h, triggers)

      // Audio reactive smoke spawning
      if (triggers.energy > 0.5 && Math.random() < triggers.energy) {
        this.spawnSmoke(w + 200, false)
      }

      // Draw Smoke Particles
      for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
        const p = this.smokeParticles[i]
        p.x += p.vx * (1 + triggers.energy * 2)
        p.y += p.vy
        p.life++
        
        if (p.life > p.maxLife || p.x < -p.radius * 2) {
          this.smokeParticles.splice(i, 1)
          continue
        }

        const progress = p.life / p.maxLife
        const alpha = Math.sin(progress * Math.PI) * p.alphaMultiplier

        // Add subtle green tint to smoke if energy is high (fiberweed!)
        const r = 240 - triggers.energy * 40
        const g = 250
        const b = 240 - triggers.energy * 40

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * (1 + triggers.energy * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw Characters (Hierarchical Full Body)
      const characterScale = Math.max(5, h / 120) // Larger scale for full body
      const bob = triggers.bassHit ? characterScale * 3 : 0
      
      const time = Date.now()
      const lookX = Math.sin(time / 1200) * 1.5 * characterScale // Slower eye movement
      const stonedDroop = characterScale * 1.5 + (triggers.energy * characterScale * 2)

      const headTiltCheech = Math.sin(time / 500) * 0.1
      const headTiltChong = Math.sin(time / 550 + 1) * -0.1

      // ==========================================
      // CHEECH FULL BODY
      // ==========================================
      const cx = w * 0.15 - 20 * characterScale
      const cy = h - 70 * characterScale - bob
      
      // Draw Cheech Body (with Breathing)
      const breathScaleY = 1 + Math.sin(time / 800) * 0.02
      ctx.save()
      ctx.translate(cx + 20 * characterScale, cy + 70 * characterScale) // Pivot at feet
      ctx.scale(1, breathScaleY)
      ctx.translate(-(cx + 20 * characterScale), -(cy + 70 * characterScale))
      this.drawPixelArtString(ctx, CHEECH_BODY_STR, CHEECH_PALETTE, cx, cy + 32 * characterScale, characterScale)
      ctx.restore()
      
      // Draw Cheech Arm (Hydraulic Switch pumping)
      ctx.save()
      ctx.translate(cx + 32 * characterScale, cy + 36 * characterScale) // shoulder pivot
      const armPump = triggers.bassHit ? -0.5 : 0
      ctx.rotate(armPump)
      this.drawPixelArtString(ctx, CHEECH_ARM_STR, CHEECH_PALETTE, -8 * characterScale, -2 * characterScale, characterScale)
      ctx.restore()

      // Draw Cheech Head (with eyes, blink, and tilt)
      ctx.save()
      ctx.translate(cx + 20 * characterScale, cy + 30 * characterScale) // Neck pivot
      ctx.rotate(headTiltCheech)
      ctx.translate(-20 * characterScale, -30 * characterScale) // Back to top-left of head
      
      // Cheech Eyes (drawn behind mask)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(10 * characterScale, 14 * characterScale, 6 * characterScale, 4 * characterScale)
      ctx.fillRect(24 * characterScale, 14 * characterScale, 6 * characterScale, 4 * characterScale)
      
      ctx.fillStyle = '#FF0000'
      ctx.fillRect(10 * characterScale, 14 * characterScale, 1 * characterScale, 4 * characterScale)
      ctx.fillRect(15 * characterScale, 14 * characterScale, 1 * characterScale, 4 * characterScale)
      ctx.fillRect(24 * characterScale, 14 * characterScale, 1 * characterScale, 4 * characterScale)
      ctx.fillRect(29 * characterScale, 14 * characterScale, 1 * characterScale, 4 * characterScale)

      ctx.fillStyle = '#000000'
      ctx.fillRect(12 * characterScale + lookX, 15 * characterScale, 2 * characterScale, 2 * characterScale)
      ctx.fillRect(26 * characterScale + lookX, 15 * characterScale, 2 * characterScale, 2 * characterScale)
      
      const isBlinkingCheech = (time % 4200) > 4000 && (time % 4200) < 4150
      const cheechEyelid = isBlinkingCheech ? 4 * characterScale : stonedDroop

      ctx.fillStyle = '#E6A87C'
      ctx.fillRect(10 * characterScale, 14 * characterScale, 6 * characterScale, cheechEyelid)
      ctx.fillRect(24 * characterScale, 14 * characterScale, 6 * characterScale, cheechEyelid)

      this.drawPixelArtString(ctx, CHEECH_HEAD_STR, CHEECH_PALETTE, 0, 0, characterScale)
      ctx.restore()

      // ==========================================
      // CHONG FULL BODY
      // ==========================================
      const chongX = w * 0.85 - 20 * characterScale
      const chongY = h - 70 * characterScale - bob

      // Draw Chong Body (with Breathing)
      ctx.save()
      ctx.translate(chongX + 20 * characterScale, chongY + 70 * characterScale)
      ctx.scale(1, breathScaleY)
      ctx.translate(-(chongX + 20 * characterScale), -(chongY + 70 * characterScale))
      this.drawPixelArtString(ctx, CHONG_BODY_STR, CHONG_PALETTE, chongX, chongY + 32 * characterScale, characterScale)
      ctx.restore()

      // Draw Chong Arm (Smoking joint action)
      const smokeCycle = (time % 4000) / 4000
      let armAngle = 0
      let takingPuff = false
      if (smokeCycle < 0.2) {
        armAngle = -2.3 // Joint brought to mouth
        takingPuff = true
      } else if (smokeCycle < 0.3) {
        armAngle = -2.3 + (smokeCycle - 0.2) * 10 * 2.3 // Moving arm back down
      }

      ctx.save()
      ctx.translate(chongX + 30 * characterScale, chongY + 38 * characterScale) // shoulder pivot
      ctx.rotate(armAngle)
      this.drawPixelArtString(ctx, CHONG_ARM_STR, CHONG_PALETTE, -8 * characterScale, -2 * characterScale, characterScale)
      ctx.restore()

      // Emit smoke from mouth if taking a puff
      if (takingPuff && triggers.beat && Math.random() > 0.5) {
         this.smokeRings.push({
           x: chongX + 18 * characterScale,
           y: chongY + 26 * characterScale,
           radius: 3 * characterScale,
           life: 0,
           maxLife: 100
         })
      }

      // Draw Chong Head (with eyes, blink, and tilt)
      ctx.save()
      ctx.translate(chongX + 20 * characterScale, chongY + 30 * characterScale) // Neck pivot
      ctx.rotate(headTiltChong)
      ctx.translate(-20 * characterScale, -30 * characterScale) // Back to top left
      
      // Chong Eyes (drawn behind mask)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(11 * characterScale, 13 * characterScale, 4 * characterScale, 3 * characterScale)
      ctx.fillRect(25 * characterScale, 13 * characterScale, 4 * characterScale, 3 * characterScale)
      
      ctx.fillStyle = '#000000'
      ctx.fillRect(12 * characterScale + lookX, 14 * characterScale, 2 * characterScale, 2 * characterScale)
      ctx.fillRect(26 * characterScale + lookX, 14 * characterScale, 2 * characterScale, 2 * characterScale)

      const isBlinkingChong = ((time + 1000) % 5000) > 4850
      const chongEyelid = isBlinkingChong ? 3 * characterScale : stonedDroop * 0.8

      ctx.fillStyle = '#FCD1A2'
      ctx.fillRect(11 * characterScale, 13 * characterScale, 4 * characterScale, chongEyelid)
      ctx.fillRect(25 * characterScale, 13 * characterScale, 4 * characterScale, chongEyelid)

      this.drawPixelArtString(ctx, CHONG_HEAD_STR, CHONG_PALETTE, 0, 0, characterScale)
      
      // Glasses glare overlay
      ctx.globalAlpha = 0.4 + triggers.energy * 0.2
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(9 * characterScale, 14 * characterScale, 8 * characterScale, 2 * characterScale)
      ctx.fillRect(23 * characterScale, 14 * characterScale, 8 * characterScale, 2 * characterScale)
      ctx.globalAlpha = 1.0
      ctx.restore()

      // Update and draw smoke rings
      ctx.lineWidth = characterScale
      for (let i = this.smokeRings.length - 1; i >= 0; i--) {
        const ring = this.smokeRings[i]
        ring.y -= 2
        ring.radius += 0.5
        ring.life++
        
        if (ring.life > ring.maxLife) {
          this.smokeRings.splice(i, 1)
          continue
        }

        const ringAlpha = 1 - (ring.life / ring.maxLife)
        ctx.strokeStyle = `rgba(220, 220, 220, ${ringAlpha * 0.8})`
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Apply Global Lighting / Vibe Wash based on audio energy
      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = 0.3 + (triggers.energy * 0.4) // Pulses with the music
      const lightingGrad = ctx.createLinearGradient(0, h, 0, 0) // Bottom up
      lightingGrad.addColorStop(0, '#ff007f') // Neon pink from the grid
      lightingGrad.addColorStop(0.5, '#7597de')
      lightingGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = lightingGrad
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
    }
  }

  return new CheechChongScene()
}

export default cheechChongFactory
