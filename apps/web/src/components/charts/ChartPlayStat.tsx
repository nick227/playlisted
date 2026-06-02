import { Play } from "lucide-react";

import { formatPlayCount } from "@/lib/format";

export function ChartPlayStat({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Play size={12} className="opacity-70" aria-hidden />
      {formatPlayCount(count)}
    </span>
  );
}
