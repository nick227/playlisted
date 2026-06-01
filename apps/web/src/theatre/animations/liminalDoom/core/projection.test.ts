import { describe, expect, it } from 'vitest'

import {
  clipPolygonToNearPlane,
  projectPolygon,
  projectWorldPoint,
  sortPolygonsBackToFront,
  worldToCamera,
} from './projection'
import type { CameraPose, Viewport } from './types'

const camera: CameraPose = {
  position: { x: 0, y: 0, z: 0 },
  yaw: 0,
  pitch: 0,
  roll: 0,
  focalLength: 100,
  near: 1,
}

const viewport: Viewport = {
  width: 200,
  height: 100,
}

describe('liminal projection', () => {
  it('projects world points in front of the camera to screen space', () => {
    expect(projectWorldPoint({ x: 0, y: 0, z: 10 }, camera, viewport)).toEqual({
      x: 100,
      y: 50,
      depth: 10,
    })

    expect(projectWorldPoint({ x: 1, y: 1, z: 10 }, camera, viewport)).toEqual({
      x: 110,
      y: 40,
      depth: 10,
    })
  })

  it('clips polygons crossing the near plane', () => {
    const clipped = clipPolygonToNearPlane(
      [
        { x: -1, y: -1, z: 0.5 },
        { x: 1, y: -1, z: 2 },
        { x: 1, y: 1, z: 2 },
        { x: -1, y: 1, z: 0.5 },
      ],
      1,
    )

    expect(clipped).toHaveLength(4)
    expect(clipped.every((point) => point.z >= 1)).toBe(true)
    expect(clipped.filter((point) => point.z === 1)).toHaveLength(2)
  })

  it('returns null when a polygon is fully behind the near plane', () => {
    const projected = projectPolygon(
      {
        id: 'behind',
        points: [
          { x: -1, y: -1, z: 0.2 },
          { x: 1, y: -1, z: 0.2 },
          { x: 0, y: 1, z: 0.2 },
        ],
      },
      camera,
      viewport,
    )

    expect(projected).toBeNull()
  })

  it('sorts projected polygons back to front', () => {
    expect(
      sortPolygonsBackToFront([
        { id: 'near', depth: 2 },
        { id: 'far', depth: 8 },
        { id: 'middle', depth: 5 },
      ]).map((polygon) => polygon.id),
    ).toEqual(['far', 'middle', 'near'])
  })

  it('applies yaw rotation in camera space', () => {
    const rotated = worldToCamera(
      { x: 10, y: 0, z: 0 },
      {
        ...camera,
        yaw: Math.PI / 2,
      },
    )

    expect(rotated.x).toBeCloseTo(0, 8)
    expect(rotated.z).toBeCloseTo(-10, 8)
  })
})
