"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  GitBranch,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Command", icon: LayoutDashboard, exact: true },
  { href: "/students/aarav-menon", label: "Students", icon: Users, match: "/students" },
  { href: "/advisor", label: "Advisor", icon: Bot },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, badge: "5" },
  { href: "/fabric", label: "Fabric", icon: Activity },
  { href: "/graph", label: "Graph", icon: GitBranch },
];

export function SideRail() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[218px] shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
          US
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight text-slate-900">
            UniSync AI
          </p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">Alpha University</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : item.match
              ? pathname.startsWith(item.match)
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-slate-50 font-medium text-slate-900"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r",
                  active ? "bg-indigo-600" : "bg-transparent",
                )}
                aria-hidden="true"
              />
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <p className="rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-snug text-amber-800">
          Prototype · sample data. No live database, no model calls.
        </p>
      </div>
    </aside>
  );
}
