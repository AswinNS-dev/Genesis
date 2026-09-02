"use client";

import { Play, Sparkles, ShieldCheck, ArrowRight, UserCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DemoScenarioRunnerProps {
  onRunDemo: () => Promise<void>;
  loading: boolean;
}

export function DemoScenarioRunner({ onRunDemo, loading }: DemoScenarioRunnerProps) {
  return (
    <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-surface to-accent/5 p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Standard Investigation Demo Scenario</h3>
            <Badge variant="default" className="text-[10px]">
              Section 23 Specification
            </Badge>
          </div>
          <p className="text-xs text-muted mt-1">
            Tests false-positive protection, alias linkage, and proxy detection across 4 police records:
          </p>
        </div>

        <Button
          onClick={onRunDemo}
          disabled={loading}
          className="bg-accent text-accent-foreground font-semibold hover:bg-accent/90"
        >
          <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
          {loading ? "Evaluating Engine..." : "Run SIH Demo Dataset"}
        </Button>
      </div>

      {/* 4 Demo Records Matrix */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs">
        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>Record 1: Ramu</span>
            <span className="text-[10px] font-mono text-muted">#1001</span>
          </div>
          <div className="text-[11px] text-muted space-y-0.5">
            <div>Phone: <span className="font-mono text-foreground">Phone A</span></div>
            <div>Addr: <span className="text-foreground">12 Bazaar St (X)</span></div>
            <div>DOB: <span className="text-foreground">1992</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>Record 2: Balu</span>
            <span className="text-[10px] font-mono text-muted">#1002</span>
          </div>
          <div className="text-[11px] text-muted space-y-0.5">
            <div>Phone: <span className="font-mono text-foreground">Phone B</span></div>
            <div>Addr: <span className="text-foreground">12 Bazaar St (X)</span></div>
            <div>DOB: <span className="text-foreground">1992</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>Record 3: Ramar</span>
            <span className="text-[10px] font-mono text-muted">#1003</span>
          </div>
          <div className="text-[11px] text-muted space-y-0.5">
            <div>Phone: <span className="font-mono text-foreground">Phone C</span></div>
            <div>Addr: <span className="text-foreground">45 Temple Rd (Y)</span></div>
            <div>DOB: <span className="text-foreground">1991</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface p-2.5 space-y-1">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>Record 4: Kumar</span>
            <span className="text-[10px] font-mono text-muted">#1004</span>
          </div>
          <div className="text-[11px] text-muted space-y-0.5">
            <div>Phone: <span className="font-mono text-foreground">Phone B</span></div>
            <div>Addr: <span className="text-foreground">88 Cross Salai (Z)</span></div>
            <div>DOB: <span className="text-foreground">1990</span></div>
          </div>
        </div>
      </div>

      {/* Expected Evaluation Outcome Guide */}
      <div className="rounded-lg border border-border/60 bg-surface-raised/30 p-3 text-[11px] space-y-1.5">
        <div className="font-bold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          <span>Expected System Evaluation (No Blind Merging):</span>
        </div>
        <div className="grid gap-1 sm:grid-cols-3 text-muted">
          <div>
            <span className="font-semibold text-foreground">Ramu ↔ Balu:</span>{" "}
            <Badge variant="success" className="text-[9px] ml-1">PROBABLE SAME ENTITY / ALIAS</Badge>
          </div>
          <div>
            <span className="font-semibold text-foreground">Ramu ↔ Ramar:</span>{" "}
            <Badge variant="info" className="text-[9px] ml-1">POSSIBLE SAME ENTITY</Badge>
          </div>
          <div>
            <span className="font-semibold text-foreground">Balu ↔ Kumar:</span>{" "}
            <Badge variant="warning" className="text-[9px] ml-1">POSSIBLE ASSOCIATION / PROXY</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
