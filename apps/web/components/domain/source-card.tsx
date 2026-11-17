import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { DataSource } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

const statusTone = {
  connected: "emerald",
  degraded: "amber",
  stale: "slate",
} as const;

export function SourceCard({ source }: { source: DataSource }) {
  return (
    <div className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900">{source.name}</p>
          <p className="text-[11px] text-slate-500">{source.kind}</p>
        </div>
        <Badge tone={statusTone[source.status]}>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              source.status === "connected"
                ? "bg-emerald-500"
                : source.status === "degraded"
                  ? "bg-amber-500"
                  : "bg-slate-400",
            )}
            aria-hidden="true"
          />
          {source.status}
        </Badge>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <dt className="text-slate-400">Records</dt>
          <dd className="tnum font-medium text-slate-800">{source.records.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Mode</dt>
          <dd className="text-slate-800">{source.mode}</dd>
        </div>
      </dl>

      <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
        Last sync · {new Date(source.lastSync).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
      </p>
    </div>
  );
}

/** Simple source → record unification diagram. */
export function FabricDiagram({ sources }: { sources: DataSource[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div className="grid gap-2">
        {sources.map((source) => (
          <div
            key={source.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <span className="text-[12px] text-slate-700">{source.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              {source.status}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center py-1 md:py-0">
        <svg width="72" height="120" viewBox="0 0 72 120" className="hidden md:block" aria-hidden="true">
          {[18, 42, 66, 90].map((y) => (
            <path
              key={y}
              d={`M0,${y} C36,${y} 36,60 72,60`}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.25"
            />
          ))}
        </svg>
        <span className="text-[11px] uppercase tracking-wider text-slate-400 md:hidden">
          resolves to
        </span>
      </div>

      <div className="rounded-xl2 border border-indigo-200 bg-indigo-50/60 p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-600">
          One student record
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">Aarav Menon · 2023CS041</p>
        <p className="mt-1 text-[12px] leading-snug text-slate-600">
          Identity, enrolment, marks, attendance and support history composed at read time — not
          copied into a warehouse.
        </p>
        <Link
          href="/students/aarav-menon"
          className="mt-3 inline-block text-[12px] font-medium text-indigo-700 hover:underline"
        >
          Open the composed record →
        </Link>
      </div>
    </div>
  );
}
