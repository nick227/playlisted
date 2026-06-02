export type PoseDef = {
  id?: string
  durationMs?: number
}

export type StateDef = {
  id: string
  poses?: PoseDef[]
  stemPoses?: number
  durationMs?: number
  next?: string | ((ctx: { features?: any; triggers?: any }) => string | null)
}

export type Script = {
  id: string
  states: StateDef[]
  poseHoldMs?: number
  stemHoldMs?: number
}

export type RunnerOutput = {
  state: string
  stateIndex: number
  poseIndex: number
  stemIndex: number
  stateElapsed: number
  /** 0–1 fraction of states visited so far (assumes roughly linear progression). */
  progress: number
  /** Stable per-state random seed for deterministic visual variation (noise, debris, rain offsets). */
  noiseSeed: number
}

export type ScriptRunnerSnapshot = {
  scriptId: string
  stateIndex: number
  stateElapsed: number
  poseSeed: number
}

export class ScriptRunner {
  private script: Script
  private stateIndex = 0
  private stateStart = 0
  private poseSeed = 0
  private listeners: Array<(out: RunnerOutput) => void> = []
  private lastOutput: RunnerOutput | null = null
  private overrides: Partial<Pick<Script, 'poseHoldMs' | 'stemHoldMs'>> = {}

  constructor(script: Script) {
    this.script = script
    this.poseSeed = Math.floor(Math.random() * 10000)
  }

  reset(now = performance.now()) {
    this.stateIndex = 0
    this.stateStart = now
  }

  restart(now = performance.now()) {
    this.reset(now)
    this.emitIfChanged(now)
  }

  setOverrides(overrides: Partial<Pick<Script, 'poseHoldMs' | 'stemHoldMs'>>) {
    this.overrides = { ...(this.overrides || {}), ...(overrides || {}) }
  }

  onStateChange(cb: (out: RunnerOutput) => void) {
    this.listeners.push(cb)
    return () => {
      const i = this.listeners.indexOf(cb)
      if (i >= 0) this.listeners.splice(i, 1)
    }
  }

  getState(): RunnerOutput | null {
    return this.lastOutput
  }

  getSnapshot(now = performance.now()): ScriptRunnerSnapshot {
    return {
      scriptId: this.script.id,
      stateIndex: this.stateIndex,
      stateElapsed: Math.max(0, now - this.stateStart),
      poseSeed: this.poseSeed,
    }
  }

  restoreSnapshot(snapshot: ScriptRunnerSnapshot, now = performance.now()) {
    if (snapshot.scriptId !== this.script.id) return false
    if (snapshot.stateIndex < 0 || snapshot.stateIndex >= this.script.states.length) return false

    this.stateIndex = snapshot.stateIndex
    this.stateStart = now - Math.max(0, snapshot.stateElapsed)
    this.poseSeed = snapshot.poseSeed
    this.lastOutput = null
    return true
  }

  private emitIfChanged(now: number, features?: any, triggers?: any, reducedMotion = false) {
    const out = this.update(now, features, triggers, reducedMotion)
    const lastId = this.lastOutput?.state || null
    if (out.state !== lastId) {
      for (const l of this.listeners) {
        try { l(out) } catch { /* swallow listener errors */ }
      }
    }
    this.lastOutput = out
    return out
  }

  update(now: number, features?: any, triggers?: any, _reducedMotion = false): RunnerOutput {
    if (!this.script || !this.script.states || this.script.states.length === 0) {
      return { state: 'idle', stateIndex: 0, poseIndex: 0, stemIndex: 0, stateElapsed: 0, progress: 0, noiseSeed: 0 }
    }

    if (!this.stateStart) this.stateStart = now

    const current = this.script.states[this.stateIndex]
    const elapsed = now - this.stateStart

    const resolveNext = (): string | null => {
      if (!current.next) return null
      if (typeof current.next === 'string') return current.next
      try {
        return (current.next as any)({ features, triggers }) || null
      } catch {
        return null
      }
    }

    if (current.durationMs && elapsed >= current.durationMs) {
      const candidate = resolveNext()
      if (candidate) {
        const idx = this.script.states.findIndex(s => s.id === candidate)
        if (idx >= 0) {
          this.stateIndex = idx
          this.stateStart = now
        }
      } else {
        this.stateIndex = (this.stateIndex + 1) % this.script.states.length
        this.stateStart = now
      }
    } else if (current.next && typeof current.next === 'function') {
      const candidate = resolveNext()
      if (candidate) {
        const idx = this.script.states.findIndex(s => s.id === candidate)
        if (idx >= 0 && idx !== this.stateIndex) {
          this.stateIndex = idx
          this.stateStart = now
        }
      }
    }

    const state = this.script.states[this.stateIndex]
    const stateElapsed = now - this.stateStart

    const poseHold = this.overrides.poseHoldMs ?? this.script.poseHoldMs ?? 200
    const stemHold = this.overrides.stemHoldMs ?? this.script.stemHoldMs ?? 160
    const poseIndex = state.poses && state.poses.length > 0
      ? Math.floor((stateElapsed / poseHold) % state.poses.length)
      : 0
    const stemIndex = state.stemPoses ? Math.floor((stateElapsed / stemHold) % state.stemPoses) : 0

    const progress = Math.min(1, (this.stateIndex + 1) / this.script.states.length)
    const noiseSeed = (Math.abs(Math.sin(this.poseSeed + this.stateIndex * 13)) * 10000) | 0

    return { state: state.id, stateIndex: this.stateIndex, poseIndex, stemIndex, stateElapsed, progress, noiseSeed }
  }
}
