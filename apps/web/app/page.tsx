const milestones = [
  { label: "Phase 0 — Repository and engineering foundation", state: "implemented" },
  { label: "Phase 1 — Tenant-first database (GUC + RLS)", state: "planned" },
  { label: "Phase 2 — Authentication and authorization", state: "planned" },
  { label: "Phase 3 — Policy and execution boundary", state: "planned" },
  { label: "Phase 4 — Deterministic risk queue and approval flow", state: "planned" },
  { label: "Phase 5 — Audit ledger and verification", state: "planned" },
] as const;

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          UniSync AI
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Academic coordination, with a human on every decision.
        </h1>
        <p className="max-w-2xl text-slate-600">
          This deployment is the M1a governance spine: seeded institution, deterministic risk
          queue, proposed action, human approval, authorised execution and a verifiable audit
          ledger. It makes no AI calls.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Build status
        </h2>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {milestones.map((milestone) => (
            <li
              key={milestone.label}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="text-slate-700">{milestone.label}</span>
              <span
                className={
                  milestone.state === "implemented"
                    ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                    : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"
                }
              >
                {milestone.state}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Status reflects the repository, not intent. A milestone is marked implemented only after
          its acceptance tests have been executed.
        </p>
      </section>
    </main>
  );
}
