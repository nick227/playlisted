import theatreController from './controller/lazyController'
import type { TheatreTrackContext } from './rotation/types'

export function toTheatreTrackContext(recordingId: string | null | undefined): TheatreTrackContext | null {
  const id = recordingId?.trim()
  if (!id) return null
  return { segmentId: id, trackId: id }
}

/** Bind theatre visual picks to the active recording immediately (not on the next React effect). */
export function syncTheatreTrackContext(recordingId: string | null | undefined): void {
  theatreController.setTrackContext(toTheatreTrackContext(recordingId))
}
