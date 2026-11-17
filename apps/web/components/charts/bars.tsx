import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
}

export function BarSeries({
  data,
  className,
  color = "rgb(99 102 241)",
  suffix,
}: {
  data: BarDatum[];
  className?: string;
  color?: string;
  suffix?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className={cn("space-y-3", className)}>
      {data.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-slate-600">{item.label}</span>
            <span className="tnum font-medium text-slate-900">
              {item.value}
              {suffix ? <span className="ml-0.5 text-slate-400">{suffix}</span> : null}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (item.value / max) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

