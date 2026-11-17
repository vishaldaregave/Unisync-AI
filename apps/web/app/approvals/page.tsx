"use client";

import { useMemo, useState } from "react";
import { Check, CheckCheck, ChevronRight, Clock, PencilLine, X } from "lucide-react";

import { BlastRadius, EvidenceList } from "@/components/domain/evidence";
import { ProvenanceBadge } from "@/components/domain/provenance-badge";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { decisionHistory, proposedActions } from "@/lib/mock/approvals";
import type { ApprovalRecord, ProposedAction } from "@/lib/mock/types";
import { cn } from "@/lib/utils";

const kindLabel: Record<ProposedAction["kind"], string> = {
  send_message: "Outreach",
  create_support_referral: "Referral",
  schedule_appointment: "Appointment",
  create_followup_task: "Follow-up",
};

const riskTone = { low: "slate", medium: "amber", high: "rose" } as const;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });
}

export default function ApprovalsPage() {
  const [queue, setQueue] = useState<ProposedAction[]>(proposedActions);
  const [history, setHistory] = useState<ApprovalRecord[]>(decisionHistory);
  const [selectedId, setSelectedId] = useState<string | undefined>(proposedActions[0]?.id);
  const [mode, setMode] = useState<"review" | "edit" | "reject">("review");
  const [editedDraft, setEditedDraft] = useState("");
  const [reason, setReason] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);

  const selected = useMemo(
    () => queue.find((action) => action.id === selectedId),
    [queue, selectedId],
  );

  function decide(action: ProposedAction, decision: ApprovalRecord["decision"]) {
    const record: ApprovalRecord = {
      id: `dec_${Date.now()}`,
      actionId: action.id,
      actionTitle: action.title,
      studentName: action.studentName,
      decidedBy: "Dr. R. Okafor",
      decidedAt: new Date().toISOString(),
      decision,
      reason: decision === "rejected" ? reason : undefined,
      auditEntry: `A-${1043 + history.length}`,
    };

    setHistory((current) => [record, ...current]);
    setQueue((current) => current.filter((item) => item.id !== action.id));
    setReceipt(
      decision === "rejected"
        ? `Rejected · ${action.studentName} · reason recorded · ledger ${record.auditEntry}`
        : `Approved by Dr. R. Okafor · ${timeLabel(record.decidedAt)} · ledger ${record.auditEntry}`,
    );
    setSelectedId(undefined);
    setMode("review");
    setEditedDraft("");
    setReason("");
  }

  const review = selected ? (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={riskTone[selected.riskClass]}>{selected.riskClass} risk</Badge>
            <Badge tone="outline">{kindLabel[selected.kind]}</Badge>
            <span className="tnum flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" aria-hidden="true" />
              SLA {timeLabel(selected.slaDueAt)}
            </span>
          </div>
          <h2 className="mt-2 text-base font-semibold tracking-tight text-slate-900">
            {selected.title}
          </h2>
          <p className="text-[12px] text-slate-500">
            {selected.studentName} · assigned to {selected.assignee}
          </p>
        </div>
        <ProvenanceBadge kind="needs-approval" />
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {mode === "edit" ? "Edit before approving" : "Drafted message"}
        </p>
        {mode === "edit" ? (
          <textarea
            value={editedDraft}
            onChange={(event) => setEditedDraft(event.target.value)}
            rows={7}
            className="w-full rounded-lg border border-brand-300 bg-white p-3 text-[13px] leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        ) : (
          <blockquote className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-[13px] leading-relaxed text-slate-700">
            {selected.draft}
          </blockquote>
        )}
        <p className="mt-1.5 text-[11px] text-slate-400">
          Placeholders such as attendance are substituted from the record at send time — the draft
          contains no invented numbers.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Evidence
          </p>
          <EvidenceList items={selected.evidence} />
        </div>
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Why this, now
            </p>
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-[12px] leading-relaxed text-slate-600">
              {selected.rationale}
            </p>
          </div>
          <BlastRadius writes={selected.blastRadius} />
          <p className="text-[11px] text-slate-400">
            Confidence {(selected.confidence * 100).toFixed(0)}% · computed from signal strength, not
            from the model&apos;s opinion of itself.
          </p>
        </div>
      </div>

      {mode === "reject" ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <label htmlFor="reject-reason" className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
            Reason (required)
          </label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder="Why is this action not appropriate?"
            className="mt-1.5 w-full rounded-lg border border-rose-200 bg-white p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
          <div className="mt-2 flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={reason.trim().length < 10}
              onClick={() => decide(selected, "rejected")}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Confirm rejection
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("review")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Button variant="primary" size="sm" onClick={() => decide(selected, "approved")}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Approve
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (mode === "edit") {
                decide(selected, "edited");
              } else {
                setEditedDraft(selected.draft);
                setMode("edit");
              }
            }}
          >
            {mode === "edit" ? (
              <>
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Approve with edit
              </>
            ) : (
              <>
                <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                Edit first
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMode("reject")}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Reject
          </Button>
        </div>
      )}
    </div>
  ) : (
    <EmptyState
      title="Nothing waiting for you"
      description="Every drafted action has been decided. New drafts arrive after the nightly sweep, and only ever as proposals."
      action={
        <Button size="sm" variant="outline" onClick={() => setQueue(proposedActions)}>
          Reset demo queue
        </Button>
      }
    />
  );

  const historyPanel = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
            <th className="py-2 pr-4 font-medium">Decision</th>
            <th className="py-2 pr-4 font-medium">Action</th>
            <th className="py-2 pr-4 font-medium">Student</th>
            <th className="py-2 pr-4 font-medium">By</th>
            <th className="py-2 pr-4 font-medium">When</th>
            <th className="py-2 font-medium">Ledger</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record) => (
            <tr key={record.id} className="border-b border-slate-100 last:border-0">
              <td className="py-2.5 pr-4">
                <Badge
                  tone={
                    record.decision === "rejected"
                      ? "rose"
                      : record.decision === "edited"
                        ? "amber"
                        : "emerald"
                  }
                >
                  {record.decision}
                </Badge>
              </td>
              <td className="py-2.5 pr-4 text-[12px] text-slate-700">
                {record.actionTitle}
                {record.reason ? (
                  <span className="mt-0.5 block text-[11px] text-slate-400">“{record.reason}”</span>
                ) : null}
              </td>
              <td className="py-2.5 pr-4 text-[12px] text-slate-600">{record.studentName}</td>
              <td className="py-2.5 pr-4 text-[12px] text-slate-600">{record.decidedBy}</td>
              <td className="tnum py-2.5 pr-4 text-[12px] text-slate-500">
                {new Date(record.decidedAt).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </td>
              <td className="py-2.5 font-mono text-[11px] text-slate-400">{record.auditEntry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageHeader
        eyebrow="Arbiter · Governance"
        title="No action executes without a named approval"
        description="Every AI-drafted action stops here. Approve, edit, or reject with a reason — and the decision is written to the ledger."
        actions={<Badge tone="indigo">{queue.length} waiting</Badge>}
      />

      {receipt ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {receipt}
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="ml-auto text-[11px] underline"
          >
            dismiss
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader title="Queue" description="Ordered by SLA, then risk class" />
          <CardBody className="space-y-1.5">
            {queue.length === 0 ? (
              <p className="px-1 py-3 text-[12px] text-slate-500">Queue is empty.</p>
            ) : (
              queue.map((action) => {
                const active = action.id === selectedId;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(action.id);
                      setMode("review");
                    }}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-brand-200 bg-brand-50/60"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-medium text-slate-900">
                        {action.studentName}
                      </span>
                      <Badge tone={riskTone[action.riskClass]}>{action.riskClass}</Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                      {action.title}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                      SLA {timeLabel(action.slaDueAt)} · {kindLabel[action.kind]}
                      <ChevronRight className="ml-auto h-3 w-3" aria-hidden="true" />
                    </p>
                  </button>
                );
              })
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Tabs
              items={[
                { id: "review", label: "Review" },
                { id: "history", label: "Decision history", badge: String(history.length) },
              ]}
              panels={{ review, history: historyPanel }}
            />
          </CardBody>
        </Card>
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        Approvals here are simulated in the browser. In the real system the decision is a
        compare-and-set on the approval row, the payload is frozen at review time, and the executor
        runs only after that write commits.
      </p>
    </>
  );
}
