const quarantinedPresetIds = new Set<string>()

export function isDevQuarantineEnabled(): boolean {
  return Boolean(import.meta.env.DEV)
}

export function isPresetQuarantined(presetId: string): boolean {
  return isDevQuarantineEnabled() && quarantinedPresetIds.has(presetId)
}

export function quarantinePreset(presetId: string): void {
  if (!isDevQuarantineEnabled()) return
  quarantinedPresetIds.add(presetId)
}

export function getQuarantinedPresetIds(): string[] {
  return [...quarantinedPresetIds]
}
