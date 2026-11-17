import Link from "next/link";

const centre = { x: 200, y: 110 };

const nodes = [
  { id: "cs301", label: "CS301", sub: "Operating Systems", x: 60, y: 40, tone: "#f43f5e" },
  { id: "cs302", label: "CS302", sub: "Databases", x: 60, y: 180, tone: "#94a3b8" },
  { id: "iyer", label: "Dr. Iyer", sub: "Faculty", x: 340, y: 40, tone: "#6366f1" },
  { id: "okafor", label: "Dr. Okafor", sub: "Advisor", x: 340, y: 180, tone: "#10b981" },
  { id: "case", label: "Case #2041", sub: "High · open", x: 200, y: 20, tone: "#f59e0b" },
  { id: "int", label: "Outreach", sub: "Awaiting approval", x: 200, y: 200, tone: "#a855f7" },
];

export function MiniGraph() {
  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 400 220"
        className="h-auto w-full"
        role="img"
        aria-label="Relationship map around one student: subjects, faculty, advisor, risk case and intervention"
      >
        {nodes.map((node) => (
          <line
            key={`edge-${node.id}`}
            x1={centre.x}
            y1={centre.y}
            x2={node.x}
            y2={node.y}
            stroke="#e2e8f0"
            strokeWidth="1.25"
          />
        ))}

        <circle cx={centre.x} cy={centre.y} r="30" fill="#0f172a" />
        <text
          x={centre.x}
          y={centre.y - 2}
          textAnchor="middle"
          fill="#ffffff"
          style={{ fontSize: 9, fontWeight: 600 }}
        >
          Aarav
        </text>
        <text x={centre.x} y={centre.y + 9} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 7 }}>
          student
        </text>

        {nodes.map((node) => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="5" fill={node.tone} />
            <text
              x={node.x}
              y={node.y - 9}
              textAnchor="middle"
              fill="#0f172a"
              style={{ fontSize: 8, fontWeight: 600 }}
            >
              {node.label}
            </text>
            <text x={node.x} y={node.y + 15} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 7 }}>
              {node.sub}
            </text>
          </g>
        ))}
      </svg>
      <p className="text-[11px] leading-snug text-slate-500">
        One change — a failed prerequisite, a missed lab — reaches every node connected to it. The
        graph is a view over the academic tables, not a second copy.{" "}
        <Link href="/graph" className="font-medium text-brand-700 hover:underline">
          Open the full map
        </Link>
      </p>
    </div>
  );
}
