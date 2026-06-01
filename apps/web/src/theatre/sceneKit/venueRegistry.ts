import type { VenueSceneDef } from './types'

const venues = new Map<string, VenueSceneDef>()

export function registerVenue(def: VenueSceneDef) {
  venues.set(def.id, def)
}

export function getVenue(id: string): VenueSceneDef | undefined {
  return venues.get(id)
}

export function listVenues(): VenueSceneDef[] {
  return Array.from(venues.values())
}
