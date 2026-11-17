import { PageHeader } from "@/components/layout/app-shell";

const milestones = [
  { label: "Phase 0 — Repository and engineering foundation", state: "implemented" },
  { label: "Phase 1 — Tenant-first database (GUC + RLS)", state: "implemented" },
  { label: "Phase 1.5 — Authentication & governance design", state: "design" },
  { label: "Phase 2 — Authentication and authorization", state: "planned" },
  { label: "Phase 3 — Policy and execution boundary", state: "planned" },
  { label: "Phase 4 — Deterministic risk queue and approval flow", state: "planned" },
  { label: "Phase 5 — Audit ledger and verification", state: "planned" },
] as const;

const stateStyle: Record<string, { label: string; className: string }> = {
  implemented: { label: "implemented", className: "bg-emerald-50 text-emerald-700" },
  design: { label: "design only", className: "bg-indigo-50 text-indigo-700" },
  planned: { label: "planned", className: "bg-slate-100 text-slate-500" },
};

export default function StatusPage() {
  return (
    <>
      <PageHeader
        eyebrow="Build status"
        title="What is real, and what is not"
        description="This page reflects the repository, not intent. A milestone is marked implemented only after its acceptance tests have been executed."
      />

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl2 border border-slate-200 bg-white">
        {milestones.map((milestone) => {
          const style = stateStyle[milestone.state] ?? stateStyle.planned;
          return (
            <li
              key={milestone.label}
              className="flex items-center justify-between gap-4 px-5 py-3 text-[13px]"
            >
              <span className="text-slate-700">{milestone.label}</span>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${style?.className ?? ""}`}>
                {style?.label ?? milestone.state}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 rounded-xl2 border border-slate-200 bg-white p-5">
        <h2 className="text-[13px] font-semibold text-slate-900">About this prototype</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
          The dashboards, student records, recommendations and approvals shown in this build are
          sample data. There is no live database connection in the interface, no authentication, no
          model calls, and no action is executed. The database itself (17 tenant-scoped tables with
          row-level security) exists and is migration-managed; the screens do not read from it.
        </p>
      </div>
    </>
  );
}
