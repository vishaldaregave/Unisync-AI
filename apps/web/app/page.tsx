import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";

import { MetricStrip } from "@/components/dashboard/metric-strip";
import { Pipeline } from "@/components/dashboard/pipeline";
import { RiskMix, WeekBars } from "@/components/dashboard/risk-mix";
import { PageHeader } from "@/components/layout/app-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  NOW,
  bandCounts,
  interventionMix,
  population,
  recentActivity,
  summary,
  weeklyFlagged,
  type PopulationStudent,
} from "@/lib/dataset/population";
import { cn } from "@/lib/utils";

const QUEUE_IDS = ["neha-kulkarni", "aarav-menon", "kabir-shah", "ishan-rao", "diya-sharma"];

const BAND_LABEL = { low: "Low", medium: "Medium", high: "High", critical: "Critical" } as const;

const BAND_PILL: Record<PopulationStudent["band"], string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
  critical: "border-rose-300 bg-rose-100 text-rose-800",
};

const BAND_BAR: Record<PopulationStudent["band"], string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-400",
  high: "bg-rose-500",
  critical: "bg-rose-600",
};

const INTERVENTION_LABEL = {
  outreach: "Outreach",
  tutoring: "Tutoring",
  meeting: "Advisor meeting",
  referral: "Referral",
} as const;

function slaLabel(student: PopulationStudent) {
  const hours = Math.round((student.slaDueAt.getTime() - NOW.getTime()) / 3_600_000);
  if (hours < 0) return { text: `${Math.abs(hours)}h overdue`, overdue: true };
  if (hours <= 24) return { text: `due in ${hours}h`, overdue: false };
  return { text: `due in ${Math.round(hours / 24)}d`, overdue: false };
}

function agoLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

export default function CommandDashboard() {
  const queue = QUEUE_IDS.map((id) => population.find((s) => s.id === id)).filter(
    (s): s is PopulationStudent => Boolean(s),
  );

  const interventionTotal = interventionMix.reduce((sum, item) => sum + item.count, 0);
  const maxIntervention = Math.max(...interventionMix.map((item) => item.count), 1);

  return (
    <>
      <PageHeader
        eyebrow="Command"
        title="This week"
        description="Five students have a decision waiting. Everything below is ranked by score and by how soon the window closes."
        actions={
          <>
            <span className="hidden items-center gap-1.5 text-[11.5px] text-slate-400 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              sweep 07:12 · {summary.students.toLocaleString()} scanned
            </span>
            <Link href="/approvals" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
              Open governance centre
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </>
        }
      />

      <MetricStrip
        metrics={[
          {
            label: "Students monitored",
            value: summary.students.toLocaleString(),
            note: `${summary.newThisWeek} new enrolments this week`,
            delta: { value: "0.9%", direction: "up", good: true },
          },
          {
            label: "At risk",
            value: String(summary.atRisk),
            note: `${summary.critical} critical · ${summary.overdue} overdue`,
            delta: { value: "4", direction: "down", good: true },
          },
          {
            label: "Decisions taken",
            value: "129",
            note: "every drafted action was decided",
          },
          {
            label: "Decided on time",
            value: `${summary.slaPct}%`,
            note: "9 decisions breached their window",
            delta: { value: "2.2%", direction: "up", good: true },
          },
        ]}
      />

      <div className="mt-7 grid gap-x-8 gap-y-8 lg:grid-cols-[minmax(0,1fr)_286px]">
        <section>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Priority queue
              </h2>
              <span className="tnum text-[11px] text-slate-400">{queue.length} waiting</span>
            </div>
            <span className="text-[11px] text-slate-400">sorted by score</span>
          </div>

          <ul className="mt-2 border-t border-slate-200">
            {queue.map((student) => {
              const sla = slaLabel(student);
              return (
                <li key={student.id}>
                  <Link
                    href={`/students/${student.id}`}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-100 py-3 transition-colors hover:bg-slate-50/70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                        style={{ backgroundColor: `hsl(${(student.score * 7) % 360} 32% 38%)` }}
                        aria-hidden="true"
                      >
                        {student.name
                          .split(" ")
                          .map((p) => p.charAt(0))
                          .slice(0, 2)
                          .join("")}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-medium text-slate-900 group-hover:underline group-hover:decoration-slate-300 group-hover:underline-offset-2">
                            {student.name}
                          </span>
                          <span className="tnum hidden shrink-0 text-[11px] text-slate-400 sm:inline">
                            {student.roll}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded border px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wider",
                              BAND_PILL[student.band],
                            )}
                          >
                            {BAND_LABEL[student.band]}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">
                          {student.driver}
                          <span className="text-slate-300"> · </span>
                          <span className="text-slate-400">{student.advisor}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <span
                        className={cn(
                          "tnum hidden text-[11px] sm:inline",
                          sla.overdue ? "font-medium text-rose-600" : "text-slate-400",
                        )}
                      >
                        {sla.text}
                      </span>

                      <div className="hidden w-20 items-center gap-2 md:flex">
                        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn("h-full rounded-full", BAND_BAR[student.band])}
                            style={{ width: `${student.score}%` }}
                          />
                        </div>
                        <span className="tnum w-5 text-right text-[12px] font-medium text-slate-900">
                          {student.score}
                        </span>
                      </div>

                      <ChevronRight
                        className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-600"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href="/students/aarav-menon"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-700 hover:text-slate-900"
            >
              All {summary.atRisk} at-risk students
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <span className="text-[11px] text-slate-400">recomputed 07:12 · engine v1.2</span>
          </div>

          <section className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Interventions in flight
              </h2>
              <span className="tnum text-[11px] text-slate-400">{interventionTotal} open</span>
            </div>

            <ul className="space-y-3">
              {interventionMix.map((item) => (
                <li key={item.type} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-[12px] text-slate-600">
                    {INTERVENTION_LABEL[item.type]}
                  </span>
                  <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${(item.count / maxIntervention) * 100}%` }}
                    />
                  </div>
                  <span className="tnum w-6 text-right text-[12px] font-medium text-slate-900">
                    {item.count}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[11px] leading-snug text-slate-400">
              High and critical students only. A student can hold more than one intervention; the
              figures are per type, not per person.
            </p>
          </section>
        </section>

        <aside className="space-y-7 lg:border-l lg:border-slate-200 lg:pl-6">
          <RiskMix data={bandCounts} total={summary.students} />

          <WeekBars data={weeklyFlagged} />

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Activity
              </h2>
              <Link href="/approvals" className="text-[11px] text-slate-400 hover:text-slate-700">
                history
              </Link>
            </div>

            <ol className="space-y-2.5">
              {recentActivity.map((event) => (
                <li key={event.id} className="flex gap-3 text-[12px] leading-snug">
                  <span className="tnum w-7 shrink-0 pt-px text-right text-[10.5px] text-slate-400">
                    {agoLabel(event.minutesAgo)}
                  </span>
                  <span className="text-slate-500">
                    <span className="font-medium text-slate-800">{event.actor}</span> {event.verb}{" "}
                    <span className="text-slate-700">{event.object}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>

      <div className="mt-9 border-t border-slate-200 pt-7">
        <Pipeline />
      </div>
    </>
  );
}
