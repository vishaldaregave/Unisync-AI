import { Info } from "lucide-react";

import { ProvenanceBadge } from "@/components/domain/provenance-badge";
import type { EvidenceItem, RiskDriver } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50/50">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[13px] text-slate-700">{item.label}</p>
            <p className="font-mono text-[11px] text-slate-400">{item.key}</p>
          </div>
          <div className="text-right">
            <p className="tnum text-[13px] font-medium text-slate-900">{item.value}</p>
            <p className="text-[11px] text-slate-400">{item.source}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * The arithmetic is the point: an advisor must be able to re-derive the score.
 * Computed, never generated.
 */
export function DriverList({ drivers, total }: { drivers: RiskDriver[]; total: number }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[12px] text-slate-500">
          Each row is weight × severity, expressed as points out of 100.
        </p>
        <ProvenanceBadge kind="computed" />
      </div>

      <ul className="space-y-2.5">
        {drivers.map((driver) => (
          <li key={driver.feature}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-slate-700">{driver.label}</span>
              <span className="tnum text-[13px] font-medium text-slate-900">
                +{driver.delta.toFixed(1)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-400"
                  style={{ width: `${Math.min(100, (driver.delta / 40) * 100)}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {driver.weight.toFixed(2)} × {driver.severity.toFixed(2)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="text-[12px] font-medium uppercase tracking-wider text-slate-500">
          Total
        </span>
        <span className="tnum text-sm font-semibold text-slate-900">
          {total.toFixed(1)} / 100
        </span>
      </div>
    </div>
  );
}

export function BlastRadius({
  writes,
  className,
}: {
  writes: { table: string; effect: string; rows: number }[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-3", className)}>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-500">
        <Info className="h-3 w-3" aria-hidden="true" />
        If approved, this writes
      </p>
      <ul className="space-y-1">
        {writes.map((write) => (
          <li key={write.table} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="font-mono text-slate-600">{write.table}</span>
            <span className="text-slate-400">
              {write.effect} × {write.rows}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
