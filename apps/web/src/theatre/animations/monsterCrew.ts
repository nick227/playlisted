import { AnimationContext, IAnimation } from '../IAnimation'
import jellyBellFactory from './jellyBell'
import eyeCloudFactory from './eyeCloud'
import circuitBotFactory from './circuitBot'
import goopyFactory from './goopy'
import cuteMonstroFactory from './cuteMonstro'

type CrewMember = {
  animation: IAnimation
  layer: HTMLDivElement
}

const DEFAULT_SWITCH_MS = 9000
const DEFAULT_FADE_MS = 900

export function monsterCrewFactory(): IAnimation {
  const factories = [
    jellyBellFactory,
    eyeCloudFactory,
    circuitBotFactory,
    goopyFactory,
    cuteMonstroFactory,
  ]

  class MonsterCrew implements IAnimation {
    private members: CrewMember[] = []
    private context: AnimationContext | null = null
    private running = false
    private activeIndex = 0
    private previousIndex: number | null = null
    private lastSwitchAt = 0
    private switchMs = DEFAULT_SWITCH_MS
    private fadeMs = DEFAULT_FADE_MS

    async init(container: HTMLElement, context: AnimationContext): Promise<void> {
      this.context = context
      this.switchMs = Math.max(2500, Number(context.options?.switchMs) || DEFAULT_SWITCH_MS)
      this.fadeMs = Math.max(120, Number(context.options?.fadeMs) || DEFAULT_FADE_MS)

      for (let i = 0; i < factories.length; i++) {
        const layer = document.createElement('div')
        layer.style.position = 'absolute'
        layer.style.inset = '0'
        layer.style.opacity = i === 0 ? '1' : '0'
        layer.style.pointerEvents = 'none'
        layer.style.transition = `opacity ${this.fadeMs}ms ease`
        layer.style.zIndex = String(context.options?.zIndex ?? 101)
        container.appendChild(layer)

        const animation = factories[i]()
        await animation.init(layer, {
          ...context,
          options: {
            ...context.options,
            opacity: 1,
            zIndex: 0,
            blendMode: 'normal',
          },
        })
        animation.enableExternalDriving?.()
        await animation.start()
        this.members.push({ animation, layer })
      }
    }

    async start(): Promise<void> {
      this.running = true
      this.lastSwitchAt = this.context?.shared?.time?.elapsed ?? performance.now()
    }

    pause(): void {
      this.running = false
      for (const member of this.members) member.animation.pause()
    }

    resume(): void {
      if (this.running) return
      this.running = true
      for (const member of this.members) member.animation.resume()
      this.lastSwitchAt = this.context?.shared?.time?.elapsed ?? performance.now()
    }

    async stop(): Promise<void> {
      this.running = false
      await Promise.all(this.members.map(member => member.animation.stop().catch(() => {})))
    }

    destroy(): void {
      for (const member of this.members) {
        try { member.animation.destroy() } catch { /* ignore cleanup error */ }
        if (member.layer.parentElement) member.layer.parentElement.removeChild(member.layer)
      }
      this.members = []
      this.context = null
    }

    enableExternalDriving(): void {
      for (const member of this.members) member.animation.enableExternalDriving?.()
    }

    renderFrame(context: AnimationContext): void {
      if (!this.running || this.members.length === 0) return
      this.context = context

      const now = context.shared?.time?.elapsed ?? performance.now()
      if (now - this.lastSwitchAt >= this.switchMs) {
        this.flip(now)
      }

      const visible = new Set<number>([this.activeIndex])
      if (this.previousIndex !== null && now - this.lastSwitchAt < this.fadeMs) {
        visible.add(this.previousIndex)
      } else {
        this.previousIndex = null
      }

      for (const index of visible) {
        this.members[index]?.animation.renderFrame?.(context)
      }
    }

    private flip(now: number): void {
      if (this.members.length < 2) return

      this.previousIndex = this.activeIndex
      this.activeIndex = (this.activeIndex + 1) % this.members.length
      this.lastSwitchAt = now

      for (let i = 0; i < this.members.length; i++) {
        this.members[i].layer.style.opacity = i === this.activeIndex ? '1' : '0'
      }
    }
  }

  return new MonsterCrew()
}

export default monsterCrewFactory
