import { cn } from "@/lib/utils";

/**
 * Rounded column chart. Older weeks are hatched, recent weeks are solid,
 * and the latest week carries a value bubble — a small nod to the reference
 * design without inventing a second chart type.
 */
export function AnalyticsBars({
  data,
  className,
}: {
  data: Array<{ label: string; value: number }>;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const last = data.length - 1;

  return (
    <div className={cn("flex h-[190px] items-end gap-2.5", className)}>
      {data.map((item, index) => {
        const solid = index >= last - 2;
        return (
          <div key={item.label} className="group relative flex h-full flex-1 flex-col justify-end">
            {index === last ? (
              <span className="absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-semibold text-ink shadow-sm">
                {item.value}
              </span>
            ) : null}
            <div
              className={cn(
                "w-full rounded-full transition-all",
                solid ? "bg-brand-600" : "hatch bg-brand-50",
              )}
              style={{ height: `${Math.max(12, (item.value / max) * 100)}%` }}
              title={`${item.label}: ${item.value}`}
            />
          </div>
        );
      })}
    </div>
  );
}

export function BarLabels({ labels }: { labels: string[] }) {
  return (
    <div className="mt-3 flex gap-2.5">
      {labels.map((label) => (
        <span key={label} className="flex-1 text-center text-[10.5px] text-ink-soft">
          {label}
        </span>
      ))}
    </div>
  );
}
