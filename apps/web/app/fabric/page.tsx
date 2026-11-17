import { CheckCircle2, CircleAlert, Database, Plug } from "lucide-react";

import { FabricDiagram, SourceCard } from "@/components/domain/source-card";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { dataSources } from "@/lib/mock/data";

const syncRuns = [
  { id: "sync_8841", source: "Canvas LMS", started: "09:02", rows: 2410, duration: "42s", result: "ok" },
  { id: "sync_8840", source: "Ellucian Banner", started: "09:01", rows: 4128, duration: "1m 08s", result: "ok" },
  { id: "sync_8839", source: "Assessment Store", started: "09:00", rows: 7340, duration: "2m 11s", result: "ok" },
  { id: "sync_8838", source: "Salesforce", started: "21:40", rows: 0, duration: "18s", result: "degraded" },
];

export default function FabricPage() {
  return (
    <>
      <PageHeader
        eyebrow="Fabric · Data unification"
        title="Every system, one student record"
        description="Signals live in different systems under different identifiers. Fabric reads them where they are and composes one record — nothing is migrated, and every source stays authoritative for its own data."
        actions={<Badge tone="slate">4 sources · read-only</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dataSources.map((source) => (
          <SourceCard key={source.id} source={source} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Identity resolution"
            description="Four identifiers resolve to one student before any reasoning starts"
          />
          <CardBody>
            <FabricDiagram sources={dataSources} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent sync runs" description="Connector activity · last 24 hours" />
          <CardBody className="p-0">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Rows</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="text-[12px] text-slate-800">{run.source}</p>
                      <p className="tnum text-[10px] text-slate-400">started {run.started}</p>
                    </td>
                    <td className="tnum px-4 py-2.5 text-[12px] text-slate-600">
                      {run.rows.toLocaleString()}
                    </td>
                    <td className="tnum px-4 py-2.5 text-[12px] text-slate-600">{run.duration}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={run.result === "ok" ? "emerald" : "amber"}>{run.result}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader title="What this build actually does" description="Stated plainly" />
          <CardBody>
            <ul className="space-y-2.5 text-[12px] leading-relaxed text-slate-600">
              <li className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                <span>
                  A real PostgreSQL database exists with 17 tenant-scoped tables, row-level security
                  and two migrations applied.
                </span>
              </li>
              <li className="flex gap-2">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                <span>
                  The connectors on this page are illustrative. No SIS, LMS or CRM is connected, and
                  nothing on this screen is read from the database.
                </span>
              </li>
              <li className="flex gap-2">
                <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                <span>
                  There is no write-back. Every source is presented as read-only until an approval
                  and executor path exists.
                </span>
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Connector contract" description="What a real integration must satisfy" />
          <CardBody>
            <dl className="space-y-3 text-[12px]">
              {[
                ["Scope", "Named tables and fields only; deny by default."],
                ["Writes", "Wait for a named human approval; never performed by an agent."],
                ["Ledger", "Every read and write lands on the audit trail."],
                ["Ownership", "The source system stays authoritative for its own data."],
              ].map(([term, definition]) => (
                <div key={term} className="flex gap-3">
                  <dt className="w-20 shrink-0 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {term}
                  </dt>
                  <dd className="text-slate-600">{definition}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              <Database className="h-3 w-3" aria-hidden="true" />
              Read in place
              <Plug className="ml-2 h-3 w-3" aria-hidden="true" />
              Compose per student
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
