import type { DanceOption } from '../sequences'

export type DanceSelectorCircle = DanceOption & {
  x: number
  y: number
  radius: number
}

export type DanceSelectorCheckbox = {
  x: number
  y: number
  size: number
}

function metrics(width: number, options: DanceOption[]) {
  const gap = width < 480 ? 4 : 6
  const maxRadius = width < 480 ? 8 : 10
  const checkboxSize = width < 480 ? 13 : 15
  const available = Math.max(120, width - 28 - checkboxSize - gap * 2)
  const fittedRadius = (available - Math.max(0, options.length - 1) * gap) / Math.max(1, options.length * 2)
  const radius = Math.max(5.5, Math.min(maxRadius, fittedRadius))
  return { gap, radius, checkboxSize }
}

export function layoutDanceSelector(width: number, height: number, options: DanceOption[]): DanceSelectorCircle[] {
  const { gap, radius, checkboxSize } = metrics(width, options)
  const buttonWidth = options.length * radius * 2 + Math.max(0, options.length - 1) * gap
  const totalWidth = checkboxSize + gap * 2 + buttonWidth
  const startX = width * 0.5 - totalWidth * 0.5 + checkboxSize + gap * 2 + radius
  const y = height - Math.max(18, radius + 8)
  return options.map((option, index) => ({
    ...option,
    x: startX + index * (radius * 2 + gap),
    y,
    radius,
  }))
}

export function layoutAutoDanceCheckbox(width: number, height: number, options: DanceOption[]): DanceSelectorCheckbox {
  const { gap, radius, checkboxSize } = metrics(width, options)
  const buttonWidth = options.length * radius * 2 + Math.max(0, options.length - 1) * gap
  const totalWidth = checkboxSize + gap * 2 + buttonWidth
  return {
    x: width * 0.5 - totalWidth * 0.5 + checkboxSize * 0.5,
    y: height - Math.max(18, radius + 8),
    size: checkboxSize,
  }
}

export function hitDanceSelector(
  width: number,
  height: number,
  options: DanceOption[],
  x: number,
  y: number,
): DanceOption | null {
  for (const circle of layoutDanceSelector(width, height, options)) {
    const dx = x - circle.x
    const dy = y - circle.y
    if (dx * dx + dy * dy <= circle.radius * circle.radius) return circle
  }
  return null
}

export function hitAutoDanceCheckbox(
  width: number,
  height: number,
  options: DanceOption[],
  x: number,
  y: number,
): boolean {
  const box = layoutAutoDanceCheckbox(width, height, options)
  const half = box.size * 0.5 + 3
  return x >= box.x - half && x <= box.x + half && y >= box.y - half && y <= box.y + half
}
