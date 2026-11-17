import { ArrowRight } from "lucide-react";

const steps = [
  { k: "Signal", v: "Attendance, marks and submissions change upstream." },
  { k: "Score", v: "Weighted features produce a reproducible number." },
  { k: "Case", v: "The student is ranked and assigned an owner." },
  { k: "Draft", v: "An agent writes the next step — never executes it." },
  { k: "Decision", v: "A named advisor approves, edits or rejects." },
];

/** A single horizontal trace instead of a numbered explainer card. */
export function Pipeline() {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Signal → decision
        </h2>
        <span className="hidden text-[11px] text-slate-400 sm:inline">
          nothing writes before step five
        </span>
      </div>

      <ol className="relative grid gap-3 sm:grid-cols-5 sm:gap-0">
        <span
          className="absolute left-0 right-0 top-[3.5px] hidden h-px bg-slate-300 sm:block"
          aria-hidden="true"
        />
        {steps.map((step, index) => (
          <li key={step.k} className="relative flex gap-3 sm:block sm:pr-3">
            <span className="relative z-10 mt-0.5 flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-slate-900 sm:mt-0" aria-hidden="true" />
            <div className="sm:mt-3">
              <p className="text-[11px] font-semibold text-slate-900">
                <span className="tnum mr-1 text-slate-400">0{index + 1}</span>
                {step.k}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{step.v}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
        Steps 1–4 only propose. Step 5 is the only place an academic record can change.
      </p>
    </section>
  );
}
