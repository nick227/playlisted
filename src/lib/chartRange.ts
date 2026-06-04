export type ChartRange = "today" | "7d" | "30d" | "all";

export function rangeToDate(range: ChartRange): Date | null {
  if (range === "all") return null;
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date();
  d.setDate(d.getDate() - (range === "7d" ? 7 : 30));
  return d;
}
