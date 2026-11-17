import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  CircleCheck,
  TriangleAlert,
  Users,
} from "lucide-react";

import { AnalyticsBars, BarLabels } from "@/components/dashboard/analytics-bars";
import { Gauge } from "@/components/dashboard/gauge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  NOW,
  interventionMix,
  population,
  summary,
  weeklyFlagged,
  type PopulationStudent,
} from "@/lib/dataset/population";
import { cn } from "@/lib/utils";

const QUEUE_IDS = ["neha-kulkarni", "aarav-menon", "kabir-shah", "ishan-rao", "diya-sharma"];

const BAND_DOT: Record<PopulationStudent["band"], string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-400",
  high: "bg-rose-400",
  critical: "bg-rose-600",
};

const BAND_TINT: Record<PopulationStudent["band"], string> = {
  low: "bg-brand-50",
  medium: "bg-amber-50",
  high: "bg-amber-50",
  critical: "bg-rose-50",
};

const ADVISORS = [
  { name: "Dr. R. Okafor", working: "CS301 attendance follow-up", status: "Reviewing", tone: "amber" as const, hue: 152 },
  { name: "Dr. P. Nair", working: "EE lab attendance check-in", status: "On track", tone: "brand" as const, hue: 96 },
  { name: "Dr. M. Fernandes", working: "ME310 resubmission", status: "On track", tone: "brand" as const, hue: 28 },
  { name: "Dr. S. Iyer", working: "CS310 lab supervision", status: "Awaiting", tone: "rose" as const, hue: 205 },
];

function dueLabel(student: PopulationStudent) {
  const hours = Math.round((student.slaDueAt.getTime() - NOW.getTime()) / 3_600_000);
  if (hours < 0) return { text: `${Math.abs(hours)}h overdue`, urgent: true };
  if (hours <= 24) return { text: `Due in ${hours}h`, urgent: false };
  return { text: `Due in ${Math.round(hours / 24)}d`, urgent: false };
}

export default function DashboardPage() {
  const queue = QUEUE_IDS.map((id) => population.find((s) => s.id === id)).filter(
    (s): s is PopulationStudent => Boolean(s),
  );

  const weeks = weeklyFlagged.slice(-8);
  const inFlight = interventionMix.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <PageHeader
        eyebrow="Command"
        title="Dashboard"
        description="Plan, prioritise and act on the students who need you this week."
        actions={
          <>
            <Link href="/fabric" className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
              Data sources
            </Link>
            <Link href="/approvals" className={cn(buttonVariants({ variant: "primary", size: "md" }))}>
              <span className="text-[15px] leading-none">+</span>
              Review approvals
            </Link>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          dark
          label="Students monitored"
          value={summary.students.toLocaleString()}
          note="Increased from last month"
          icon={Users}
        />
        <KpiCard
          label="At risk"
          value={String(summary.atRisk)}
          note={`${summary.critical} critical · 4 fewer than last week`}
          icon={TriangleAlert}
        />
        <KpiCard
          label="Interventions in flight"
          value={String(inFlight)}
          note="12 closed this week"
          icon={CircleCheck}
        />
        <KpiCard
          label="Awaiting approval"
          value="5"
          note="2 due before 18:00"
          icon={CalendarClock}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader
            title="Alert activity"
            description="Students flagged per week"
            action={<Badge tone="brand">8 weeks</Badge>}
          />
          <CardBody className="flex flex-1 flex-col justify-end">
            <AnalyticsBars data={weeks.map((w) => ({ label: w.week, value: w.flagged }))} />
            <BarLabels labels={weeks.map((w) => w.week)} />
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Next decision" action={<Badge tone="rose">Overdue</Badge>} />
          <CardBody className="flex flex-1 flex-col">
            <p className="text-[17px] font-semibold leading-snug tracking-tight text-ink">
              Neha Kulkarni
            </p>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">
              Three missed labs and an unpaid balance.
            </p>
            <p className="tnum mt-4 text-[12.5px] text-ink-muted">
              Window closed <span className="font-semibold text-ink">33h ago</span>
            </p>

            <dl className="mt-4 space-y-2 border-t border-line pt-3">
              {[
                ["Risk score", "89 · critical"],
                ["Attendance", "41% · 3 missed labs"],
                ["Last contact", "11 days ago"],
              ].map(([term, value]) => (
                <div key={term} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <dt className="text-ink-soft">{term}</dt>
                  <dd className="tnum font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <Link
              href="/approvals"
              className={cn(buttonVariants({ variant: "primary", size: "md" }), "mt-5 w-full")}
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Review now
            </Link>
          </CardBody>
        </Card>

        <Card className="flex flex-col">
          <CardHeader
            title="Priority queue"
            action={
              <Link href="/approvals" className="text-[12px] font-medium text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          <CardBody className="flex-1">
            <ul className="space-y-0.5">
              {queue.map((student) => {
                const due = dueLabel(student);
                return (
                  <li key={student.id}>
                    <Link
                      href={`/students/${student.id}`}
                      className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-soft"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          BAND_TINT[student.band],
                        )}
                        aria-hidden="true"
                      >
                        <span className={cn("h-2 w-2 rounded-full", BAND_DOT[student.band])} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">
                          {student.name}
                        </span>
                        <span
                          className={cn(
                            "tnum block text-[11px]",
                            due.urgent ? "font-medium text-rose-600" : "text-ink-soft",
                          )}
                        >
                          {due.text}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-line-strong transition-colors group-hover:text-ink-muted"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader
            title="Advisors"
            action={
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                + Add member
              </span>
            }
          />
          <CardBody className="flex-1">
            <ul className="space-y-2.5">
              {ADVISORS.map((advisor) => (
                <li key={advisor.name} className="flex items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: `hsl(${advisor.hue} 34% 42%)` }}
                    aria-hidden="true"
                  >
                    {advisor.name
                      .replace("Dr. ", "")
                      .split(" ")
                      .map((p) => p.charAt(0))
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {advisor.name}
                    </span>
                    <span className="block truncate text-[11px] text-ink-soft">
                      Working on <span className="text-ink-muted">{advisor.working}</span>
                    </span>
                  </span>
                  <Badge tone={advisor.tone}>{advisor.status}</Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Decision progress" description="This cycle" />
          <CardBody className="pt-2">
            <Gauge
              value={summary.slaPct}
              label="decided on time"
              legend={[
                { label: "On time", color: "#1F6B4B" },
                { label: "Breached", color: "#E7ECE8" },
              ]}
            />
            <p className="mt-4 text-center text-[11px] leading-snug text-ink-soft">
              129 decisions · 9 breached their window
            </p>
          </CardBody>
        </Card>

        <div className="flex flex-col justify-between rounded-card bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-6 text-white shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12.5px] font-medium text-brand-100">Nightly sweep</p>
              <p className="tnum mt-3 text-[38px] font-bold leading-none tracking-[-0.03em]">
                07:12
              </p>
              <p className="mt-2 text-[11.5px] text-brand-100/80">
                1,284 students rescored · 4 minutes ago
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <Link
            href="/status"
            className="mt-6 flex items-center justify-between rounded-full bg-white/12 px-4 py-2.5 text-[12px] font-medium transition-colors hover:bg-white/20"
          >
            Engine v1.2 · deterministic
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
