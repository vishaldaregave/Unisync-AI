"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Mail, Search } from "lucide-react";
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
    <div className="min-h-screen bg-canvas md:p-3 lg:p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[1560px] flex-col overflow-hidden bg-white shadow-shell md:min-h-[calc(100vh-1.5rem)] md:flex-row md:rounded-[26px] lg:min-h-[calc(100vh-2rem)]">
        <SideRail />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] shrink-0 items-center gap-3 px-5 lg:px-7">
            <label className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                aria-label="Search students"
                placeholder="Search students, subjects…"
                className="h-10 w-[280px] rounded-full border border-line bg-white pl-11 pr-14 text-[13px] text-ink placeholder:text-ink-soft focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 lg:w-[320px]"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface-soft px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                ⌘F
              </kbd>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <Badge tone="brand" className="hidden md:inline-flex">
                Demo data
              </Badge>

              <button
                type="button"
                aria-label="Messages"
                className="hidden h-10 w-10 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-soft sm:flex"
              >
                <Mail className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-muted transition-colors hover:bg-surface-soft"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
              </button>

              <div className="ml-1 flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-800">
                  RO
                </span>
                <span className="hidden leading-tight lg:block">
                  <span className="block text-[13px] font-semibold text-ink">Dr. R. Okafor</span>
                  <span className="block text-[11px] text-ink-soft">okafor@alpha.edu</span>
                </span>
              </div>
            </div>
          </header>

          <nav className="flex gap-1.5 overflow-x-auto border-b border-line px-4 pb-3 md:hidden">
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
                    "whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium",
                    active ? "bg-brand-600 text-white" : "bg-surface-sunken text-ink-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <main className="min-w-0 flex-1 px-5 pb-6 lg:px-7">{children}</main>

          <footer className="px-5 pb-4 lg:px-7">
            <p className="text-[11px] text-ink-soft">
              {DEMO_NOTICE} · {institution.termLabel}
            </p>
          </footer>
        </div>
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 pt-1">
      <div>
        {eyebrow ? (
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-snug text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
