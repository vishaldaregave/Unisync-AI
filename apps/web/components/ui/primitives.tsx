import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100",
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-slate-200", className)} />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-brand-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
      {icon ? <div className="mb-1 text-slate-400">{icon}</div> : null}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="max-w-sm text-[13px] text-slate-500">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
