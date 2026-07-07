import type { BrowseNeighbor, BrowseNeighborsResult, SwipeDirection } from "./types";

export function neighborAt(
  result: BrowseNeighborsResult,
  direction: SwipeDirection,
): BrowseNeighbor | null {
  const { items, currentIndex } = result;
  if (items.length === 0) return null;

  if (currentIndex < 0) {
    return direction === "next" ? (items[0] ?? null) : null;
  }

  const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (targetIndex < 0 || targetIndex >= items.length) return null;
  return items[targetIndex] ?? null;
}

export function isAtBrowseEnd(
  result: BrowseNeighborsResult,
  direction: SwipeDirection,
): boolean {
  return neighborAt(result, direction) === null;
}
