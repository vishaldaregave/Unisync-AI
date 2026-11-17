import Link from "next/link";

import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const nodes = [
  { id: "student", label: "Aarav Menon", sub: "student", x: 300, y: 180, r: 26, fill: "#0f172a", text: "#fff" },
  { id: "cs301", label: "CS301", sub: "OS · 62% att.", x: 120, y: 90, r: 18, fill: "#fecdd3", text: "#9f1239" },
  { id: "cs302", label: "CS302", sub: "Databases", x: 120, y: 270, r: 18, fill: "#e2e8f0", text: "#334155" },
  { id: "iyer", label: "Dr. Iyer", sub: "faculty", x: 480, y: 90, r: 18, fill: "#e0e7ff", text: "#3730a3" },
  { id: "okafor", label: "Dr. Okafor", sub: "advisor", x: 480, y: 270, r: 18, fill: "#d1fae5", text: "#065f46" },
  { id: "case", label: "Case 2041", sub: "high · open", x: 300, y: 50, r: 16, fill: "#fef3c7", text: "#92400e" },
  { id: "int", label: "Outreach", sub: "awaiting approval", x: 300, y: 310, r: 16, fill: "#ede9fe", text: "#5b21b6" },
  { id: "course", label: "B.Tech CS", sub: "programme", x: 300, y: 180, r: 0, fill: "none", text: "none" },
];

const edges: { from: string; to: string; label: string }[] = [
  { from: "student", to: "cs301", label: "enrolled_in" },
  { from: "student", to: "cs302", label: "enrolled_in" },
  { from: "iyer", to: "cs301", label: "teaches" },
  { from: "okafor", to: "student", label: "advises" },
  { from: "student", to: "case", label: "raises" },
  { from: "case", to: "int", label: "addressed_by" },
  { from: "cs301", to: "cs302", label: "prerequisite" },
];

function nodeById(id: string) {
  return nodes.find((node) => node.id === id);
}

export default function GraphPage() {
  return (
    <>
      <PageHeader
        eyebrow="Graph · Relationships"
        title="What one office learns, every office benefits from"
        description="A relationship map over the academic tables — not a second copy of them. One change reaches the plan, the support case and the advisor without anyone being told."
        actions={<Badge tone="slate">depth 2 · 7 nodes</Badge>}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Neighbourhood" description="Student, subjects, staff, case and intervention" />
          <CardBody>
            <svg viewBox="0 0 600 360" className="h-auto w-full" role="img" aria-label="Relationship graph">
              {edges.map((edge) => {
                const from = nodeById(edge.from);
                const to = nodeById(edge.to);
                if (!from || !to) return null;
                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#e2e8f0"
                      strokeWidth="1.5"
                    />
                    <text
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 4}
                      textAnchor="middle"
                      fill="#94a3b8"
                      style={{ fontSize: 7, fontFamily: "ui-monospace, monospace" }}
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {nodes
                .filter((node) => node.r > 0)
                .map((node) => (
                  <g key={node.id}>
                    <circle cx={node.x} cy={node.y} r={node.r} fill={node.fill} />
                    <text
                      x={node.x}
                      y={node.y - node.r - 7}
                      textAnchor="middle"
                      fill="#334155"
                      style={{ fontSize: 9, fontWeight: 600 }}
                    >
                      {node.label}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + node.r + 11}
                      textAnchor="middle"
                      fill="#94a3b8"
                      style={{ fontSize: 8 }}
                    >
                      {node.sub}
                    </text>
                  </g>
                ))}
            </svg>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader title="Consequence, without a meeting" />
            <CardBody>
              <ol className="space-y-2.5 text-[12px] leading-relaxed text-slate-600">
                {[
                  "A mark posts and CS301 slips below the prerequisite threshold.",
                  "The dependent subject edges light up — CS310 assumes CS301.",
                  "The risk case re-scores; the advisor already owns it.",
                  "An outreach draft appears for approval, citing the same evidence.",
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[9px] font-semibold text-white">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Design note" />
            <CardBody>
              <p className="text-[12px] leading-relaxed text-slate-600">
                Only genuine data is stored as edges — prerequisites and intervention links. Enrolment,
                teaching and advising are derived from the academic tables at query time, so the map
                cannot drift from the record.
              </p>
              <Link
                href="/students/aarav-menon"
                className="mt-3 inline-block text-[12px] font-medium text-indigo-700 hover:underline"
              >
                Open the student behind this graph →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
