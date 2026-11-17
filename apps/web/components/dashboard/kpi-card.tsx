import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  note,
  icon: Icon,
  dark = false,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl2 border p-5",
        dark
          ? "border-brand-800 bg-gradient-to-b from-brand-700 to-brand-900 text-white"
          : "border-line bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-[12.5px] font-medium",
            dark ? "text-brand-100" : "text-ink-muted",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            dark ? "bg-white/15 text-white" : "border border-line text-ink-muted",
          )}
          aria-hidden="true"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>

      <p
        className={cn(
          "tnum mt-3 text-[34px] font-bold leading-none tracking-[-0.03em]",
          dark ? "text-white" : "text-ink",
        )}
      >
        {value}
      </p>

      <div
        className={cn(
          "-mx-5 -mb-5 mt-5 flex items-center gap-1.5 px-5 py-2.5 text-[11px]",
          dark ? "bg-white/10 text-brand-100" : "bg-surface-soft text-ink-muted",
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{note}</span>
      </div>
    </div>
  );
}
