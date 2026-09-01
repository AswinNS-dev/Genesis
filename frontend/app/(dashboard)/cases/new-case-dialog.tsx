"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";

const CATEGORIES = [
  "Financial Fraud",
  "Narcotics",
  "Human Trafficking",
  "Cyber Crime",
  "Organized Crime",
  "Corruption & Bribery",
  "Arms / Smuggling",
  "Violent Crime",
  "Other",
];

const SOURCES = [
  "Citizen Tip",
  "Surveillance",
  "Anonymous Report",
  "Cross-Agency Referral",
  "Routine Patrol / Discovery",
  "Financial Intelligence",
  "Other",
];

const STATUSES = ["OPEN", "CLOSED", "ARCHIVED"];
const CLASSIFICATIONS = ["OPEN", "RESTRICTED", "SECRET"];

const inputCls =
  "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50";

export function NewCaseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [caseSource, setCaseSource] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [classification, setClassification] = useState("RESTRICTED");
  const [incidentDate, setIncidentDate] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category: category || undefined,
          caseSource: caseSource || undefined,
          status,
          classification,
          incidentDate: incidentDate || undefined,
          jurisdiction: jurisdiction || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create case");
      setOpen(false);
      setTitle("");
      setDescription("");
      setCategory("");
      setCaseSource("");
      setStatus("OPEN");
      setClassification("RESTRICTED");
      setIncidentDate("");
      setJurisdiction("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> New Case
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader title="Create new investigation" description="Open a new case docket with full intake details. All data fictional / demo." />
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vasant Vihar coordination probe"
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Case category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Select a category…</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Initiated via</label>
                <select value={caseSource} onChange={(e) => setCaseSource(e.target.value)} className={inputCls}>
                  <option value="">Select a source…</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Incident date</label>
                <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Jurisdiction / location</label>
                <input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g. Delhi Central, District 18"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Classification</label>
                <select value={classification} onChange={(e) => setClassification(e.target.value)} className={inputCls}>
                  {CLASSIFICATIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this investigation about?"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !title.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
