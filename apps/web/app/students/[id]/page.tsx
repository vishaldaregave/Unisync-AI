import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ClipboardList, GraduationCap, Users } from "lucide-react";

import { AttendanceHeatmap } from "@/components/charts/heatmap";
import { BarSeries } from "@/components/charts/bars";
import { DriverList } from "@/components/domain/evidence";
import { MiniGraph } from "@/components/domain/mini-graph";
import { RiskBadge } from "@/components/domain/risk-badge";
import { StudentHeader } from "@/components/domain/student-header";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import {
  attendanceHeatmap,
  enrollmentsByStudent,
  getStudent,
  interventions,
  performanceSeries,
  riskCases,
  riskDriversByStudent,
} from "@/lib/mock/data";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = getStudent(id);
  if (!student) notFound();

  const enrollments = enrollmentsByStudent[student.id] ?? [];
  const drivers = riskDriversByStudent[student.id] ?? [];
  const riskCase = riskCases.find((item) => item.studentId === student.id);
  const studentInterventions = interventions.filter((item) => item.studentId === student.id);

  const overview = (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader
          title="Performance"
          description="Weighted marks across the term · unpublished assessments are hollow"
        />
        <CardBody>
          <BarSeries
            data={performanceSeries.map((point) => ({
              label: point.label,
              value: point.score,
            }))}
            suffix="%"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Subject load" description="Current term" />
        <CardBody className="space-y-3">
          {enrollments.map((enrollment) => (
            <div key={enrollment.subjectCode}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-slate-800">
                  {enrollment.subjectCode}
                </span>
                <span className="tnum text-[12px] text-slate-500">
                  {enrollment.credits} cr
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{enrollment.subjectName}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={
                      enrollment.attendanceRate < 0.7
                        ? "h-full rounded-full bg-rose-400"
                        : "h-full rounded-full bg-emerald-500"
                    }
                    style={{ width: `${enrollment.attendanceRate * 100}%` }}
                  />
                </div>
                <span className="tnum text-[10px] text-slate-400">
                  {Math.round(enrollment.attendanceRate * 100)}% att.
                </span>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );

  const attendance = (
    <Card>
      <CardHeader
        title="Attendance · last 12 weeks"
        description="Sessions are scheduled records; a blank cell is a gap in recording, not an absence"
      />
      <CardBody>
        <AttendanceHeatmap weeks={attendanceHeatmap} />
      </CardBody>
    </Card>
  );

  const performance = (
    <Card>
      <CardHeader title="Per-subject performance" description="Weighted mark against attendance" />
      <CardBody className="space-y-4">
        {enrollments.map((enrollment) => (
          <div key={enrollment.subjectCode} className="rounded-lg border border-slate-100 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[13px] font-medium text-slate-900">
                  {enrollment.subjectCode} · {enrollment.subjectName}
                </p>
                <p className="text-[11px] text-slate-500">{enrollment.faculty}</p>
              </div>
              <div className="flex items-center gap-4 text-[12px]">
                <span className="tnum text-slate-600">
                  {enrollment.weightedMark.toFixed(1)}% mark
                </span>
                <span
                  className={
                    enrollment.trend >= 0
                      ? "tnum text-emerald-600"
                      : "tnum text-rose-600"
                  }
                >
                  {enrollment.trend >= 0 ? "+" : ""}
                  {enrollment.trend} pts
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );

  const history = (
    <Card>
      <CardHeader title="Intervention history" description="Oldest first · owner and outcome" />
      <CardBody>
        {studentInterventions.length === 0 ? (
          <p className="text-[13px] text-slate-500">No interventions recorded for this student.</p>
        ) : (
          <ol className="relative space-y-4">
            <span className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-slate-200" aria-hidden="true" />
            {studentInterventions.map((item) => (
              <li key={item.id} className="relative pl-5">
                <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-medium capitalize text-slate-900">
                    {item.type}
                  </span>
                  <Badge tone={item.status === "completed" ? "emerald" : "slate"}>
                    {item.status.replace("_", " ")}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">
                  {item.owner} · due{" "}
                  {new Date(item.dueAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                {item.outcome ? (
                  <p className="mt-1 text-[12px] text-slate-600">{item.outcome}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  );

  return (
    <>
      <PageHeader
        eyebrow="Student intelligence"
        title="One student, one story"
        description="Identity, attendance, marks, risk and support history composed into a single view."
        actions={
          <Link
            href="/advisor"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"
          >
            Ask the advisor about this student
          </Link>
        }
      />

      <StudentHeader student={student} />

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Why this student is flagged"
            description={`Engine risk-v1.2 · band ${student.riskBand} · computed from five features`}
            action={<RiskBadge band={student.riskBand} score={student.riskScore} />}
          />
          <CardBody>
            <DriverList drivers={drivers} total={student.riskScore} />
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-500">
              This indicator is a prompt for a conversation, not a prediction or a judgment. It is
              not used in any grading or disciplinary decision.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Relationships" description="Student → subjects → people" />
          <CardBody>
            <MiniGraph />
          </CardBody>
        </Card>
      </div>

      <div className="mt-3">
        <Card>
          <CardBody>
            <Tabs
              items={[
                { id: "overview", label: "Overview" },
                { id: "attendance", label: "Attendance" },
                { id: "performance", label: "Performance" },
                {
                  id: "history",
                  label: "Interventions",
                  badge: String(studentInterventions.length),
                },
              ]}
              panels={{ overview, attendance, performance, history }}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: CalendarClock,
            label: "Open case",
            value: riskCase?.openedAt
              ? new Date(riskCase.openedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
              : "—",
            hint: riskCase ? `Severity ${riskCase.severity}` : "No open case",
          },
          {
            icon: Users,
            label: "Owner",
            value: riskCase?.owner ?? student.advisor,
            hint: "Assigned advisor",
          },
          {
            icon: GraduationCap,
            label: "Credits",
            value: `${student.creditsEarned} earned`,
            hint: `${student.creditsInProgress} in progress`,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl2 border border-slate-200 bg-white px-4 py-3 shadow-card"
            >
              <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="truncate text-[13px] font-medium text-slate-900">{item.value}</p>
                <p className="text-[11px] text-slate-500">{item.hint}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-slate-400">
        <ClipboardList className="h-3 w-3" aria-hidden="true" />
        Sample record. Numbers are internally consistent, but nothing here is read from a database.
      </p>
    </>
  );
}
