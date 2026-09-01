"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";

type Event = {
  id: string;
  type: string;
  summary: string;
  detail: string | null;
  eventAt: string;
  entityName?: string | null;
  entityType?: string | null;
  caseId?: string | null;
};

const TYPE_COLOR: Record<string, string> = {
  COMMUNICATION: "#34d399",
  VISIT: "#60a5fa",
  LOCATION: "#f472b6",
  FINANCIAL: "#f87171",
  VEHICLE: "#fbbf24",
  GENERAL: "#8b9bb4",
};

export default function TimelinePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [meta, setMeta] = useState<{ entities: string[]; types: string[] }>({ entities: [], types: [] });

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/intel-data?scope=timeline");
      const data = await res.json();
      setEvents(data.events ?? []);
      setMeta({ entities: data.entities ?? [], types: data.types ?? [] });
      setLoading(false);
    })();
  }, []);

  const filtered = events
    .filter((e) => typeFilter === "ALL" || e.type === typeFilter)
    .filter((e) => entityFilter === "ALL" || e.entityName === entityFilter)
    .filter((e) => !from || new Date(e.eventAt) >= new Date(from))
    .filter((e) => !to || new Date(e.eventAt) <= new Date(to))
    .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Timeline Analysis"
        description="Chronological event view with person, location, type and date filters."
        icon={CalendarDays}
        badge="Chronological"
      />

      <Card className="p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="ALL">All event types</option>
            {meta.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            <option value="ALL">All entities</option>
            {meta.entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </Card>

      {loading ? (
        <Card>
          <LoadingState label="Loading timeline…" />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No events match the filters" />
        </Card>
      ) : (
        <div className="relative ml-3 space-y-5 pl-6 before:absolute before:left-0 before:top-1 before:h-full before:w-px before:bg-border">
          {filtered.map((e) => (
            <div key={e.id} className="relative">
              <span
                className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full ring-4 ring-surface"
                style={{ background: TYPE_COLOR[e.type] ?? "#8b9bb4" }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">
                  {new Date(e.eventAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                </span>
                <Badge variant="outline" className="uppercase">{e.type}</Badge>
              </div>
              <p className="mt-0.5 text-sm font-medium text-foreground">{e.summary}</p>
              {e.detail ? <p className="text-xs text-muted">{e.detail}</p> : null}
              {e.entityName ? <p className="mt-0.5 text-[11px] text-muted">Entity: {e.entityName}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
