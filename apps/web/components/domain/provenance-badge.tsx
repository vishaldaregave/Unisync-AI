import { Calculator, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Every AI-adjacent surface must say what produced it.
 * `computed` = deterministic rule output. `generated` = language model text.
 */
export function ProvenanceBadge({
  kind,
  className,
}: {
  kind: "computed" | "generated" | "needs-approval";
  className?: string;
}) {
  if (kind === "computed") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500",
          className,
        )}
      >
        <Calculator className="h-3 w-3" aria-hidden="true" />
        Computed
      </span>
    );
  }

  if (kind === "generated") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-600",
          className,
        )}
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        Generated
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700",
        className,
      )}
    >
      Needs your approval
    </span>
  );
}
