import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface Metric {
  label: string;
  value: string;
  note: string;
  delta?: { value: string; direction: "up" | "down"; good: boolean };
}

/**
 * A single rule-separated strip rather than four floating cards.
 * Deliberately no shadows, no icons, no sparklines — the numbers carry it.
 */
export function MetricStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <dl className="grid grid-cols-2 border-y border-slate-200 md:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={metric.label}
          className={cn(
            "px-0 py-4 md:px-5",
            index > 0 && "md:border-l md:border-slate-200",
            index % 2 === 1 && "border-l border-slate-200 pl-4 md:pl-5",
            index === 2 && "border-t border-slate-200 pt-4 md:border-t-0 md:pt-4",
            index === 3 && "border-t border-slate-200 pt-4 md:border-t-0 md:pt-4",
            index === 0 && "md:pl-0",
          )}
        >
          <dt className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-slate-400">
            {metric.label}
          </dt>
          <dd className="mt-1.5 flex items-baseline gap-2">
            <span className="tnum text-[26px] font-semibold leading-none tracking-[-0.02em] text-slate-900">
              {metric.value}
            </span>
            {metric.delta ? (
              <span
                className={cn(
                  "tnum text-[11px] font-medium",
                  metric.delta.good ? "text-emerald-600" : "text-rose-600",
                )}
              >
                {metric.delta.direction === "up" ? "▲" : "▼"} {metric.delta.value}
              </span>
            ) : null}
          </dd>
          <dd className="mt-1.5 text-[11.5px] leading-snug text-slate-500">{metric.note}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {children}
      </h2>
      {action}
    </div>
  );
}
