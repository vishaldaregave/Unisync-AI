"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  badge?: string;
}

export function Tabs({
  items,
  panels,
  initialId,
}: {
  items: TabItem[];
  panels: Record<string, ReactNode>;
  initialId?: string;
}) {
  const first = initialId ?? items[0]?.id ?? "";
  const [active, setActive] = useState(first);

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-slate-200">
        {items.map((item) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(item.id)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                selected
                  ? "border-indigo-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
              )}
            >
              {item.label}
              {item.badge ? (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {panels[active] ?? null}
      </div>
    </div>
  );
}
