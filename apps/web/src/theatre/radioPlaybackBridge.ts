type RadioPlaybackListener = (playing: boolean) => void

let radioPlaying = false
const listeners = new Set<RadioPlaybackListener>()

export function getRadioPlaybackActive() {
  return radioPlaying
}

export function setRadioPlaybackActive(playing: boolean) {
  if (radioPlaying === playing) return
  radioPlaying = playing
  listeners.forEach(listener => listener(playing))
}

export function subscribeRadioPlayback(listener: RadioPlaybackListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
