import type { Metadata } from "next";
import { Settings, Users, Cpu, ShieldCheck, Database } from "lucide-react";
import { prisma } from "@backend/lib/prisma";
import { registerProviders } from "@backend/ai/providers/register";
import { listProviders } from "@backend/ai/providers";
import {
  isSupabaseConfigured,
  isPostgres,
  envConfig,
} from "@backend/infrastructure/config/env";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const CAPABILITY_LABELS: Record<string, string> = {
  extraction: "Text extraction",
  summarizer: "Investigation summary",
  leadGenerator: "Lead generation",
  patternDetector: "Pattern detection",
  entityMatcher: "Entity matching",
  relationshipDetector: "Relationship inference",
  anomalyDetector: "Anomaly detection",
};

export default async function SettingsPage() {
  registerProviders();
  const providerStack = listProviders();
  const activeProvider = process.env.AI_PROVIDER ?? "mock";
  const [users, alerts] = await Promise.all([
    prisma.user.findMany({ orderBy: { role: "asc" } }),
    prisma.securityAlert.count({ where: { resolved: false } }),
  ]);

  const roleColor: Record<string, "default" | "success" | "warning" | "danger" | "info" | "outline"> = {
    ADMIN: "danger",
    INVESTIGATOR: "warning",
    ANALYST: "info",
    VIEWER: "outline",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        description="System configuration, AI mode, and user role-based access control."
        icon={Settings}
        badge="Admin"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard title="Registered users" value={users.length} icon={Users} tint="text-sky-400" />
        <StatCard title="Roles" value="4" icon={ShieldCheck} tint="text-accent" />
        <StatCard title="Open alerts" value={alerts} icon={ShieldCheck} tint="text-danger" />
        <StatCard title="AI mode" value={process.env.AI_MODE ?? "mock"} icon={Cpu} tint="text-accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Users & roles" description="Role-based access control" />
          <CardContent className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                  {u.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{u.name}</p>
                  <p className="text-[11px] text-muted">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={roleColor[u.role] ?? "outline"}>{u.role}</Badge>
                  <span className="text-[10px] text-muted">
                    {u.lastLoginAt ? `Last login ${new Date(u.lastLoginAt).toLocaleDateString()}` : "Never logged in"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="AI configuration" description="Model abstraction layer" />
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Mode</span>
                <Badge variant="info">{process.env.AI_MODE ?? "mock"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">AI API key</span>
                <span className="text-muted">{process.env.AI_API_KEY ? "configured" : "not set"}</span>
              </div>
              <p className="pt-2 text-xs text-muted">
                AI operations use a replaceable abstraction layer (lib/ai). In mock mode, extraction,
                summarization and pattern detection run deterministically on fictional demo data —
                no external API required. Swap AI_MODE=llm and implement the provider to integrate a real model.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Supabase" description="Database, storage & auth status" />
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Configured</span>
                <Badge variant={isSupabaseConfigured() ? "success" : "outline"}>
                  {isSupabaseConfigured() ? "yes" : "no"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Database</span>
                <Badge variant={isPostgres() ? "info" : "outline"}>
                  {isPostgres() ? "Supabase Postgres" : "Local"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Storage driver</span>
                <Badge variant={envConfig.storageDriver === "supabase" ? "info" : "outline"}>
                  {envConfig.storageDriver}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Bucket</span>
                <span className="text-muted">{envConfig.supabase.storageBucket}</span>
              </div>
              <p className="flex items-center gap-1.5 pt-1 text-xs text-muted">
                <Database className="h-3.5 w-3.5" />
                To go live: set SUPABASE_* keys + DATABASE_URL (Prisma Postgres) in{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5">.env</code> and{" "}
                <code className="rounded bg-surface-raised px-1 py-0.5">frontend/.env</code>, then push
                the schema and apply the RLS script.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="AI provider stack" description="Registered pluggable algorithms per capability" />
            <CardContent className="space-y-2 text-sm">
              {Object.entries(providerStack).map(([capability, providers]) => {
                const active = providers.includes(activeProvider) ? activeProvider : providers[0];
                return (
                  <div key={capability} className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-muted">{CAPABILITY_LABELS[capability] ?? capability}</span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {providers.map((name) => (
                        <Badge key={name} variant={name === active ? "success" : "outline"}>
                          {name}
                          {name === active ? " · active" : ""}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
              <p className="pt-2 text-xs text-muted">
                Algorithms are swappable behind the provider registry. Set the <code className="rounded bg-surface-raised px-1 py-0.5">AI_PROVIDER</code> env
                variable (default <code className="rounded bg-surface-raised px-1 py-0.5">mock</code>) and restart to switch the active provider for every capability.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Role permissions" description="What each role can access" />
            <CardContent className="space-y-2 text-xs">
              <Perm label="Admin" desc="Full access, including audit logs, security, and settings." />
              <Perm label="Investigator" desc="Create cases, upload evidence, verify integrity, confirmed extractions." />
              <Perm label="Analyst" desc="View analysis, generate AI summaries and reports." />
              <Perm label="Viewer" desc="Read-only access to dashboards and analysis modules." />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Perm({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 font-medium text-foreground">{label}</span>
      <span className="text-muted">{desc}</span>
    </div>
  );
}
