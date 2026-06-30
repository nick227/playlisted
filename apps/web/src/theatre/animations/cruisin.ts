import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'

function hexToRgb(hex: string) {
  let h = hex.replace('#', '')
  if(h.length === 3) h = h.split('').map(c => c+c).join('')
  return [parseInt(h.substring(0,2), 16), parseInt(h.substring(2,4), 16), parseInt(h.substring(4,6), 16)]
}
function lerpColor(a: string, b: string, t: number) {
  const c1 = hexToRgb(a)
  const c2 = hexToRgb(b)
  return `rgb(${Math.round(c1[0] + (c2[0]-c1[0])*t)}, ${Math.round(c1[1] + (c2[1]-c1[1])*t)}, ${Math.round(c1[2] + (c2[2]-c1[2])*t)})`
}

function drawChromeText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, align: CanvasTextAlign = 'center') {
  ctx.save()
  ctx.textAlign = align
  ctx.font = `italic 900 ${fontSize}px "Arial Black", sans-serif`
  ctx.lineWidth = fontSize * 0.1
  ctx.strokeStyle = '#000'
  ctx.strokeText(text, x, y)
  
  const grad = ctx.createLinearGradient(0, y - fontSize * 0.8, 0, y)
  grad.addColorStop(0, '#55aaff') // light blue top
  grad.addColorStop(0.45, '#ffffff') // white middle
  grad.addColorStop(0.5, '#000044') // dark blue horizon line
  grad.addColorStop(0.55, '#552200') // brown earth reflection
  grad.addColorStop(1, '#ff8800') // orange bottom
  
  ctx.fillStyle = grad
  ctx.fillText(text, x, y)
  ctx.restore()
}

type Theme = {
  skyTop: string, skyMid: string, skyBot: string
  sunTop: string, sunBot: string
  mountains1: string, mountains2: string
  grassDark: string, grassLight: string
  rumbleDark: string, rumbleLight: string
  roadDark: string, roadLight: string, shoulder: string
  spritesAllowed: number[]
}

const THEMES: Theme[] = [
  // 0: Synthwave Sunset (Current)
  { skyTop: '#2b1055', skyMid: '#7597de', skyBot: '#ffc371', sunTop: '#ffdf00', sunBot: '#ff4b01', mountains1: '#4a4e69', mountains2: '#22223b', grassDark: '#1D8A2B', grassLight: '#1F982E', rumbleDark: '#FFF', rumbleLight: '#E00', roadDark: '#555', roadLight: '#5A5A5A', shoulder: '#FFF', spritesAllowed: [1, 2, 3, 6, 8] },
  // 1: Midnight City (Neon)
  { skyTop: '#0B0C10', skyMid: '#1F2833', skyBot: '#000000', sunTop: '#45A29E', sunBot: '#66FCF1', mountains1: '#111', mountains2: '#050505', grassDark: '#121212', grassLight: '#181818', rumbleDark: '#66FCF1', rumbleLight: '#45A29E', roadDark: '#222', roadLight: '#282828', shoulder: '#66FCF1', spritesAllowed: [3, 5, 6] },
  // 2: Desert Day
  { skyTop: '#4facfe', skyMid: '#4facfe', skyBot: '#00f2fe', sunTop: '#FFD700', sunBot: '#FFA500', mountains1: '#D2B48C', mountains2: '#CD853F', grassDark: '#EDC9AF', grassLight: '#F5DEB3', rumbleDark: '#FFF', rumbleLight: '#E00', roadDark: '#777', roadLight: '#888', shoulder: '#FFF', spritesAllowed: [2, 3, 6] },
  // 3: Winter Snow
  { skyTop: '#a1c4fd', skyMid: '#c2e9fb', skyBot: '#fdfbfb', sunTop: '#ffffff', sunBot: '#e0e0e0', mountains1: '#D3D3D3', mountains2: '#FFFFFF', grassDark: '#f0f8ff', grassLight: '#ffffff', rumbleDark: '#888', rumbleLight: '#A00', roadDark: '#999', roadLight: '#AAA', shoulder: '#333', spritesAllowed: [3, 4, 6] },
  // 4: California Coast
  { skyTop: '#0077be', skyMid: '#87cefa', skyBot: '#e0ffff', sunTop: '#ffffe0', sunBot: '#ffd700', mountains1: '#556b2f', mountains2: '#8fbc8f', grassDark: '#32cd32', grassLight: '#7cfc00', rumbleDark: '#ffffff', rumbleLight: '#ffd700', roadDark: '#808080', roadLight: '#909090', shoulder: '#ffffff', spritesAllowed: [1, 3, 6, 8] }
]

