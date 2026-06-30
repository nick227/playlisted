import { AnimationContext, IAnimation } from '../core/IAnimation'
import CanvasAnimation from '../core/CanvasAnimation'

export function rampageFactory(): IAnimation {
  class RampageScene extends CanvasAnimation {
    private buildings: { x: number; w: number; h: number; windows: { broken: boolean }[]; punchTimer: number }[] = []
    private monsters: { x: number; y: number; type: number; punchState: number; punchTimer: number; targetBuilding: number; offset: number }[] = []
    private cars: { x: number; speed: number; yOffset: number; type: number }[] = []
    private planes: { x: number; y: number; speed: number; phase: number }[] = []
    private stars: { x: number; y: number; s: number }[] = []
    private debris: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = []

    constructor() {
      super({ useEffects: false, defaultZIndex: 100 })
      this.initScene()
    }

    private initScene() {
      // 5 buildings
      for (let i = 0; i < 5; i++) {
        const windows = Array.from({ length: 24 }, () => ({ broken: false }))
        this.buildings.push({
          x: 0,
          w: 0,
          h: 0,
          windows,
          punchTimer: 0,
        })
      }
      
      // 3 monsters (George, Lizzie, Ralph clones)
      for (let i = 0; i < 3; i++) {
        this.monsters.push({
          x: 0,
          y: 0,
          type: i, // 0: Ape, 1: Lizard, 2: Wolf
          punchState: 0,
          punchTimer: 0,
          targetBuilding: i * 2, // Spaced out
          offset: Math.random() * 1000
        })
      }

      // Cars
      for (let i = 0; i < 4; i++) {
        this.cars.push({
          x: Math.random() * 2000,
          speed: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2),
          yOffset: Math.random() * 10,
          type: Math.floor(Math.random() * 3)
        })
      }

      // Planes
      for (let i = 0; i < 2; i++) {
        this.planes.push({
          x: Math.random() * 2000,
          y: 40 + Math.random() * 60,
          speed: (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 3),
          phase: Math.random() * 100
        })
      }

      // Stars
      for (let i = 0; i < 50; i++) {
        this.stars.push({
          x: Math.random() * 2000,
          y: Math.random() * 400,
          s: 1 + Math.random() * 2
        })
      }
    }

    protected draw(context: AnimationContext) {
      const w = this.cssWidth
      const h = this.cssHeight
      if (w === 0 || h === 0) return

      const pixelSize = Math.max(2, Math.floor(h / 200)) // Scale based on height
      
      // Audio reaction
      const triggers = context.shared?.getTriggers?.(context.options?.preset as string) || {
        bassHit: false,
        beat: false,
        energy: 0
      }
      
      const now = context.shared?.time?.elapsed ?? performance.now()

      // Layout calculations
      const groundY = h - 40 * pixelSize
      const buildingWidth = 30 * pixelSize
      const spacing = (w - (this.buildings.length * buildingWidth)) / (this.buildings.length + 1)
      
      this.buildings.forEach((b, i) => {
        b.x = spacing + i * (buildingWidth + spacing)
        b.w = buildingWidth
        b.h = 100 * pixelSize + (i % 3) * 20 * pixelSize
      })

      // Audio reactive logic
      if (triggers.bassHit || triggers.beat) {
        // Pick a random monster to punch
        const m = this.monsters[Math.floor(Math.random() * this.monsters.length)]
        if (m.punchTimer <= 0) {
          m.punchState = 1
          m.punchTimer = 20 // frames roughly
          const targetB = this.buildings[m.targetBuilding]
          if (targetB) {
            targetB.punchTimer = 10 // shake effect
            // Break a random window
            const unbroken = targetB.windows.map((w, i) => ({w, i})).filter(x => !x.w.broken)
            if (unbroken.length > 0) {
              const targetWin = unbroken[Math.floor(Math.random() * unbroken.length)]
              targetWin.w.broken = true
              
              // Spawn debris
              const cols = 3
              const rows = 8
              const winW = 4 * pixelSize
              const winH = 6 * pixelSize
              const gapX = (targetB.w - (cols * winW)) / (cols + 1)
              const gapY = (targetB.h - (rows * winH)) / (rows + 1)
              const r = Math.floor(targetWin.i / cols)
              const c = targetWin.i % cols
              const wx = targetB.x + gapX + c * (winW + gapX)
              const wy = groundY - targetB.h + gapY + r * (winH + gapY)
              
              for(let d = 0; d < 5; d++) {
                this.debris.push({
                  x: wx + Math.random() * winW,
                  y: wy + Math.random() * winH,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -Math.random() * 4,
                  life: 1.0,
                  color: Math.random() > 0.5 ? '#999999' : '#ffffff'
                })
              }
            } else {
              // Reset windows if all broken
              targetB.windows.forEach(w => w.broken = false)
            }
          }
        }
      }

      // Update cars
      this.cars.forEach(car => {
        car.x += car.speed * (now > 0 ? 1 : 1) // simple time delta integration approximated
        if (car.speed > 0 && car.x > w + 100) car.x = -100
        if (car.speed < 0 && car.x < -100) car.x = w + 100
      })

      // Update planes
      this.planes.forEach(plane => {
        plane.x += plane.speed
        if (plane.speed > 0 && plane.x > w + 200) plane.x = -200
        if (plane.speed < 0 && plane.x < -200) plane.x = w + 200
      })

      // Update monsters
      this.monsters.forEach((m, i) => {
        if (m.punchTimer > 0) {
          m.punchTimer--
        } else {
          m.punchState = 0
        }
        
        const b = this.buildings[m.targetBuilding]
        if (b) {
          const side = i % 2 === 0 ? -1 : 1
          m.x = b.x + (side === -1 ? -10 * pixelSize : b.w)
          m.y = groundY - b.h + 20 * pixelSize + Math.sin((now + m.offset) / 300) * 10 * pixelSize
        }
      })

      // Rendering logic
      
      // Clear sky
      this.ctx.fillStyle = '#0a0a1a'
      this.ctx.fillRect(0, 0, w, h)

      // Stars
      this.ctx.fillStyle = '#ffffff'
      this.stars.forEach(s => {
        // Simple twinkle
        const twinkle = Math.abs(Math.sin((now + s.x) / 500))
        this.ctx.globalAlpha = 0.2 + twinkle * 0.8
        this.ctx.fillRect(s.x % w, s.y % (h * 0.6), s.s * pixelSize, s.s * pixelSize)
      })
      this.ctx.globalAlpha = 1.0

      // Moon
      this.ctx.fillStyle = '#e0e0d0'
      this.ctx.fillRect(w * 0.8, h * 0.1, 15 * pixelSize, 15 * pixelSize)

      // Background silhouette skyline
      this.ctx.fillStyle = '#05050a'
      this.ctx.fillRect(0, groundY - 80 * pixelSize, w, 80 * pixelSize)
      
      // Draw planes
      this.planes.forEach(p => {
        this.ctx.fillStyle = '#3a4a3a'
        const dir = p.speed > 0 ? 1 : -1
        this.ctx.fillRect(p.x, p.y + Math.sin(now/200 + p.phase)*10, 12 * pixelSize * dir, 4 * pixelSize)
        this.ctx.fillRect(p.x + 4 * pixelSize * dir, p.y + Math.sin(now/200 + p.phase)*10 - 2 * pixelSize, 4 * pixelSize, 2 * pixelSize)
      })

      // Draw buildings
      this.buildings.forEach((b, i) => {
        const shakeX = b.punchTimer > 0 ? (Math.random() - 0.5) * 8 * (b.punchTimer / 10) : 0
        const bx = b.x + shakeX
        if (b.punchTimer > 0) b.punchTimer--

        const bColor = ['#5a5a5a', '#6b5c4f', '#4f5c6b', '#6b6b4f', '#6b4f4f'][i % 5]
        this.ctx.fillStyle = bColor
        this.ctx.fillRect(bx, groundY - b.h, b.w, b.h)
        
        // Roof
        this.ctx.fillStyle = '#333'
        this.ctx.fillRect(bx - 2 * pixelSize, groundY - b.h - 4 * pixelSize, b.w + 4 * pixelSize, 4 * pixelSize)

        // Windows
        const cols = 3
        const rows = 8
        const winW = 4 * pixelSize
        const winH = 6 * pixelSize
        const gapX = (b.w - (cols * winW)) / (cols + 1)
        const gapY = (b.h - (rows * winH)) / (rows + 1)

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const winIdx = r * cols + c
            const broken = b.windows[winIdx % b.windows.length].broken
            const wx = bx + gapX + c * (winW + gapX)
            const wy = groundY - b.h + gapY + r * (winH + gapY)
            
            if (broken) {
              this.ctx.fillStyle = '#000000'
              // Draw broken shape
              this.ctx.fillRect(wx, wy, winW, winH)
              this.ctx.fillStyle = bColor
              this.ctx.fillRect(wx + winW/2, wy, winW/2, winH/2) // partial break
            } else {
              this.ctx.fillStyle = Math.random() > 0.95 ? '#000000' : '#d0e0ff' // some lights off
              this.ctx.fillRect(wx, wy, winW, winH)
            }
          }
        }
      })

      // Draw monsters
      this.monsters.forEach((m, i) => {
        const dir = i % 2 === 0 ? 1 : -1 // facing 1=right, -1=left
        
        const mColors = ['#a0522d', '#2e8b57', '#696969'] // Ape, Lizard, Wolf
        const bellyColors = ['#d2b48c', '#3cb371', '#d3d3d3']
        const color = mColors[m.type]
        const bellyColor = bellyColors[m.type]
        
        // Breathing effect
        const breath = Math.sin((now + m.offset) / 200) * pixelSize
        const breathW = Math.max(0, breath * 0.5)
        
        // Punch kinetics
        let punchExtend = 0
        let armLift = 0
        if (m.punchTimer > 15) {
          punchExtend = -2 * pixelSize
          armLift = -4 * pixelSize
        } else if (m.punchTimer > 5) {
          punchExtend = 8 * pixelSize
          armLift = 2 * pixelSize
        } else if (m.punchTimer > 0) {
          punchExtend = 4 * pixelSize
          armLift = 0
        }

        this.ctx.save()
        const frontX = dir === 1 ? m.x + 10 * pixelSize : m.x
        this.ctx.translate(frontX, m.y)
        this.ctx.scale(dir, 1)

        const bodyX = -10 * pixelSize - breathW/2
        const bodyY = -Math.max(0, breath)
        const bodyW = 10 * pixelSize + breathW
        const bodyH = 14 * pixelSize + Math.max(0, breath)
        
        this.ctx.fillStyle = color

        if (m.type === 0) { // Ape
          // Broader shoulders
          this.ctx.fillRect(bodyX - 2*pixelSize, bodyY, bodyW + 4*pixelSize, 6*pixelSize)
          this.ctx.fillRect(bodyX, bodyY + 6*pixelSize, bodyW, bodyH - 6*pixelSize)
          // Head, somewhat sunk into shoulders
          const headY = bodyY - 4 * pixelSize
          this.ctx.fillRect(-10 * pixelSize, headY, 8 * pixelSize, 6 * pixelSize)
          // Jaw/snout
          this.ctx.fillStyle = bellyColor
          this.ctx.fillRect(-4 * pixelSize, headY + 4 * pixelSize, 6 * pixelSize, 4 * pixelSize)
          // Eyes
          this.ctx.fillStyle = m.punchTimer > 5 ? '#ff0000' : '#ffffff'
          this.ctx.fillRect(-5 * pixelSize, headY + 1 * pixelSize, 2 * pixelSize, 2 * pixelSize)
          if (m.punchTimer <= 5) {
            this.ctx.fillStyle = '#000000'
            this.ctx.fillRect(-4 * pixelSize, headY + 1 * pixelSize, 1 * pixelSize, 1 * pixelSize)
          }
          // Belly
          this.ctx.fillStyle = bellyColor
          this.ctx.fillRect(bodyX + 6 * pixelSize, bodyY + 4 * pixelSize, 4 * pixelSize, 8 * pixelSize)
          // Arm
          this.ctx.fillStyle = color
          const armY = bodyY + 2 * pixelSize + armLift
          if (m.punchState === 1 && m.punchTimer > 0) {
            this.ctx.fillRect(-6 * pixelSize, armY, 8 * pixelSize + punchExtend, 6 * pixelSize)
            this.ctx.fillRect(-6 * pixelSize + 8 * pixelSize + punchExtend, armY - 2 * pixelSize, 6 * pixelSize, 8 * pixelSize) // Massive fist
          } else {
            this.ctx.fillRect(-4 * pixelSize, armY, 4 * pixelSize, 10 * pixelSize)
            this.ctx.fillRect(-5 * pixelSize, armY + 10 * pixelSize, 6 * pixelSize, 6 * pixelSize) // Massive fist
          }
        } 
        else if (m.type === 1) { // Lizard
          // Tail
          this.ctx.fillRect(-20 * pixelSize, 6 * pixelSize, 10 * pixelSize, 6 * pixelSize)
          // Spikes on back and tail
          this.ctx.fillStyle = '#adff2f'
          for (let s = 0; s < 4; s++) {
            this.ctx.fillRect(-16 * pixelSize + s*4 * pixelSize, (s*2) * pixelSize, 2 * pixelSize, 2 * pixelSize)
          }
          this.ctx.fillStyle = color
          // Body
          this.ctx.fillRect(bodyX, bodyY, bodyW, bodyH)
          // Head (slanted snout)
          const headY = bodyY - 6 * pixelSize
          this.ctx.fillRect(-8 * pixelSize, headY, 10 * pixelSize, 6 * pixelSize)
          this.ctx.fillRect(2 * pixelSize, headY + 2 * pixelSize, 6 * pixelSize, 4 * pixelSize) // Snout extends past front!
          // Teeth
          this.ctx.fillStyle = '#ffffff'
          this.ctx.fillRect(2 * pixelSize, headY + 6 * pixelSize, 4 * pixelSize, 1 * pixelSize)
          // Eyes
          this.ctx.fillStyle = m.punchTimer > 5 ? '#ff0000' : '#ffff00' // Yellow eyes
          this.ctx.fillRect(-2 * pixelSize, headY + 2 * pixelSize, 2 * pixelSize, 2 * pixelSize)
          if (m.punchTimer <= 5) { // slit pupil
            this.ctx.fillStyle = '#000000'
            this.ctx.fillRect(-1 * pixelSize, headY + 2 * pixelSize, 1 * pixelSize, 2 * pixelSize)
          }
          // Belly
          this.ctx.fillStyle = bellyColor
          this.ctx.fillRect(bodyX + 6 * pixelSize, bodyY + 2 * pixelSize, 4 * pixelSize, 12 * pixelSize)
          // Arm
          this.ctx.fillStyle = color
          const armY = bodyY + 2 * pixelSize + armLift
          if (m.punchState === 1 && m.punchTimer > 0) {
            this.ctx.fillRect(-6 * pixelSize, armY, 8 * pixelSize + punchExtend, 4 * pixelSize)
            this.ctx.fillRect(-6 * pixelSize + 8 * pixelSize + punchExtend, armY - 1 * pixelSize, 4 * pixelSize, 6 * pixelSize)
          } else {
            this.ctx.fillRect(-6 * pixelSize, armY, 4 * pixelSize, 8 * pixelSize)
            this.ctx.fillRect(-6 * pixelSize, armY + 8 * pixelSize, 5 * pixelSize, 4 * pixelSize)
          }
        } 
        else if (m.type === 2) { // Wolf
          // Fluffy Tail
          this.ctx.fillRect(-16 * pixelSize, 4 * pixelSize, 6 * pixelSize, 8 * pixelSize)
          // Body
          this.ctx.fillRect(bodyX, bodyY, bodyW, bodyH)
          // Fur ruff on chest
          this.ctx.fillStyle = '#b0c4de'
          this.ctx.fillRect(bodyX - 1*pixelSize, bodyY, bodyW + 2*pixelSize, 4*pixelSize)
          // Head
          this.ctx.fillStyle = color
          const headY = bodyY - 8 * pixelSize
          this.ctx.fillRect(-8 * pixelSize, headY, 8 * pixelSize, 8 * pixelSize)
          // Snout
          this.ctx.fillRect(0, headY + 4 * pixelSize, 6 * pixelSize, 4 * pixelSize)
          // Nose
          this.ctx.fillStyle = '#000000'
          this.ctx.fillRect(5 * pixelSize, headY + 4 * pixelSize, 1 * pixelSize, 1 * pixelSize)
          // Ears
          this.ctx.fillStyle = color
          this.ctx.fillRect(-8 * pixelSize, headY - 4 * pixelSize, 2 * pixelSize, 4 * pixelSize)
          this.ctx.fillRect(-4 * pixelSize, headY - 3 * pixelSize, 2 * pixelSize, 3 * pixelSize)
          // Eyes
          this.ctx.fillStyle = m.punchTimer > 5 ? '#ff0000' : '#ffffff'
          this.ctx.fillRect(-4 * pixelSize, headY + 3 * pixelSize, 2 * pixelSize, 2 * pixelSize)
          if (m.punchTimer <= 5) {
            this.ctx.fillStyle = '#000000'
            this.ctx.fillRect(-3 * pixelSize, headY + 3 * pixelSize, 1 * pixelSize, 1 * pixelSize)
          }
          // Belly
          this.ctx.fillStyle = bellyColor
          this.ctx.fillRect(bodyX + 6 * pixelSize, bodyY + 4 * pixelSize, 4 * pixelSize, 10 * pixelSize)
          // Arm
          this.ctx.fillStyle = color
          const armY = bodyY + 2 * pixelSize + armLift
          if (m.punchState === 1 && m.punchTimer > 0) {
            this.ctx.fillRect(-6 * pixelSize, armY, 8 * pixelSize + punchExtend, 4 * pixelSize)
            this.ctx.fillRect(-6 * pixelSize + 8 * pixelSize + punchExtend, armY - 1 * pixelSize, 4 * pixelSize, 6 * pixelSize)
          } else {
            this.ctx.fillRect(-6 * pixelSize, armY, 4 * pixelSize, 8 * pixelSize)
            this.ctx.fillRect(-6 * pixelSize, armY + 8 * pixelSize, 5 * pixelSize, 4 * pixelSize)
          }
        }
        
        // Legs (common logic since body base is similar, just match color)
        this.ctx.fillStyle = color
        const walkBounce = Math.abs(Math.sin((now + m.offset) / 100))
        this.ctx.fillRect(-9 * pixelSize, 14 * pixelSize, 3 * pixelSize, 4 * pixelSize - walkBounce * pixelSize)
        this.ctx.fillRect(-4 * pixelSize, 14 * pixelSize, 3 * pixelSize, 4 * pixelSize + walkBounce * pixelSize)

        this.ctx.restore()
      })

      // Update & Draw Debris
      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i]
        d.vy += 0.2 // gravity
        d.x += d.vx
        d.y += d.vy
        d.life -= 0.02
        if (d.life <= 0 || d.y > groundY) {
          this.debris.splice(i, 1)
          continue
        }
        this.ctx.fillStyle = d.color
        this.ctx.globalAlpha = d.life
        this.ctx.fillRect(d.x, d.y, 2 * pixelSize, 2 * pixelSize)
      }
      this.ctx.globalAlpha = 1.0

      // Ground/Street
      this.ctx.fillStyle = '#222'
      this.ctx.fillRect(0, groundY, w, h - groundY)
      
      // Street lines
      this.ctx.fillStyle = '#ddaa00'
      for (let lx = (now * -0.05) % (20 * pixelSize); lx < w; lx += 20 * pixelSize) {
        this.ctx.fillRect(lx, groundY + 18 * pixelSize, 10 * pixelSize, 2 * pixelSize)
      }

      // Cars
      this.cars.forEach(car => {
        const carColors = ['#cc2222', '#2222cc', '#eeeeee']
        this.ctx.fillStyle = carColors[car.type]
        const cy = groundY + car.yOffset * pixelSize
        const dir = car.speed > 0 ? 1 : -1
        
        // Car body
        this.ctx.fillRect(car.x, cy, 12 * pixelSize, 4 * pixelSize)
        // Cabin
        this.ctx.fillRect(car.x + (dir === 1 ? 2 : 4) * pixelSize, cy - 3 * pixelSize, 6 * pixelSize, 3 * pixelSize)
        
        // Wheels
        this.ctx.fillStyle = '#111'
        this.ctx.fillRect(car.x + 1 * pixelSize, cy + 4 * pixelSize, 3 * pixelSize, 3 * pixelSize)
        this.ctx.fillRect(car.x + 8 * pixelSize, cy + 4 * pixelSize, 3 * pixelSize, 3 * pixelSize)
      })

    }
  }

  return new RampageScene()
}

export default rampageFactory
