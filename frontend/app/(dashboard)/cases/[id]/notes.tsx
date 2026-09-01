"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/state";

type Note = {
  id: string;
  body: string;
  author: string | null;
  createdAt: string;
};

export function CaseNotes({
  notes,
  caseId,
  canEdit,
}: {
  notes: Note[];
  caseId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addNote() {
    if (!body.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setBody("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader title="Case Notes" description="Investigator notes" />
      <CardContent className="flex flex-1 flex-col gap-3">
        {notes.length === 0 ? (
          <EmptyState title="No notes" description="Add a case note to record findings." />
        ) : (
          <div className="space-y-3">
            {notes.map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-surface-raised/50 p-3">
                <p className="text-sm text-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {n.author ?? "Unknown"} · {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {canEdit ? (
          <div className="mt-auto space-y-2 border-t border-border pt-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              placeholder="Add a note…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
            <div className="flex justify-end">
              <Button size="sm" onClick={addNote} disabled={loading || !body.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add note
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
