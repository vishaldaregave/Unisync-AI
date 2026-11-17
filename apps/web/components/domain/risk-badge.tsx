import { AlertTriangle, CircleAlert, CircleCheck, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RiskBand } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

const config: Record<
  RiskBand,
  { label: string; tone: "emerald" | "amber" | "rose"; Icon: typeof CircleCheck }
> = {
  low: { label: "Low", tone: "emerald", Icon: CircleCheck },
  medium: { label: "Medium", tone: "amber", Icon: AlertTriangle },
  high: { label: "High", tone: "rose", Icon: CircleAlert },
  critical: { label: "Critical", tone: "rose", Icon: ShieldAlert },
};

export function RiskBadge({
  band,
  score,
  className,
}: {
  band: RiskBand;
  score?: number;
  className?: string;
}) {
  const { label, tone, Icon } = config[band];
  return (
    <Badge tone={tone} className={cn("gap-1.5", className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
      {typeof score === "number" ? (
        <span className="tnum opacity-70">· {score}</span>
      ) : null}
    </Badge>
  );
}

