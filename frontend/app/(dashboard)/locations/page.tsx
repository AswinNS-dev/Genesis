"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";

type Location = {
  id: string;
  name: string;
  entities: { name: string; type: string }[];
  activity: number;
};

// Fictional map markers (x%, y% within the panel).
const MARKERS: Record<string, { x: number; y: number }> = {
  "Sector 18": { x: 30, y: 32 },
  "Central Market": { x: 48, y: 58 },
  "Industrial Area": { x: 32, y: 74 },
  "Vasant Vihar": { x: 68, y: 28 },
  "Nehru Place": { x: 72, y: 62 },
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/intel-data?scope=locations");
      const data = await res.json();
      setLocations(data.locations ?? []);
      setLoading(false);
    })();
  }, []);

  const mostLinked = [...locations].sort((a, b) => b.entities.length - a.entities.length);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Location Analysis"
        description="Locations connected to entities, shared and repeated locations, and activity."
        icon={MapPin}
        badge="Geo-links"
      />

      {loading ? (
        <Card>
          <LoadingState label="Loading location data…" />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Map panel */}
          <Card className="lg:col-span-3">
            <CardHeader title="Activity map" description="Fictional demo locations" />
            <CardContent>
              <div className="relative h-[420px] overflow-hidden rounded-lg border border-border bg-[#0a1322]">
                {/* Grid */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`h${i}`} className="absolute left-0 right-0 border-t border-white/5" style={{ top: `${(i + 1) * 12.5}%` }} />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={`v${i}`} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: `${(i + 1) * 8.33}%` }} />
                ))}
                {/* Roads */}
                <div className="absolute left-[40%] top-0 h-full w-px bg-accent/10" />
                <div className="absolute left-0 top-[55%] h-px w-full bg-accent/10" />
                {/* Markers */}
                {locations.map((l) => {
                  const m = MARKERS[l.name] ?? { x: 50, y: 50 };
                  const size = 14 + l.entities.length * 4;
                  return (
                    <div key={l.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${m.x}%`, top: `${m.y}%` }}>
                      <div
                        className="flex items-center justify-center rounded-full bg-accent/25 ring-2 ring-accent/50"
                        style={{ width: size, height: size }}
                      />
                      <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted">
                        {l.name}
                      </span>
                    </div>
                  );
                })}
                <div className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-1 text-[10px] text-muted">
                  Fictional demo map — not geospatially accurate
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location details */}
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader title="Most linked locations" description="Highest entity association" />
              <CardContent>
                {mostLinked.length === 0 ? (
                  <EmptyState title="No locations" />
                ) : (
                  <div className="space-y-2">
                    {mostLinked.slice(0, 5).map((l, i) => (
                      <div key={l.id} className="flex items-center gap-3">
                        <span className="w-4 text-sm text-muted">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">{l.name}</p>
                          <p className="text-[11px] text-muted">{l.entities.length} linked entities</p>
                        </div>
                        <Badge variant="outline">{l.activity} records</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Repeated / shared locations" description="Entities independently linked" />
              <CardContent>
                {locations.length === 0 ? (
                  <EmptyState title="No locations" />
                ) : (
                  <div className="space-y-3">
                    {locations.map((l) => (
                      <div key={l.id} className="rounded-lg border border-border bg-surface-raised/40 p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-pink-400" />
                          <span className="text-sm font-medium text-foreground">{l.name}</span>
                          <Badge variant="warning" className="ml-auto">
                            {l.entities.length} entities
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {l.entities.map((e) => (
                            <span key={e.name} className="rounded bg-border/40 px-1.5 py-0.5 text-[10px] text-muted">
                              {e.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
