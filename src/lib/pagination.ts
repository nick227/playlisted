export function parsePositivePage(raw: unknown, fallback = 1): number {
  const parsed = Number(raw ?? fallback);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
}

export function parsePageSize(raw: unknown, fallback: number, max: number): number {
  const parsed = Number(raw ?? fallback);
  const value = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
  return Math.min(max, value);
}
