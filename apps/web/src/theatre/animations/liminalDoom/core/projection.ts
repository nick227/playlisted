import type { CameraPose, ProjectedPoint, Vec3, Viewport } from './types'

export type CameraSpacePoint = Vec3

export type ProjectablePolygon = {
  id: string
  points: Vec3[]
}

export type ProjectedPolygon = {
  id: string
  points: ProjectedPoint[]
  depth: number
}

export function worldToCamera(point: Vec3, camera: CameraPose): CameraSpacePoint {
  let x = point.x - camera.position.x
  let y = point.y - camera.position.y
  let z = point.z - camera.position.z

  const yawCos = Math.cos(-camera.yaw)
  const yawSin = Math.sin(-camera.yaw)
  const yawX = x * yawCos - z * yawSin
  const yawZ = x * yawSin + z * yawCos
  x = yawX
  z = yawZ

  const pitchCos = Math.cos(-camera.pitch)
  const pitchSin = Math.sin(-camera.pitch)
  const pitchY = y * pitchCos - z * pitchSin
  const pitchZ = y * pitchSin + z * pitchCos
  y = pitchY
  z = pitchZ

  const rollCos = Math.cos(-camera.roll)
  const rollSin = Math.sin(-camera.roll)
  const rollX = x * rollCos - y * rollSin
  const rollY = x * rollSin + y * rollCos

  return { x: rollX, y: rollY, z }
}

export function clipPolygonToNearPlane(points: CameraSpacePoint[], near: number): CameraSpacePoint[] {
  if (points.length < 3) {
    return []
  }

  const clipped: CameraSpacePoint[] = []

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const previous = points[(index + points.length - 1) % points.length]
    const currentInside = current.z >= near
    const previousInside = previous.z >= near

    if (currentInside !== previousInside) {
      clipped.push(intersectNearPlane(previous, current, near))
    }

    if (currentInside) {
      clipped.push(current)
    }
  }

  return clipped.length >= 3 ? clipped : []
}

export function projectCameraPoint(
  point: CameraSpacePoint,
  camera: CameraPose,
  viewport: Viewport,
): ProjectedPoint | null {
  if (point.z < camera.near) {
    return null
  }

  return {
    x: viewport.width * 0.5 + (point.x / point.z) * camera.focalLength,
    y: viewport.height * 0.5 - (point.y / point.z) * camera.focalLength,
    depth: point.z,
  }
}

export function projectWorldPoint(
  point: Vec3,
  camera: CameraPose,
  viewport: Viewport,
): ProjectedPoint | null {
  return projectCameraPoint(worldToCamera(point, camera), camera, viewport)
}

export function projectPolygon(
  polygon: ProjectablePolygon,
  camera: CameraPose,
  viewport: Viewport,
): ProjectedPolygon | null {
  const cameraPoints = polygon.points.map((point) => worldToCamera(point, camera))
  const clipped = clipPolygonToNearPlane(cameraPoints, camera.near)
  const projected = clipped
    .map((point) => projectCameraPoint(point, camera, viewport))
    .filter((point): point is ProjectedPoint => point !== null)

  if (projected.length < 3) {
    return null
  }

  return {
    id: polygon.id,
    points: projected,
    depth: averageDepth(projected),
  }
}

export function sortPolygonsBackToFront<T extends { depth: number }>(polygons: T[]) {
  return [...polygons].sort((a, b) => b.depth - a.depth)
}

function averageDepth(points: ProjectedPoint[]) {
  return points.reduce((total, point) => total + point.depth, 0) / points.length
}

function intersectNearPlane(from: CameraSpacePoint, to: CameraSpacePoint, near: number): CameraSpacePoint {
  const denominator = to.z - from.z
  const t = denominator === 0 ? 0 : (near - from.z) / denominator
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    z: near,
  }
}
