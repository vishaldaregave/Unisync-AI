"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BookOpen, FileText, Send, ShieldCheck } from "lucide-react";

import { ProvenanceBadge } from "@/components/domain/provenance-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/primitives";
import { seedConversation, scriptedReply, suggestedFollowUps } from "@/lib/mock/conversation";
import { enrollmentsByStudent, getStudent, primaryStudentId, riskDriversByStudent } from "@/lib/mock/data";
import type { ChatTurn } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

export default function AdvisorPage() {
  const student = getStudent(primaryStudentId);
  const drivers = riskDriversByStudent[primaryStudentId] ?? [];
  const enrollments = enrollmentsByStudent[primaryStudentId] ?? [];
  const [turns, setTurns] = useState<ChatTurn[]>(seedConversation);
  const [draft, setDraft] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const studentTurn: ChatTurn = { id: `turn_${Date.now()}_s`, role: "student", content: trimmed };
    setTurns((current) => [...current, studentTurn, scriptedReply(trimmed)]);
    setDraft("");
  }

  return (
    <>
      <PageHeader
        eyebrow="Cortex · Conversational advisor"
        title="Ask about your record"
        description="Answers are grounded in this student's own terms and published policy — and anything that changes the record becomes a request, not an action."
        actions={
          <Badge tone="amber">Scripted demo · no model calls</Badge>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex min-h-[560px] flex-col">
          <CardHeader
            title="Conversation"
            description={student ? `${student.name} · ${student.rollNumber}` : "Student"}
            action={<ProvenanceBadge kind="generated" />}
          />

          <CardBody className="flex flex-1 flex-col">
            <div className="scroll-thin flex-1 space-y-4 overflow-y-auto pr-1">
              {turns.map((turn) => (
                <div
                  key={turn.id}
                  className={cn(
                    "flex gap-2.5",
                    turn.role === "student" ? "justify-end" : "justify-start",
                  )}
                >
                  {turn.role === "assistant" ? (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-semibold text-white">
                      US
                    </span>
                  ) : null}

                  <div className="max-w-[85%]">
                    <div
                      className={cn(
                        "rounded-xl2 px-3.5 py-2.5 text-[13px] leading-relaxed",
                        turn.role === "student"
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-700",
                      )}
                    >
                      {turn.content}
                    </div>

                    {turn.citations && turn.citations.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {turn.citations.map((citation) => (
                          <span
                            key={`${turn.id}-${citation.label}`}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600"
                          >
                            {citation.kind === "fact" ? (
                              <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                            ) : (
                              <BookOpen className="h-2.5 w-2.5" aria-hidden="true" />
                            )}
                            From: {citation.label}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {turn.requiresApproval ? (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          Requires your advisor&apos;s approval
                        </p>
                        <p className="mt-1 text-[12px] leading-snug text-amber-900">
                          Prepared as a request for Dr. R. Okafor. Nothing is submitted until they
                          approve it.
                        </p>
                        <Link
                          href="/approvals"
                          className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-amber-900 hover:underline"
                        >
                          View the pending request <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {suggestedFollowUps.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                send(draft);
              }}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about attendance, a drop, or this week's deadlines…"
                aria-label="Message the academic advisor"
              />
              <Button type="submit" variant="primary" size="icon" aria-label="Send">
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="What the assistant can see" description="This student's record only" />
            <CardBody className="space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Attendance</p>
                <p className="tnum text-sm font-semibold text-slate-900">
                  {Math.round((enrollments[0]?.attendanceRate ?? 0) * 100)}% · CS301
                </p>
                <p className="text-[11px] text-slate-500">
                  {enrollments[0]?.sessionsAttended ?? 0} of {enrollments[0]?.sessionsTotal ?? 0}{" "}
                  sessions
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Top driver</p>
                <p className="text-[13px] text-slate-800">{drivers[0]?.label ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Term</p>
                <p className="text-[13px] text-slate-800">{student?.term}</p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Grounding rules" />
            <CardBody>
              <ul className="space-y-2 text-[12px] leading-snug text-slate-600">
                <li>· Answers cite the record or a published policy — never invented.</li>
                <li>· No answer changes a mark, an enrolment, or a plan.</li>
                <li>· If the record cannot support an answer, it says so.</li>
                <li>· Consequential requests go to a human for approval.</li>
              </ul>
              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                In this prototype the assistant is a keyword-matched script. No language model is
                called and no data leaves the browser.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
