import { cn } from "@/lib/utils";

/** Half-donut gauge with the value centred beneath the arc. */
export function Gauge({
  value,
  label,
  legend,
  className,
}: {
  value: number;
  label: string;
  legend: Array<{ label: string; color: string }>;
  className?: string;
}) {
  const radius = 64;
  const length = Math.PI * radius;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * length;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg viewBox="0 0 200 112" className="w-full max-w-[220px]" role="img" aria-label={label}>
        <path
          d="M 36 100 A 64 64 0 0 1 164 100"
          fill="none"
          stroke="#E7ECE8"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 36 100 A 64 64 0 0 1 164 100"
          fill="none"
          stroke="#1F6B4B"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${length}`}
        />
        <text
          x="100"
          y="86"
          textAnchor="middle"
          className="fill-ink"
          style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em" }}
        >
          {value}%
        </text>
        <text
          x="100"
          y="101"
          textAnchor="middle"
          className="fill-ink-soft"
          style={{ fontSize: 9, letterSpacing: "0.02em" }}
        >
          {label}
        </text>
      </svg>

      <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {legend.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-[11px] text-ink-muted">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
