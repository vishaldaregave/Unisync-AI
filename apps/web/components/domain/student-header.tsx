import type { Student } from "@/lib/mock/types";
import { RiskBadge } from "@/components/domain/risk-badge";
import { Badge } from "@/components/ui/badge";

export function StudentHeader({ student }: { student: Student }) {
  const initials = student.name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: `hsl(${student.avatarHue} 45% 42%)` }}
          aria-hidden="true"
        >
          {initials}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{student.name}</h1>
            <RiskBadge band={student.riskBand} score={student.riskScore} />
          </div>
          <p className="mt-0.5 text-[13px] text-slate-500">
            <span className="tnum">{student.rollNumber}</span> · {student.programme}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="outline">Advisor · {student.advisor}</Badge>
            <Badge tone="outline">Term · {student.term}</Badge>
            <Badge tone="outline">
              <span className="tnum">{student.creditsInProgress}</span> credits in progress
            </Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-5 rounded-xl2 border border-slate-200 bg-white px-4 py-3 shadow-card">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">CGPA</dt>
          <dd className="tnum text-sm font-semibold text-slate-900">{student.cgpa.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Credits</dt>
          <dd className="tnum text-sm font-semibold text-slate-900">{student.creditsEarned}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-slate-400">Risk</dt>
          <dd className="tnum text-sm font-semibold text-slate-900">{student.riskScore}</dd>
        </div>
      </dl>
    </div>
  );
}
