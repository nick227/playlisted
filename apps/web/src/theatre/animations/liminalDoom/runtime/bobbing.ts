import type { AudioReact, RoomPhase } from '../core/types'
import { lerp } from '../core/math'

export class CameraBobbing {
  private bobTime = 0
  private swayTime = 0
  private speedFactor = 0

  tick(dtMs: number, phase: RoomPhase, audio: AudioReact, reducedMotion: boolean) {
    let targetSpeed = 0
    if (phase === 'approach') {
      targetSpeed = 1.0 + audio.bass * 0.4
    } else if (phase === 'passage') {
      targetSpeed = 2.2 + audio.chaos * 0.8
    } else if (phase === 'threshold') {
      targetSpeed = 0.4
    } else if (phase === 'watch') {
      targetSpeed = 0.08
    }

    if (reducedMotion) targetSpeed *= 0.3
    this.speedFactor = lerp(this.speedFactor, targetSpeed, 0.1)

    this.bobTime += dtMs * (reducedMotion ? 0.003 : 0.007) * this.speedFactor
    this.swayTime += dtMs * (reducedMotion ? 0.0015 : 0.0035) * this.speedFactor
  }

  offset(reducedMotion: boolean) {
    if (this.speedFactor < 0.01) return { x: 0, y: 0 }
    return {
      x: Math.sin(this.swayTime) * (reducedMotion ? 1.5 : 6) * this.speedFactor,
      y: Math.abs(Math.cos(this.bobTime)) * -(reducedMotion ? 1.2 : 5) * this.speedFactor,
    }
  }
}