export function cruisinFactory(): IAnimation {
  type Segment = {
    index: number
    p: { x: number; y: number; z: number }
    pScreen: { x: number; y: number; w: number; scale: number }
    curve: number
    sprite: number // 0: none, 1: palm, 2: cactus, 3: sign
    spriteSide: number // -1 or 1
  }

  class CruisinScene extends CanvasAnimation {
    private segments: Segment[] = []
    private segmentLength = 200
    private trackLength = 2000
    private drawDistance = 300
    private cameraDepth = 1.0 // FOV
    private roadWidth = 2000
    private cameraHeight = 1000

    private position = 0
    private speed = 0
    private maxSpeed = 300
    private playerX = 0

    private backgroundOffset = 0
    private lastStartPos = 0

    private currentThemeIdx = 0
    private nextThemeIdx = 0
    private themeT = 0
    private themeTimer = 0
    
    private uiScore = 0
    private uiTime = 99
    private uiCheckpointTimer = 0

    constructor() {
      super({ useEffects: false, defaultZIndex: 100 })
      this.initTrack()
    }

    private respawnSprite(j: number) {
      // safely wrap j back if it's negative (during init)
      const safeJ = j < 0 ? j + this.trackLength : j
      const targetIdx = (safeJ + this.drawDistance) % this.trackLength
      const seg = this.segments[targetIdx]
      if (!seg) return // protection during init
      seg.sprite = 0
      
      if (targetIdx % 400 === 0 && targetIdx > 0) {
        seg.sprite = 7 // Checkpoint Gate
        seg.spriteSide = 0 // Center of road
      } else if (targetIdx % 20 === 0 && Math.random() > 0.3) {
        const allowed = THEMES[this.nextThemeIdx].spritesAllowed
        seg.sprite = allowed[Math.floor(Math.random() * allowed.length)]
        seg.spriteSide = Math.random() > 0.5 ? 1 : -1
      }
    }

    private initTrack() {
      // Procedural generation of track segments
      let currentCurve = 0
      let currentY = 0

      for (let i = 0; i < this.trackLength; i++) {
        // Change curve and hills every few segments
        if (i % 100 === 0) {
          currentCurve = (Math.random() - 0.5) * 4 // -2 to 2
          currentY += (Math.random() - 0.5) * 1500
        }
        // Smooth out the curve and hills
        const curve = currentCurve * Math.sin((i % 100) / 100 * Math.PI)

        this.segments.push({
          index: i,
          p: { x: 0, y: currentY, z: i * this.segmentLength },
          pScreen: { x: 0, y: 0, w: 0, scale: 0 },
          curve: curve,
          sprite: 0,
          spriteSide: 0
        })
      }
      for (let i = 0; i < this.trackLength; i++) {
        this.respawnSprite(i - this.drawDistance)
      }
    }

    private project(p: Segment['p'], pScreen: Segment['pScreen'], cameraX: number, cameraY: number, cameraZ: number, width: number, height: number) {
      const relX = p.x - cameraX
      const relY = p.y - cameraY
      const relZ = p.z - cameraZ

      pScreen.scale = this.cameraDepth / relZ
      pScreen.x = Math.round((width / 2) + (pScreen.scale * relX * width / 2))
      pScreen.y = Math.round((height / 2) - (pScreen.scale * relY * height / 2))
      pScreen.w = Math.round((pScreen.scale * this.roadWidth * width / 2))
    }

    private drawPolygon(ctx: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, color: string) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(x1 - w1, y1)
      ctx.lineTo(x2 - w2, y2)
      ctx.lineTo(x2 + w2, y2)
      ctx.lineTo(x1 + w1, y1)
      ctx.closePath()
      ctx.fill()
    }

    private drawSprite(ctx: CanvasRenderingContext2D, segment: Segment, cameraX: number) {
      if (segment.sprite === 7) {
        // Checkpoint Gate
        if (segment.pScreen.scale <= 0) return
        
        ctx.save()
        ctx.translate(segment.pScreen.x, segment.pScreen.y)
        const gateScale = segment.pScreen.w / 100 // Full road width span
        ctx.scale(gateScale, gateScale)
        
        // Posts
        ctx.fillStyle = '#333'
        ctx.fillRect(-110, -150, 20, 150)
        ctx.fillRect(90, -150, 20, 150)
        
        // Top banner
        ctx.fillStyle = '#111'
        ctx.fillRect(-120, -180, 240, 40)
        
        // Neon text
        ctx.fillStyle = '#0F0'
        ctx.font = 'bold 24px "Arial Black", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('CHECKPOINT', 0, -152)
        
        // Checkered trim
        ctx.fillStyle = '#FFF'
        for(let bx=-120; bx<120; bx+=10) {
           ctx.fillRect(bx, -140, 5, 5)
           ctx.fillRect(bx+5, -180, 5, 5)
        }
        ctx.restore()
        return // skip the rest
      }

      const scale = segment.pScreen.scale
      const destX = segment.pScreen.x + (segment.pScreen.w * segment.spriteSide * 1.5)
      const destY = segment.pScreen.y
      
      const w = this.cssWidth
      const h = this.cssHeight

      // Don't draw if too far off screen
      if (destX < -w || destX > w * 2) return

      ctx.save()
      ctx.translate(destX, destY)
      // Scale sprite based on perspective. Baseline scale multiplier.
      const spriteScale = scale * w * 0.4
      ctx.scale(spriteScale, spriteScale)

      // Draw procedural sprite (origin at bottom center 0,0)
      if (segment.sprite === 1) {
        // Palm Tree
        // Trunk with ridges
        ctx.fillStyle = '#6B3E11'
        ctx.fillRect(-6, -60, 12, 60)
        ctx.fillStyle = '#8B4513'
        ctx.fillRect(-3, -60, 6, 60)
        for (let y = -50; y < 0; y += 10) {
          ctx.fillStyle = '#5A310C'
          ctx.fillRect(-6, y, 12, 3)
        }
        // Leaves with highlights
        ctx.fillStyle = '#1B5E20'
        ctx.beginPath()
        ctx.arc(0, -60, 25, 0, Math.PI * 2)
        ctx.arc(-20, -50, 20, 0, Math.PI * 2)
        ctx.arc(20, -50, 20, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2E7D32'
        ctx.beginPath()
        ctx.arc(0, -65, 15, 0, Math.PI * 2)
        ctx.arc(-15, -55, 10, 0, Math.PI * 2)
        ctx.arc(15, -55, 10, 0, Math.PI * 2)
        ctx.fill()
      } else if (segment.sprite === 2) {
        // Cactus
        ctx.fillStyle = '#1B5E20'
        ctx.fillRect(-7, -40, 14, 40) // Shadow base
        ctx.fillRect(-16, -25, 10, 15) // Left arm shadow
        ctx.fillRect(8, -30, 10, 20)  // Right arm shadow
        
        ctx.fillStyle = '#2E8B57'
        ctx.fillRect(-4, -40, 8, 40) // Highlight base
        ctx.fillRect(-15, -25, 6, 15) // Left arm highlight
        ctx.fillRect(9, -30, 6, 20)  // Right arm highlight
        
        ctx.fillRect(-15, -30, 20, 6) // Connect left
        ctx.fillRect(0, -35, 15, 6)   // Connect right
        
        // Spines
        ctx.fillStyle = '#A4C639'
        for (let i = -35; i < 0; i += 8) {
          ctx.fillRect(-8, i, 2, 1)
          ctx.fillRect(6, i + 4, 2, 1)
        }
      } else if (segment.sprite === 3) {
        // Sign
        ctx.fillStyle = '#333' // Pole shadow
        ctx.fillRect(-2, -30, 4, 30)
        ctx.fillStyle = '#777' // Pole highlight
        ctx.fillRect(-1, -30, 2, 30)
        
        ctx.fillStyle = '#8B0000' // Sign board border
        ctx.fillRect(-17, -47, 34, 19)
        ctx.fillStyle = '#B22222' // Sign board
        ctx.fillRect(-15, -45, 30, 15)
        
        ctx.fillStyle = '#FFF' // Text line
        ctx.fillRect(-10, -40, 20, 3)
        ctx.fillRect(-10, -35, 12, 3)
        ctx.fillStyle = '#FFD700' // Yellow arrow/detail
        ctx.fillRect(5, -36, 5, 5)
      } else if (segment.sprite === 4) {
        // Pine Tree
        ctx.fillStyle = '#3E2723' // Trunk
        ctx.fillRect(-4, -20, 8, 20)
        ctx.fillStyle = '#1B5E20'
        ctx.beginPath()
        ctx.moveTo(0, -80)
        ctx.lineTo(25, -20)
        ctx.lineTo(-25, -20)
        ctx.fill()
        ctx.fillStyle = '#2E7D32'
        ctx.beginPath()
        ctx.moveTo(0, -80)
        ctx.lineTo(15, -20)
        ctx.lineTo(-15, -20)
        ctx.fill()
        // Snow caps
        ctx.fillStyle = '#FFF'
        ctx.beginPath()
        ctx.moveTo(0, -80)
        ctx.lineTo(10, -60)
        ctx.lineTo(-10, -60)
        ctx.fill()
      } else if (segment.sprite === 5) {
        // Streetlight
        ctx.fillStyle = '#444' // Pole
        ctx.fillRect(-2, -80, 4, 80)
        ctx.fillRect(-15, -80, 15, 4) // Arm
        ctx.fillStyle = '#FFD700' // Glow
        ctx.beginPath()
        ctx.arc(-15, -76, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)'
        ctx.beginPath()
        ctx.moveTo(-15, -76)
        ctx.lineTo(5, 0)
        ctx.lineTo(-35, 0)
        ctx.fill()
      }

      ctx.restore()
    }

    private drawPlayerCar(ctx: CanvasRenderingContext2D, w: number, h: number, triggers: any) {
      const carScale = Math.max(2, w / 400)
      const bounce = triggers.bassHit ? 5 : 0
      const cx = w / 2 + (this.playerX * w * 0.1) // drift visually slightly with playerX
      const cy = h - 30 * carScale + bounce // stay near bottom

      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(carScale, carScale)

      // Exhaust glow (audio reactive)
      if (triggers.energy > 0.5) {
        ctx.fillStyle = `rgba(255, 100, 0, ${triggers.energy})`
        ctx.beginPath()
        ctx.arc(-25, 4, 8 + Math.random() * 4, 0, Math.PI * 2)
        ctx.arc(25, 4, 8 + Math.random() * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      // Tire Smoke (audio reactive and drifting)
      if (this.speed > 100 && (Math.abs(this.playerX) > 0.3 || triggers.energy > 0.6)) {
        ctx.fillStyle = `rgba(200, 200, 200, ${0.1 + Math.random() * 0.2})`
        ctx.beginPath()
        ctx.arc(-40 + Math.random() * 10, -5 + Math.random() * 10, 15 + Math.random() * 10, 0, Math.PI * 2)
        ctx.arc(40 + Math.random() * 10, -5 + Math.random() * 10, 15 + Math.random() * 10, 0, Math.PI * 2)
        ctx.fill()
      }

      // Tires
      ctx.fillStyle = '#050505'
      ctx.fillRect(-38, -5, 18, 16)
      ctx.fillRect(20, -5, 18, 16)
      // Tire treads
      ctx.fillStyle = '#222'
      ctx.fillRect(-38, -5, 4, 16)
      ctx.fillRect(34, -5, 4, 16)
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(-40, 9, 80, 5)

      // Body bottom (Shadowed)
      ctx.fillStyle = '#990000'
      ctx.beginPath()
      ctx.moveTo(-42, -5)
      ctx.lineTo(42, -5)
      ctx.lineTo(46, 6)
      ctx.lineTo(-46, 6)
      ctx.fill()

      // Body middle (Main red)
      ctx.fillStyle = '#D21414' // Ferrari Red
      ctx.beginPath()
      ctx.moveTo(-40, -10)
      ctx.lineTo(40, -10)
      ctx.lineTo(43, -5)
      ctx.lineTo(-43, -5)
      ctx.fill()

      // Tail lights (audio reactive)
      const lightIntens = triggers.bassHit ? 255 : 150
      ctx.fillStyle = `rgb(${lightIntens}, 0, 0)`
      ctx.fillRect(-36, -6, 16, 6)
      ctx.fillRect(20, -6, 16, 6)
      // Tail light bright center
      ctx.fillStyle = triggers.bassHit ? '#FFAAAA' : '#FF5555'
      ctx.fillRect(-32, -4, 8, 2)
      ctx.fillRect(24, -4, 8, 2)

      // Exhaust pipes
      ctx.fillStyle = '#222'
      ctx.fillRect(-27, 2, 6, 4)
      ctx.fillRect(21, 2, 6, 4)
      ctx.fillStyle = '#999'
      ctx.fillRect(-26, 3, 4, 2)
      ctx.fillRect(22, 3, 4, 2)

      // License plate
      ctx.fillStyle = '#DDD'
      ctx.fillRect(-10, -4, 20, 7)
      ctx.fillStyle = '#222'
      ctx.fillRect(-8, -2, 16, 3)

      // Spoiler
      ctx.fillStyle = '#AA0000'
      ctx.fillRect(-42, -18, 8, 8) // Left strut
      ctx.fillRect(34, -18, 8, 8) // Right strut
      ctx.fillStyle = '#E01414'
      ctx.fillRect(-45, -20, 90, 4) // Wing

      // Cabin / windshield
      ctx.fillStyle = '#880000' // Darker red roof
      ctx.beginPath()
      ctx.moveTo(-24, -28)
      ctx.lineTo(24, -28)
      ctx.lineTo(32, -10)
      ctx.lineTo(-32, -10)
      ctx.fill()

      // Windshield glass
      ctx.fillStyle = '#111'
      ctx.beginPath()
      ctx.moveTo(-20, -25)
      ctx.lineTo(20, -25)
      ctx.lineTo(28, -12)
      ctx.lineTo(-28, -12)
      ctx.fill()
      
      // Reflection
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.beginPath()
      ctx.moveTo(-15, -25)
      ctx.lineTo(8, -25)
      ctx.lineTo(12, -12)
      ctx.lineTo(-22, -12)
      ctx.fill()

      ctx.restore()
    }

    private drawUI(ctx: CanvasRenderingContext2D, w: number, h: number, triggers: any) {
      // "INSERT COIN" blinking at bottom
      if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#FF00FF'
        ctx.font = 'bold 30px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('INSERT COIN', w / 2, h - 20)
      }

      // Top bar
      ctx.fillStyle = '#FFF'
      ctx.font = 'bold 40px "Courier New", monospace'
      ctx.textAlign = 'left'
      ctx.fillText('SCORE', 20, 40)
      ctx.fillStyle = '#0FF'
      ctx.fillText(Math.floor(this.uiScore).toString().padStart(6, '0'), 20, 80)

      ctx.textAlign = 'center'
      ctx.fillStyle = '#FFF'
      ctx.fillText('TIME', w / 2, 40)
      ctx.fillStyle = '#FF0'
      ctx.fillText(Math.max(0, Math.floor(this.uiTime)).toString(), w / 2, 80)

      ctx.textAlign = 'right'
      ctx.fillStyle = '#FFF'
      ctx.fillText('RANK', w - 20, 40)
      ctx.fillStyle = '#F00'
      ctx.fillText('1st', w - 20, 80)

      // Speed lines on edges
      if (triggers.energy > 0.7) {
         ctx.fillStyle = `rgba(255, 255, 255, ${(triggers.energy - 0.7) * 0.5})`
         ctx.fillRect(0, 0, 20 + Math.random() * 20, h)
         ctx.fillRect(w - (20 + Math.random() * 20), 0, 40, h)
      }

      // CHECKPOINT / TIME EXTENDED popup
      if (this.uiCheckpointTimer > 0) {
        this.uiCheckpointTimer -= 0.02
        const scale = 1 + (1 - this.uiCheckpointTimer) * 2
        ctx.save()
        ctx.translate(w / 2, h / 3)
        ctx.scale(scale, scale)
        ctx.globalAlpha = Math.max(0, this.uiCheckpointTimer)
        
        drawChromeText(ctx, 'CHECKPOINT', 0, 0, 60)
        
        ctx.font = 'bold 30px "Arial Black", sans-serif'
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = '#000'
        ctx.strokeText('TIME EXTENDED!', 0, 50)
        ctx.fillStyle = '#FFEA00'
        ctx.fillText('TIME EXTENDED!', 0, 50)
        
        ctx.restore()
      }
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w === 0 || h === 0) return

      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false,
        beat: false,
        energy: 0
      }
      
      // Calculate speed
      // Base speed + audio energy speed
      const targetSpeed = 150 + (triggers.energy * 250)
      this.speed += (targetSpeed - this.speed) * 0.1 // Smooth acceleration
      
      this.position += this.speed
      // Loop track
      while (this.position >= this.trackLength * this.segmentLength) {
        this.position -= this.trackLength * this.segmentLength
      }

      const startPos = Math.floor(this.position / this.segmentLength)
      const startSegment = this.segments[startPos % this.trackLength]
      
      // Auto-drive: player X follows the curve roughly
      // We can also make player bounce to the beat
      const carBounce = triggers.bassHit ? 5 : 0

      // Calculate camera coordinates
      const camX = this.playerX * this.roadWidth
      const camY = startSegment.p.y + this.cameraHeight
      const camZ = this.position

      // Update Themes
      this.themeTimer++
      if (this.themeTimer > 900) { // change every ~15 seconds at 60fps
        this.themeTimer = 0
        this.nextThemeIdx = (this.currentThemeIdx + 1 + Math.floor(Math.random() * (THEMES.length - 1))) % THEMES.length
      }

      if (this.currentThemeIdx !== this.nextThemeIdx) {
        this.themeT += 0.005 // Takes ~200 frames to transition (~3.3 seconds)
        if (this.themeT >= 1) {
          this.themeT = 0
          this.currentThemeIdx = this.nextThemeIdx
        }
      }

      const t1 = THEMES[this.currentThemeIdx]
      const t2 = THEMES[this.nextThemeIdx]
      const t = this.themeT

      const getC = (key: keyof Theme) => {
        if (t === 0) return t1[key] as string
        return lerpColor(t1[key] as string, t2[key] as string, t)
      }

      // Sprite generation management and UI Checkpoint check
      if (startPos < this.lastStartPos) {
        // Looped
        for (let j = this.lastStartPos + 1; j < this.trackLength; j++) {
           this.respawnSprite(j)
           if (this.segments[j % this.trackLength].sprite === 7) {
             this.uiTime += 20
             this.uiCheckpointTimer = 1.5
           }
        }
        for (let j = 0; j <= startPos; j++) {
           this.respawnSprite(j)
           if (this.segments[j % this.trackLength].sprite === 7) {
             this.uiTime += 20
             this.uiCheckpointTimer = 1.5
           }
        }
      } else {
        for (let j = this.lastStartPos + 1; j <= startPos; j++) {
           this.respawnSprite(j)
           if (this.segments[j % this.trackLength].sprite === 7) {
             this.uiTime += 20
             this.uiCheckpointTimer = 1.5
           }
        }
      }
      this.lastStartPos = startPos

      this.uiScore += this.speed * 0.02
      this.uiTime -= 0.016 // 60fps decrease
      if (this.uiTime < 0) this.uiTime = 0

      // Background parallax based on curve
      this.backgroundOffset -= startSegment.curve * (this.speed * 0.005)

      // Render Sky and Background
      // Sky gradient (Synthwave style sunset)
      const skyGrad = this.ctx.createLinearGradient(0, 0, 0, h*0.55)
      skyGrad.addColorStop(0, getC('skyTop'))
      skyGrad.addColorStop(0.5, getC('skyMid'))
      skyGrad.addColorStop(1, getC('skyBot'))
      this.ctx.fillStyle = skyGrad
      this.ctx.fillRect(0, 0, w, h)

      // Sun (Synthwave grid/gradient sun)
      const sunGrad = this.ctx.createLinearGradient(0, h * 0.15, 0, h * 0.45)
      sunGrad.addColorStop(0, getC('sunTop'))
      sunGrad.addColorStop(1, getC('sunBot'))
      this.ctx.fillStyle = sunGrad
      this.ctx.beginPath()
      this.ctx.arc(w * 0.5 + (this.backgroundOffset * 0.1) % w, h * 0.35, h * 0.18, 0, Math.PI * 2)
      this.ctx.fill()

      // Clouds
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
      for (let c = 0; c < 5; c++) {
        const cx = (w * 0.3 * c + this.backgroundOffset * 0.2) % (w * 1.5) - w * 0.2
        const cy = h * 0.1 + (c % 3) * h * 0.05
        this.ctx.beginPath()
        this.ctx.arc(cx, cy, h * 0.04, 0, Math.PI * 2)
        this.ctx.arc(cx + h * 0.04, cy - h * 0.02, h * 0.05, 0, Math.PI * 2)
        this.ctx.arc(cx + h * 0.08, cy, h * 0.03, 0, Math.PI * 2)
        this.ctx.fill()
      }

      // Mountains Layer 1 (Distant, lighter)
      this.ctx.fillStyle = getC('mountains1')
      this.ctx.beginPath()
      let mOffsetX = (this.backgroundOffset * 0.3) % w
      let mBaseY = h * 0.55
      this.ctx.moveTo(0, mBaseY)
      for(let x=0; x<w*2; x+=80) {
        const peak = Math.sin((x - mOffsetX) * 0.015) * 40 + Math.cos((x - mOffsetX) * 0.04) * 20
        this.ctx.lineTo(x, mBaseY - 30 + peak)
      }
      this.ctx.lineTo(w, h)
      this.ctx.lineTo(0, h)
      this.ctx.fill()

      // Mountains Layer 2 (Closer, darker)
      this.ctx.fillStyle = getC('mountains2')
      this.ctx.beginPath()
      mOffsetX = (this.backgroundOffset * 0.5) % w
      this.ctx.moveTo(0, mBaseY)
      for(let x=0; x<w*2; x+=100) {
        const peak = Math.sin((x - mOffsetX) * 0.01) * 60 + Math.cos((x - mOffsetX) * 0.05) * 40
        this.ctx.lineTo(x, mBaseY - 20 + peak)
      }
      this.ctx.lineTo(w, h)
      this.ctx.lineTo(0, h)
      this.ctx.fill()

      // Fill lower half with ground color before drawing road segments
      this.ctx.fillStyle = '#1D8A2B' // Base grass color
      this.ctx.fillRect(0, mBaseY, w, h - mBaseY)

      let dx = 0 // Curve accumulated
      let ddx = 0 // Curve delta

      // Track segments to draw
      const spritesToDraw: Segment[] = []

      let maxY = h // For occlusion culling

      for (let i = 0; i < this.drawDistance; i++) {
        const segIdx = (startPos + i) % this.trackLength
        const segment = this.segments[segIdx]
        
        // Accumulate curve
        ddx += segment.curve
        dx += ddx

        // Map segment absolute Z to a projected relative Z
        // If looping, we must ensure relative Z continues to increase
        let absoluteZ = segment.p.z
        if (segIdx < startPos) absoluteZ += this.trackLength * this.segmentLength

        // Project
        segment.p.x = dx // Assign the current accumulated curve as its world X
        this.project(
          { x: segment.p.x, y: segment.p.y, z: absoluteZ },
          segment.pScreen,
          camX - dx, // Shift camera inversely by the curve offset
          camY,
          camZ,
          w,
          h
        )

        // Only draw if it's in front of the camera and not occluded by hills
        if (segment.pScreen.scale > 0 && segment.pScreen.y < maxY) {
          // It's possible the curve causes X to go off screen, but we draw anyway
          maxY = segment.pScreen.y

          if (i > 0) {
            const prevSegment = this.segments[(startPos + i - 1) % this.trackLength]

            // Colors
            const isDark = Math.floor(absoluteZ / (this.segmentLength * 3)) % 2 === 0
            const grassColor = isDark ? getC('grassDark') : getC('grassLight')
            const rumbleColor = isDark ? getC('rumbleDark') : getC('rumbleLight')
            const roadColor = isDark ? getC('roadDark') : getC('roadLight')

            // Fill Grass
            this.ctx.fillStyle = grassColor
            this.ctx.fillRect(0, segment.pScreen.y, w, prevSegment.pScreen.y - segment.pScreen.y + 1) // +1 to fix floating gaps

            // Shoulder Strip Polygon (White line)
            const shoulderW1 = prevSegment.pScreen.w * 1.3
            const shoulderW2 = segment.pScreen.w * 1.3
            this.drawPolygon(this.ctx, 
              prevSegment.pScreen.x, prevSegment.pScreen.y, shoulderW1,
              segment.pScreen.x, segment.pScreen.y, shoulderW2,
              getC('shoulder')
            )

            // Rumble Strip Polygon
            const rumbleWidth1 = prevSegment.pScreen.w * 1.2
            const rumbleWidth2 = segment.pScreen.w * 1.2
            this.drawPolygon(this.ctx, 
              prevSegment.pScreen.x, prevSegment.pScreen.y, rumbleWidth1,
              segment.pScreen.x, segment.pScreen.y, rumbleWidth2,
              rumbleColor
            )

            // Road Polygon
            this.drawPolygon(this.ctx, 
              prevSegment.pScreen.x, prevSegment.pScreen.y, prevSegment.pScreen.w,
              segment.pScreen.x, segment.pScreen.y, segment.pScreen.w,
              roadColor
            )
            
            // Lane markings
            if (isDark) {
              const laneW1 = prevSegment.pScreen.w * 0.05
              const laneW2 = segment.pScreen.w * 0.05
              this.drawPolygon(this.ctx, 
                prevSegment.pScreen.x, prevSegment.pScreen.y, laneW1,
                segment.pScreen.x, segment.pScreen.y, laneW2,
                '#FFF'
              )
            }
          }
        }

        if (segment.sprite && segment.pScreen.scale > 0 && segment.pScreen.y < maxY) {
          spritesToDraw.push(segment)
        }
      }

      // Draw sprites (back to front)
      // They are naturally collected near-to-far, so we draw in reverse order
      for (let i = spritesToDraw.length - 1; i >= 0; i--) {
        this.drawSprite(this.ctx, spritesToDraw[i], camX)
      }

      // Draw Player Car
      this.drawPlayerCar(this.ctx, w, h, triggers)

      // Draw Arcade UI Overlays
      this.drawUI(this.ctx, w, h, triggers)
    }
  }

  return new CruisinScene()
}

export default cruisinFactory
