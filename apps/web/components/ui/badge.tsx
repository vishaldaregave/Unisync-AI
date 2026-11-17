import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-ink-muted",
        slate: "bg-surface-sunken text-ink-muted",
        brand: "bg-brand-50 text-brand-700",
        indigo: "bg-brand-50 text-brand-700",
        emerald: "bg-emerald-50 text-emerald-700",
        amber: "bg-amber-50 text-amber-700",
        rose: "bg-rose-50 text-rose-700",
        outline: "border border-line-strong bg-white text-ink-muted",
        dark: "bg-brand-800 text-white/90",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
