"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import type { ReactNode } from "react";

import { SideRail } from "@/components/layout/side-rail";
import { Badge } from "@/components/ui/badge";
import { institution } from "@/lib/mock/data";
import { cn, DEMO_NOTICE } from "@/lib/utils";

const mobileNav = [
  { href: "/", label: "Command", exact: true },
  { href: "/students/aarav-menon", label: "Students", match: "/students" },
  { href: "/advisor", label: "Advisor" },
  { href: "/approvals", label: "Approvals" },
  { href: "/fabric", label: "Fabric" },
  { href: "/graph", label: "Graph" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SideRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-slate-900">
              {institution.name}
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-500">{institution.termLabel}</span>
            </p>
          </div>

          <label className="relative hidden lg:block">
            <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              aria-label="Search students"
              placeholder="Search students, subjects…"
              className="h-8 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:outline-none"
            />
          </label>

          <Badge tone="amber" className="hidden sm:inline-flex">
            Demo data
          </Badge>

          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
          </button>

          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
            RO
          </span>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1.5 md:hidden">
          {mobileNav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : item.match
                ? pathname.startsWith(item.match)
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-2.5 py-1 text-[12px]",
                  active ? "bg-slate-900 text-white" : "text-slate-600",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 px-4 py-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-2.5">
          <p className="mx-auto max-w-[1280px] text-[11px] text-slate-400">{DEMO_NOTICE}</p>
        </footer>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
