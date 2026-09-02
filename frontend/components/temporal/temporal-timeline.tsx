"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Phone,
  MapPin,
  Coins,
  Car,
  Eye,
  Calendar,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/state";
import { cn } from "@/lib/utils";
import type { ActivityDetail } from "@backend/services/temporal.service";

interface TemporalTimelineProps {
  timeline: ActivityDetail[];
  unassignedActivities: ActivityDetail[];
  crimeTimestamp: string;
  crimeTitle: string;
  crimeCaseId: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  COMMUNICATION: {
    label: "Communication",
    color: "#34d399",
    bg: "rgba(52, 211, 153, 0.12)",
    icon: Phone,
  },
  VISIT: {
    label: "Visit",
    color: "#60a5fa",
    bg: "rgba(96, 165, 250, 0.12)",
    icon: Eye,
  },
  LOCATION: {
    label: "Location",
    color: "#f472b6",
    bg: "rgba(244, 114, 182, 0.12)",
    icon: MapPin,
  },
  FINANCIAL: {
    label: "Financial",
    color: "#f87171",
    bg: "rgba(248, 113, 113, 0.12)",
    icon: Coins,
  },
  VEHICLE: {
    label: "Vehicle",
    color: "#fbbf24",
    bg: "rgba(251, 191, 36, 0.12)",
    icon: Car,
  },
  GENERAL: {
    label: "General",
    color: "#8b9bb4",
    bg: "rgba(139, 155, 180, 0.12)",
    icon: Clock,
  },
};

