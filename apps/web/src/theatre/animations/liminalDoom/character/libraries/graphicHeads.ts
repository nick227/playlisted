export type GraphicHeadDef = {
  id: string
  label: string
  shape: 'poster' | 'monitor' | 'sticker' | 'mask' | 'record' | 'badge'
  bg: string
  bg2: string
  ink: string
  accent: string
  imageSrc?: string
}

export type GraphicHeadImageSource = {
  id: string
  label: string
  src: string
}

const rasterHeadAssets = import.meta.glob<string>('../assets/heads/*.{png,webp}', { eager: true, query: '?url', import: 'default' })
export const RASTER_GRAPHIC_HEAD_IMAGE_SOURCES = rasterImageSources(rasterHeadAssets)

export const GRAPHIC_HEADS: Record<string, GraphicHeadDef> = {
  'graphicHead.staticPoster': {
    id: 'graphicHead.staticPoster',
    label: 'Static Poster',
    shape: 'poster',
    bg: '#f4efe4',
    bg2: '#d7c7a2',
    ink: '#191716',
    accent: '#e25b3f',
  },
  'graphicHead.greenMonitor': {
    id: 'graphicHead.greenMonitor',
    label: 'Green Monitor',
    shape: 'monitor',
    bg: '#183c34',
    bg2: '#74d884',
    ink: '#07130f',
    accent: '#f2ff8f',
  },
  'graphicHead.lipSticker': {
    id: 'graphicHead.lipSticker',
    label: 'Lip Sticker',
    shape: 'sticker',
    bg: '#f1c3d1',
    bg2: '#b83a65',
    ink: '#251217',
    accent: '#fff3d4',
  },
  'graphicHead.noiseMask': {
    id: 'graphicHead.noiseMask',
    label: 'Noise Mask',
    shape: 'mask',
    bg: '#d9e0dd',
    bg2: '#65726e',
    ink: '#111817',
    accent: '#f0b83f',
  },
  'graphicHead.blueRecord': {
    id: 'graphicHead.blueRecord',
    label: 'Blue Record',
    shape: 'record',
    bg: '#1d2f62',
    bg2: '#7cc7d9',
    ink: '#0b1020',
    accent: '#f6d64a',
  },
  'graphicHead.redBadge': {
    id: 'graphicHead.redBadge',
    label: 'Red Badge',
    shape: 'badge',
    bg: '#d94738',
    bg2: '#f8d9a0',
    ink: '#221111',
    accent: '#8bd1cc',
  },
}

export const GRAPHIC_HEAD_IDS = Object.keys(GRAPHIC_HEADS)

const GENERATED_GRAPHIC_HEAD_IMAGE_SOURCES: GraphicHeadImageSource[] = [
  {
    id: 'headImage.checker',
    label: 'Checker Face',
    src: svgDataUrl('#f7f1df', '#151515', '#df5844', 'checker'),
  },
  {
    id: 'headImage.scanline',
    label: 'Scanline Face',
    src: svgDataUrl('#122d2a', '#91e68e', '#f4f285', 'scanline'),
  },
  {
    id: 'headImage.cutout',
    label: 'Cutout Face',
    src: svgDataUrl('#f3c0d1', '#30121b', '#ffe9af', 'cutout'),
  },
  {
    id: 'headImage.static',
    label: 'Static Face',
    src: svgDataUrl('#e4e7e0', '#202624', '#f0ad35', 'static'),
  },
  {
    id: 'headImage.record',
    label: 'Record Face',
    src: svgDataUrl('#1b2c66', '#98d9e3', '#f4d84c', 'record'),
  },
  {
    id: 'headImage.badge',
    label: 'Badge Face',
    src: svgDataUrl('#df4c3d', '#24100f', '#91d6ce', 'badge'),
  },
]

export const GRAPHIC_HEAD_IMAGE_SOURCES: GraphicHeadImageSource[] = [
  ...RASTER_GRAPHIC_HEAD_IMAGE_SOURCES,
  ...GENERATED_GRAPHIC_HEAD_IMAGE_SOURCES,
]

if (import.meta.env.DEV) {
  if (RASTER_GRAPHIC_HEAD_IMAGE_SOURCES.length) {
    console.info(
      `[liminalDoom] found ${RASTER_GRAPHIC_HEAD_IMAGE_SOURCES.length} raster head image(s)`,
      RASTER_GRAPHIC_HEAD_IMAGE_SOURCES.map((source) => source.label),
    )
  } else {
    console.warn('[liminalDoom] no raster head images found in character/assets/heads')
  }
}

function rasterImageSources(assets: Record<string, string>): GraphicHeadImageSource[] {
  return Object.entries(assets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, src]) => {
      const fileName = path.split('/').pop() ?? path
      const ext = fileName.match(/\.(png|webp)$/i)?.[1]?.toLowerCase() ?? 'image'
      const label = fileName.replace(/\.(png|webp)$/i, '').replace(/[-_]+/g, ' ')
      return {
        id: `headImage.${ext}.${fileName}`,
        label,
        src,
      }
    })
}

function svgDataUrl(bg: string, ink: string, accent: string, variant: string): string {
  const pattern = svgPattern(variant, ink, accent)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="${bg}"/>
    ${pattern}
    <ellipse cx="45" cy="54" rx="13" ry="17" fill="${accent}" stroke="${ink}" stroke-width="6"/>
    <ellipse cx="83" cy="54" rx="13" ry="17" fill="${accent}" stroke="${ink}" stroke-width="6"/>
    <circle cx="45" cy="54" r="4" fill="${ink}"/>
    <circle cx="83" cy="54" r="4" fill="${ink}"/>
    <path d="M36 34 L55 40 M92 34 L73 40" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="64" cy="88" rx="24" ry="12" fill="none" stroke="${ink}" stroke-width="7"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function svgPattern(variant: string, ink: string, accent: string): string {
  switch (variant) {
    case 'checker':
      return `<path d="M0 0h32v32H0zM64 0h32v32H64zM32 32h32v32H32zM96 32h32v32H96zM0 64h32v32H0zM64 64h32v32H64zM32 96h32v32H32zM96 96h32v32H96z" fill="${ink}" opacity=".16"/>`
    case 'scanline':
      return `<path d="M0 18h128M0 34h128M0 50h128M0 66h128M0 82h128M0 98h128M0 114h128" stroke="${accent}" stroke-width="4" opacity=".45"/>`
    case 'cutout':
      return `<path d="M16 18 C44 4 78 8 108 24 L99 116 C68 125 36 119 17 104 Z" fill="${accent}" opacity=".32"/>`
    case 'static':
      return `<path d="M8 16h18v9H8zM39 10h8v13h-8zM72 20h19v8H72zM103 15h11v19h-11zM13 76h13v12H13zM95 80h21v10H95zM58 111h12v10H58z" fill="${ink}" opacity=".28"/>`
    case 'record':
      return `<circle cx="64" cy="64" r="54" fill="none" stroke="${accent}" stroke-width="5" opacity=".48"/><circle cx="64" cy="64" r="38" fill="none" stroke="${accent}" stroke-width="4" opacity=".42"/><circle cx="64" cy="64" r="18" fill="${accent}" opacity=".35"/>`
    default:
      return `<path d="M64 8l13 23 26-5-8 25 20 17-26 7-2 27-23-14-23 14-2-27-26-7 20-17-8-25 26 5z" fill="${accent}" opacity=".34"/>`
  }
}
