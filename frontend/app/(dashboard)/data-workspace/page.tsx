"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database,
  Upload,
  Filter,
  Wand2,
  Link2,
  ClipboardCheck,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileArchive,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState, EmptyState } from "@/components/ui/state";
import { IngestPanel } from "@/components/data-workspace/ingest-panel";
import { DatasetList } from "@/components/data-workspace/dataset-list";
import { ReviewQueue } from "@/components/data-workspace/review-queue";
import { FileUploadPanel } from "@/components/data-workspace/file-upload-panel";

const STAGES = [
  {
    icon: Upload,
    step: "01",
    title: "Upload",
    description:
      "Accept CSV, XLSX, JSON, PDF, DOCX and TXT. Files are hashed and notarized on the integrity ledger at ingestion.",
    ready: true,
  },
  {
    icon: Filter,
    step: "02",
    title: "Field mapping",
    description:
      "Map source columns to canonical intelligence fields (name, phone, address, vehicle, amount, dates) with traceable provenance.",
    ready: true,
  },
  {
    icon: Wand2,
    step: "03",
    title: "Normalization",
    description:
      "Standardize names, phone numbers and addresses into consistent formats using backend rules — no UI inference.",
    ready: true,
  },
  {
    icon: Link2,
    step: "04",
    title: "Entity matching",
    description:
      "Score records against known entities. Results are always framed as potential matches requiring investigator review.",
    ready: false,
  },
  {
    icon: ClipboardCheck,
    step: "05",
    title: "Review & merge",
    description:
      "Investigators approve or reject candidate merges. Every decision is recorded for audit.",
    ready: false,
  },
] as const;

const FORMATS = [
  { label: "CSV", icon: FileSpreadsheet, note: "Tabular records · live" },
  { label: "XLSX", icon: FileSpreadsheet, note: "Excel workbooks" },
  { label: "JSON", icon: FileJson, note: "Structured data · live" },
  { label: "PDF", icon: FileText, note: "Documents (text extraction)" },
  { label: "DOCX", icon: FileText, note: "Word documents" },
  { label: "TXT", icon: FileArchive, note: "Plain text · live" },
] as const;

type DocumentInfo = {
  id: string;
  name: string;
  verified: boolean;
  caseId: string;
  createdAt: string;
};

type DatasetInfo = {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  recordCount: number;
  createdAt: string;
  _count: { records: number };
};

type CaseOption = { id: string; caseId: string; title: string };

export default function DataWorkspacePage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(true);

  async function refreshDocuments() {
    const d = await fetch("/api/intel-data?scope=documents").then((r) => r.json());
    setDocuments(d.evidence ?? []);
  }

  async function refreshDatasets() {
    const ds = await fetch("/api/datasets").then((r) => r.json());
    setDatasets(ds.datasets ?? []);
  }

  useEffect(() => {
    (async () => {
      try {
        const [d, ds, cs] = await Promise.all([
          fetch("/api/intel-data?scope=documents").then((r) => r.json()),
          fetch("/api/datasets").then((r) => r.json()),
          fetch("/api/intel-data?scope=cases").then((r) => r.json()),
        ]);
        setDocuments(d.evidence ?? []);
        setDatasets(ds.datasets ?? []);
        setCases((cs.cases ?? []).map((c: CaseOption) => c));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Data Workspace"
        description="Ingest structured datasets with full traceability — every source, field and merge decision is audited."
        icon={Database}
        badge="Ingestion pipeline · live"
        actions={
          <Link
            href="/documents"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-raised"
          >
            <FileText className="h-4 w-4" />
            Documents library
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <FileUploadPanel cases={cases} onUploaded={refreshDocuments} />
        <div className="lg:col-span-2">
          <IngestPanel cases={cases} onIngested={refreshDatasets} />
        </div>
      </div>

      <ReviewQueue onChanged={refreshDatasets} />

      {/* Pipeline stages */}
      <Card>
        <CardHeader
          title="Ingestion pipeline"
          description={loading ? "Loading…" : "Stages 01–03 are live on the backend; matching and review follow in the next phase."}
        />
        <CardContent>
          <div className="grid gap-3 md:grid-cols-5">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className="relative rounded-xl border border-border bg-surface-raised/40 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted">{s.step}</span>
                    {i < STAGES.length - 1 ? (
                      <span className="ml-auto" aria-hidden>
                        <span className="hidden h-px w-3 bg-border md:block" />
                      </span>
                    ) : null}
                    <span className="ml-auto">
                      <Badge variant={s.ready ? "success" : "outline"}>
                        {s.ready ? "Live" : "Next up"}
                      </Badge>
                    </span>
                  </div>
                  <Icon className="mt-3 h-6 w-6 text-accent" />
                  <p className="mt-2 text-sm font-semibold text-foreground">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Datasets */}
      <Card>
        <CardHeader
          title="Ingested datasets"
          description="Datasets with full provenance — fields, records and match state are traceable to source"
          action={<Badge variant="outline">{datasets.length} total</Badge>}
        />
        <CardContent>
          {loading ? <LoadingState label="Loading datasets…" /> : <DatasetList datasets={datasets} onIngested={refreshDatasets} />}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Supported formats */}
        <Card>
          <CardHeader title="Supported formats" description="Pipeline-ready sources" />
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.label} className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised/40 p-3">
                    <Icon className="h-4 w-4 shrink-0 text-accent" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{f.label}</p>
                      <p className="text-[10px] text-muted">{f.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Source documents */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Available source documents"
            description="Evidence documents eligible for dataset ingestion"
          />
          <CardContent>
            {loading ? (
              <LoadingState label="Loading documents…" />
            ) : documents.length === 0 ? (
              <EmptyState
                title="No source documents"
                description="Upload documents first — they become inputs to the data workspace."
              />
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 6).map((d) => (
                  <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised/40 p-3">
                    <FileText className="h-4 w-4 shrink-0 text-accent" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-[10px] text-muted">{d.caseId}</p>
                    </div>
                    <Badge variant={d.verified ? "success" : "outline"} className="ml-auto">
                      {d.verified ? "verified" : "not verified"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
          <p className="text-xs leading-relaxed text-muted">
            Ingested datasets are treated as investigative leads only. Field mapping, normalization
            and matching are performed by backend services so new algorithms and data sources can be
            added without rewriting the interface. Stage 04 (entity matching) and stage 05 (review
            and merge) become operational in the dataset matching phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}