import type AnimationBridge from './AnimationBridge'
import { theatreBreadcrumb } from './theatreBreadcrumbs'

type DeckInvariantSnapshot = {
  label: string
  activePresetId: string | null
  nextPresetId: string | null
  transitioning: boolean
  layerCount: number
  activeInstanceCount: number
  nextInstanceCount: number
}

export function assertTheatreDeckInvariants(
  label: string,
  container: HTMLElement,
  activeBridge: AnimationBridge | null,
  nextBridge: AnimationBridge | null,
  activePresetId: string | null,
  nextPresetId: string | null,
  transitioning: boolean,
): void {
  const layerCount = container.children.length
  const activeInstanceCount = activeBridge?.getInstances().length ?? 0
  const nextInstanceCount = nextBridge?.getInstances().length ?? 0

  const snapshot: DeckInvariantSnapshot = {
    label,
    activePresetId,
    nextPresetId,
    transitioning,
    layerCount,
    activeInstanceCount,
    nextInstanceCount,
  }

  const violations: string[] = []

  if (!activeBridge && activePresetId) {
    violations.push('activePresetId set without activeBridge')
  }
  if (!nextBridge && nextPresetId) {
    violations.push('nextPresetId set without nextBridge')
  }
  if (activeBridge && activeInstanceCount === 0) {
    violations.push('activeBridge has zero instances')
  }
  if (nextBridge && nextInstanceCount === 0) {
    violations.push('nextBridge has zero instances')
  }
  // Idle preloaded next scene is valid: nextBridge + nextPresetId while not transitioning.
  if (!transitioning && nextBridge && !nextPresetId) {
    violations.push('nextBridge present without nextPresetId while not transitioning')
  }
  if (layerCount > 2) {
    violations.push(`container has ${layerCount} layers (expected <= 2)`)
  }
  if (transitioning && layerCount > 2) {
    violations.push(`transitioning with ${layerCount} layers`)
  }

  if (violations.length === 0) return

  theatreBreadcrumb('invariant:violation', {
    presetId: activePresetId ?? undefined,
    detail: `${label}: ${violations.join('; ')} | ${JSON.stringify(snapshot)}`,
  })

  if (import.meta.env.DEV) {
    console.warn('[Theatre] Deck invariant violation:', snapshot, violations)
  }
}
