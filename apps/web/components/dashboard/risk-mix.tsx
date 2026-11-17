import type { Band } from "@/lib/dataset/population";
import { cn } from "@/lib/utils";

const BAND_COLOR: Record<Band, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-400",
  high: "bg-rose-400",
  critical: "bg-rose-600",
};

const BAND_TEXT: Record<Band, string> = {
  low: "text-emerald-700",
  medium: "text-amber-700",
  high: "text-rose-700",
  critical: "text-rose-800",
};

/** One stacked bar instead of a donut: the proportions read exactly, not approximately. */
export function RiskMix({
  data,
  total,
}: {
  data: Array<{ band: Band; label: string; count: number }>;
  total: number;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Risk mix
        </h2>
        <span className="tnum text-[11px] text-slate-400">{total.toLocaleString()} students</span>
      </div>

      <div className="flex h-2 w-full gap-px overflow-hidden rounded-full bg-slate-100">
        {data.map((item) => (
          <div
            key={item.band}
            className={cn("h-full", BAND_COLOR[item.band])}
            style={{ width: `${(item.count / total) * 100}%` }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>

      <ul className="mt-3 space-y-1.5">
        {data.map((item) => (
          <li key={item.band} className="flex items-center gap-2 text-[12px]">
            <span className={cn("h-1.5 w-1.5 rounded-full", BAND_COLOR[item.band])} aria-hidden="true" />
            <span className="flex-1 text-slate-600">{item.label}</span>
            <span className={cn("tnum font-medium", BAND_TEXT[item.band])}>
              {item.count.toLocaleString()}
            </span>
            <span className="tnum w-10 text-right text-slate-400">
              {((item.count / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Twelve narrow columns. One accent column, the rest neutral — a trend, not a decoration. */
export function WeekBars({ data }: { data: Array<{ week: string; flagged: number }> }) {
  const max = Math.max(...data.map((d) => d.flagged));
  const last = data.length - 1;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Flagged per week
        </h2>
        <span className="text-[11px] text-slate-400">12 weeks</span>
      </div>

      <div className="flex h-16 gap-1" role="img" aria-label="Flagged students per week">
        {data.map((item, index) => (
          <div key={item.week} className="group relative h-full flex-1">
            <div
              className={cn(
                "absolute bottom-0 w-full rounded-[2px] transition-colors",
                index === last ? "bg-slate-900" : "bg-slate-200 group-hover:bg-slate-300",
              )}
              style={{ height: `${Math.max(6, (item.flagged / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>W1</span>
        <span className="tnum">peak {max}</span>
        <span>W12</span>
      </div>
    </section>
  );
}
