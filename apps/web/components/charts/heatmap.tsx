import { cn } from "@/lib/utils";

export type AttendanceCell = "present" | "late" | "absent" | "excused" | "none";

const cellStyle: Record<AttendanceCell, string> = {
  present: "bg-emerald-500/85",
  late: "bg-amber-400/90",
  absent: "bg-rose-500/85",
  excused: "bg-slate-300",
  none: "bg-slate-100",
};

const cellLabel: Record<AttendanceCell, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
  none: "No session",
};

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export function AttendanceHeatmap({
  weeks,
  className,
}: {
  weeks: { week: number; days: AttendanceCell[] }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid grid-cols-[28px_repeat(5,1fr)] gap-1.5">
        <span />
        {dayLabels.map((day) => (
          <span key={day} className="text-center text-[10px] font-medium text-slate-400">
            {day}
          </span>
        ))}
        {weeks.map((week) => (
          <div key={week.week} className="contents">
            <span className="flex items-center text-[10px] text-slate-400">W{week.week}</span>
            {week.days.map((day, index) => (
              <div
                key={`${week.week}-${index}`}
                title={`Week ${week.week} · ${cellLabel[day]}`}
                className={cn("h-5 rounded-[3px]", cellStyle[day])}
              />
            ))}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-4 pt-1">
        {(["present", "late", "absent", "excused"] as AttendanceCell[]).map((state) => (
          <li key={state} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className={cn("h-2.5 w-2.5 rounded-[2px]", cellStyle[state])} aria-hidden="true" />
            {cellLabel[state]}
          </li>
        ))}
      </ul>
    </div>
  );
}