export function TemporalTimeline({
  timeline,
  unassignedActivities,
  crimeTimestamp,
  crimeTitle,
  crimeCaseId,
}: TemporalTimelineProps) {
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedSector, setSelectedSector] = useState<"ALL" | "BEFORE" | "AFTER">("ALL");
  const [selectedEntity, setSelectedEntity] = useState<string>("ALL");

  const uniqueEntities = useMemo(() => {
    const set = new Set<string>();
    for (const ev of timeline) {
      if (ev.entityName) set.add(ev.entityName);
    }
    return Array.from(set).sort();
  }, [timeline]);

  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    for (const ev of timeline) {
      set.add(ev.type);
    }
    return Array.from(set).sort();
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter((ev) => {
      if (selectedType !== "ALL" && ev.type !== selectedType) return false;
      if (selectedSector === "BEFORE" && ev.minutesFromCrime >= 0) return false;
      if (selectedSector === "AFTER" && ev.minutesFromCrime < 0) return false;
      if (selectedEntity !== "ALL" && ev.entityName !== selectedEntity) return false;
      return true;
    });
  }, [timeline, selectedType, selectedSector, selectedEntity]);

  const beforeEvents = filteredTimeline.filter((e) => e.minutesFromCrime < 0);
  const afterEvents = filteredTimeline.filter((e) => e.minutesFromCrime >= 0);

  const crimeDate = new Date(crimeTimestamp);

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Filter className="h-3.5 w-3.5 text-accent" />
            <span className="font-medium">Filter by:</span>
          </div>

          {/* Sector Filter */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setSelectedSector("ALL")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                selectedSector === "ALL"
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-foreground"
              )}
            >
              All Window ({filteredTimeline.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSector("BEFORE")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                selectedSector === "BEFORE"
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-muted hover:text-foreground"
              )}
            >
              Before ({beforeEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSector("AFTER")}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                selectedSector === "AFTER"
                  ? "bg-purple-500/15 text-purple-400"
                  : "text-muted hover:text-foreground"
              )}
            >
              After ({afterEvents.length})
            </button>
          </div>

          {/* Activity Type Dropdown */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            aria-label="Filter activities by type"
            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All Activity Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {TYPE_CONFIG[t]?.label ?? t}
              </option>
            ))}
          </select>

          {/* Entity Dropdown */}
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            aria-label="Filter activities by entity"
            className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="ALL">All Entities ({uniqueEntities.length})</option>
            {uniqueEntities.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>
        </div>

        {unassignedActivities.length > 0 ? (
          <Badge variant="outline" className="text-[11px] text-muted">
            {unassignedActivities.length} unassigned event
            {unassignedActivities.length === 1 ? "" : "s"} in window
          </Badge>
        ) : null}
      </div>

      {/* Visual Timeline Header / Sector Bar */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              Before Crime Window
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-foreground">
            {beforeEvents.length} events
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 ring-1 ring-rose-500/20">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500" />
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              Crime Reference Point
            </span>
          </div>
          <span className="font-mono text-xs text-rose-300">
            {crimeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-400" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              After Crime Window
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-foreground">
            {afterEvents.length} events
          </span>
        </div>
      </div>

      {filteredTimeline.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8">
          <EmptyState
            title="No timeline activities match the selected filters"
            description="Try selecting a wider window or resetting activity filters."
          />
        </div>
      ) : (
        <div className="relative space-y-4">
          {/* Chronological Spine */}
          <div className="relative ml-4 space-y-4 pl-6 before:absolute before:left-0 before:top-2 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-amber-500/40 before:via-rose-500/60 before:to-purple-500/40">
            {/* BEFORE ACTIVITIES */}
            {beforeEvents.map((ev) => (
              <TimelineEventCard key={ev.id} event={ev} />
            ))}

            {/* CRIME REFERENCE MARKER */}
            <div className="relative -ml-6 my-6 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-surface to-rose-950/40 p-4 shadow-lg ring-1 ring-rose-500/30">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold tracking-wide text-rose-400">
                        REFERENCE CRIME / INCIDENT
                      </span>
                      <Badge variant="danger" className="text-[10px]">
                        {crimeCaseId}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{crimeTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-mono">
                    {crimeDate.toLocaleDateString()} {crimeDate.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* AFTER ACTIVITIES */}
            {afterEvents.map((ev) => (
              <TimelineEventCard key={ev.id} event={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineEventCard({ event }: { event: ActivityDetail }) {
  const isBefore = event.minutesFromCrime < 0;
  const absMins = Math.abs(event.minutesFromCrime);
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;
  const timeOffsetStr =
    hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.GENERAL;
  const Icon = config.icon;
  const evDate = new Date(event.eventAt);

  return (
    <div className="relative group">
      {/* Node Dot on Spine */}
      <span
        className="absolute -left-6 top-3 h-3 w-3 -translate-x-[5px] rounded-full ring-4 ring-surface transition-transform group-hover:scale-125"
        style={{
          background: isBefore ? "#f59e0b" : "#c084fc",
          boxShadow: isBefore
            ? "0 0 10px rgba(245, 158, 11, 0.4)"
            : "0 0 10px rgba(192, 132, 252, 0.4)",
        }}
      />

      {/* Card Content */}
      <div className="rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-accent/40 hover:bg-surface-raised/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left Metadata & Tag */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: config.color, background: config.bg }}
            >
              <Icon className="h-3 w-3" />
              {config.label}
            </span>

            {event.entityName ? (
              <Badge variant="outline" className="text-xs font-medium">
                {event.entityName}
              </Badge>
            ) : (
              <span className="text-[11px] italic text-muted">Unassigned Activity</span>
            )}
          </div>

          {/* Right Timestamp & Relative Offset */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[11px] font-bold",
                isBefore
                  ? "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                  : "border border-purple-500/30 bg-purple-500/10 text-purple-400"
              )}
            >
              {isBefore ? `-${timeOffsetStr} BEFORE` : `+${timeOffsetStr} AFTER`}
            </span>

            <span className="font-mono text-xs text-muted">
              {evDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Summary */}
        <p className="mt-2 text-sm font-medium text-foreground">{event.summary}</p>

        {/* Detail if present */}
        {event.detail ? (
          <p className="mt-1 text-xs text-muted leading-relaxed">{event.detail}</p>
        ) : null}
      </div>
    </div>
  );
}
