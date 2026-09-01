"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Phone,
  Car,
  MapPin,
  Building2,
  FolderKanban,
  FileText,
  Loader2,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SearchType =
  | "PERSON"
  | "PHONE"
  | "VEHICLE"
  | "LOCATION"
  | "ORGANIZATION"
  | "CASE"
  | "EVIDENCE";

type SearchResult = {
  type: SearchType;
  id: string;
  label: string;
  subtitle?: string;
  matches: string[];
};

const TYPE_META: Record<
  SearchType,
  { label: string; icon: LucideIcon }
> = {
  PERSON: { label: "Person", icon: User },
  PHONE: { label: "Phone", icon: Phone },
  VEHICLE: { label: "Vehicle", icon: Car },
  LOCATION: { label: "Location", icon: MapPin },
  ORGANIZATION: { label: "Organization", icon: Building2 },
  CASE: { label: "Case", icon: FolderKanban },
  EVIDENCE: { label: "Evidence", icon: FileText },
};

const MAX_RESULTS = 8;

function hrefFor(r: SearchResult): string {
  if (r.type === "CASE") return `/cases/${r.id}`;
  if (r.type === "EVIDENCE") return "/evidence";
  return "/entities";
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch against the global search API.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}&limit=${MAX_RESULTS}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results ?? []);
          setLoading(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const groups = useMemo(() => {
    const map = new Map<SearchType, SearchResult[]>();
    for (const r of results) {
      const arr = map.get(r.type) ?? [];
      arr.push(r);
      map.set(r.type, arr);
    }
    // Deterministic ordering of groups.
    const order: SearchType[] = [
      "CASE",
      "PERSON",
      "PHONE",
      "VEHICLE",
      "LOCATION",
      "ORGANIZATION",
      "EVIDENCE",
    ];
    return order.map((t) => ({ type: t, items: map.get(t) ?? [] }));
  }, [results]);

  const active = open && query.trim().length >= 2;

  function navigate(r: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(hrefFor(r));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter" && results.length > 0) {
      navigate(results[0]);
    }
  }

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search cases, entities, evidence…"
        className="h-9 w-64 rounded-lg border border-border bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
        aria-label="Global search"
      />
      {loading ? (
        <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted" />
      ) : null}

      {active ? (
        <div className="absolute right-0 top-11 z-40 w-[30rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted">
              No matches for “{query}”.
            </div>
          ) : (
            <div className="max-h-[24rem] overflow-y-auto p-1.5">
              {groups.map(
                (g) =>
                  g.items.length > 0 && (
                    <div key={g.type} className="mb-1">
                      <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted/70">
                        {TYPE_META[g.type].label}
                      </p>
                      {g.items.map((r) => {
                        const Icon = TYPE_META[r.type].icon;
                        return (
                          <button
                            key={`${r.type}-${r.id}`}
                            onClick={() => navigate(r)}
                            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-raised"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium text-foreground">
                                {r.label}
                              </span>
                              {r.subtitle ? (
                                <span className="block truncate text-xs text-muted">
                                  {r.subtitle}
                                </span>
                              ) : null}
                            </span>
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted/50" />
                          </button>
                        );
                      })}
                    </div>
                  )
              )}
            </div>
          )}
          <div className={cn("border-t border-border px-3 py-2 text-[10px] text-muted/70")}>
            Press <kbd className="rounded bg-surface-raised px-1">Enter</kbd> for first result ·{" "}
            <kbd className="rounded bg-surface-raised px-1">Esc</kbd> to close
          </div>
        </div>
      ) : null}
    </div>
  );
}