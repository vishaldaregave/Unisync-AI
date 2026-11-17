"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  CircleDot,
  GitBranch,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const menu = [
  { href: "/", label: "Command", icon: LayoutDashboard, exact: true },
  { href: "/students/aarav-menon", label: "Students", icon: Users, match: "/students" },
  { href: "/advisor", label: "Advisor", icon: Bot },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck, badge: "5" },
];

const workspace = [
  { href: "/fabric", label: "Fabric", icon: Activity },
  { href: "/graph", label: "Graph", icon: GitBranch },
  { href: "/status", label: "Build status", icon: CircleDot },
];

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
        active
          ? "bg-brand-50 font-semibold text-brand-800"
          : "font-medium text-ink-muted hover:bg-surface-soft hover:text-ink",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-brand-600" : "text-ink-soft group-hover:text-ink-muted",
        )}
        aria-hidden="true"
      />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SideRail() {
  const pathname = usePathname();

  const isActive = (item: { href: string; exact?: boolean; match?: string }) =>
    item.exact
      ? pathname === item.href
      : item.match
        ? pathname.startsWith(item.match)
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <aside className="hidden w-[236px] shrink-0 flex-col border-r border-line px-4 py-5 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">
          US
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold tracking-tight text-ink">UniSync AI</span>
          <span className="block text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-soft">
            Alpha University
          </span>
        </span>
      </Link>

      <p className="mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        Menu
      </p>
      <nav className="mt-2 space-y-1">
        {menu.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item)} />
        ))}
      </nav>

      <p className="mt-6 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        Workspace
      </p>
      <nav className="mt-2 space-y-1">
        {workspace.map((item) => (
          <NavLink key={item.href} {...item} active={isActive(item)} />
        ))}
      </nav>

      <div className="mt-auto">
        <div className="rounded-card bg-gradient-to-b from-brand-700 to-brand-900 p-4 text-white">
          <p className="text-[13px] font-semibold">Governance first</p>
          <p className="mt-1 text-[11px] leading-snug text-brand-100/85">
            Agents propose. A named human approves. Every step is on the ledger.
          </p>
          <Link
            href="/status"
            className="mt-3 flex h-8 items-center justify-center rounded-full bg-white/12 text-[11.5px] font-medium text-white transition-colors hover:bg-white/20"
          >
            View build status
          </Link>
        </div>
      </div>
    </aside>
  );
}
