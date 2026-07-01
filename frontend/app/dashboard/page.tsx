"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  type KnowledgeSystem,
  type BusFactorRisk,
  type StaleKnowledge,
  type InterviewRecommendation,
  getKnowledgeSystems,
  getBusFactorRisks,
  getStaleKnowledge,
  getInterviewRecommendations,
} from "@/lib/mock-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function CoverageBar({ value, hasWarning }: { value: number; hasWarning: boolean }) {
  const color =
    value >= 70
      ? "bg-green-500"
      : value >= 40
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground">
        {value}%
      </span>
      {hasWarning && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5 text-amber-500"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [systems, setSystems] = useState<KnowledgeSystem[]>([]);
  const [busFactor, setBusFactor] = useState<BusFactorRisk[]>([]);
  const [stale, setStale] = useState<StaleKnowledge[]>([]);
  const [queue, setQueue] = useState<InterviewRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getKnowledgeSystems(),
      getBusFactorRisks(),
      getStaleKnowledge(),
      getInterviewRecommendations(),
    ]).then(([sys, bus, stl, q]) => {
      setSystems(sys);
      setBusFactor(bus);
      setStale(stl);
      setQueue(q);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 space-y-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-lg bg-secondary/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Knowledge health across your systems
        </p>
      </div>

      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Knowledge Health
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {systems.map((sys) => (
            <div key={sys.id} className="rounded-lg bg-secondary/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground truncate">
                  {sys.name}
                </p>
              </div>
              <CoverageBar value={sys.coveragePercent} hasWarning={sys.hasWarning} />
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{sys.ownerCount} owner{sys.ownerCount !== 1 ? "s" : ""}</span>
                <span>Updated {sys.lastUpdated}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Bus Factor Risk
          </h2>
          <div className="space-y-3">
            {busFactor.map((risk) => (
              <div
                key={risk.engineerId}
                className="rounded-lg bg-secondary/50 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-2 rounded-full bg-red-500" />
                  <p className="text-sm font-medium text-foreground">
                    {risk.engineerName}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground ml-4">
                  Sole expert: {risk.soleExpertFor}
                </p>
                <p className="text-xs text-muted-foreground ml-4">
                  Tenure: {risk.tenure}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 ml-4 text-primary">
                  Interview Now
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
            Stale Knowledge
          </h2>
          <div className="space-y-3">
            {stale.map((entry) => (
              <div
                key={entry.systemId}
                className="rounded-lg bg-secondary/50 p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4 text-amber-500"
                  >
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <p className="text-sm font-medium text-foreground">
                    {entry.systemName}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {entry.staleNodeCount} stale nodes ({entry.staleDays}d)
                </p>
                <p className="text-xs text-muted-foreground ml-6">
                  Trigger: {entry.trigger}
                </p>
                <Button variant="ghost" size="sm" className="mt-2 ml-6 text-primary">
                  Recommend Interview
                </Button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Interview Queue
        </h2>
        <div className="rounded-lg bg-secondary/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground">Engineer</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Trigger</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Systems</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((rec) => (
                <TableRow key={rec.engineerId} className="border-border">
                  <TableCell className="text-sm text-foreground">
                    {rec.engineerName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rec.trigger}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rec.systems.join(", ")}
                  </TableCell>
                  <TableCell className="text-right">
                    {rec.action === "priority" ? (
                      <Button size="sm" variant="destructive">
                        Priority
                      </Button>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="text-primary">
                          Send
                        </Button>
                        <Button size="sm" variant="ghost" className="text-muted-foreground">
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Departure Flow
        </h2>
        <div className="rounded-lg bg-secondary/50 p-4 flex items-center gap-3">
          <input
            type="text"
            placeholder="Search engineer..."
            className="flex-1 rounded-md bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button variant="destructive" size="sm">
            Mark as Departing
          </Button>
        </div>
      </section>
    </div>
  );
}
