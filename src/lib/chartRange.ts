export type ChartRange = "7d" | "30d" | "all";

export function rangeToDate(range: ChartRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
  return d;
}
