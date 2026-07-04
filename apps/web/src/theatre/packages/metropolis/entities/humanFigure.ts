export type HumanRole = 'wanderer' | 'queue' | 'rooftop'

export type HumanFigure = {
  id: number
  gx: number
  gy: number
  displayGx: number
  displayGy: number
  role: HumanRole
  dir: 0 | 1 | 2 | 3
  speed: number
  vx: number
  vy: number
  freezeMs: number
  scatterMs: number
  bob: number
  armsUp: number
  seed: number
  queueSlot: number
  anchorGx: number
  anchorGy: number
}

export type HumanDramaState = {
  figures: HumanFigure[]
  projectsGx: number
  projectsGy: number
}
