"use client";

import { useState } from "react";
import { Share2, User, Phone, MapPin, Briefcase, FileText, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ResolutionCandidatePair } from "@backend/services/entity-resolution.service";

interface IdentityGraphPanelProps {
  candidate: ResolutionCandidatePair;
}

export function IdentityGraphPanel({ candidate }: IdentityGraphPanelProps) {
  const [selectedElement, setSelectedElement] = useState<{
    type: "NODE" | "EDGE";
    title: string;
    detail: string;
    confidence?: number;
    status?: string;
  } | null>(null);

  const recA = candidate.recordA.normalized;
  const recB = candidate.recordB.normalized;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4 text-accent" /> Identity & Multi-Hop Association Graph
          </h3>
          <p className="text-xs text-muted">
            Visual topology linking persons, phones, addresses, and case dockets.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          Interactive SVG Canvas
        </Badge>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative h-[340px] w-full rounded-xl border border-border bg-surface-raised/20 overflow-hidden flex items-center justify-center">
        <svg className="h-full w-full" viewBox="0 0 700 320">
          {/* Background Grid */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Connectors / Edges */}
          {/* Edge A to Central Resolution */}
          <line
            x1="220"
            y1="160"
            x2="480"
            y2="160"
            stroke={candidate.confidence >= 70 ? "#34d399" : "#fbbf24"}
            strokeWidth="3"
            strokeDasharray={candidate.classification.includes("ASSOCIATION") ? "6,4" : undefined}
            className="cursor-pointer hover:stroke-accent transition-colors"
            onClick={() =>
              setSelectedElement({
                type: "EDGE",
                title: `${candidate.classification} (${candidate.confidence}%)`,
                detail: candidate.explanation,
                confidence: candidate.confidence,
                status: candidate.reviewStatus,
              })
            }
          />

          {/* Edge A to Phone A */}
          <line x1="220" y1="160" x2="140" y2="70" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Edge A to Address */}
          <line x1="220" y1="160" x2="350" y2="70" stroke="#fb923c" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Edge B to Address */}
          <line x1="480" y1="160" x2="350" y2="70" stroke="#fb923c" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Edge B to Phone B */}
          <line x1="480" y1="160" x2="560" y2="70" stroke="#34d399" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Edge A & B to Case Docket */}
          <line x1="220" y1="160" x2="350" y2="250" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.6" />
          <line x1="480" y1="160" x2="350" y2="250" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.6" />

          {/* Central Edge Label Badge */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedElement({
                type: "EDGE",
                title: `${candidate.classification} (${candidate.confidence}%)`,
                detail: candidate.explanation,
                confidence: candidate.confidence,
                status: candidate.reviewStatus,
              })
            }
          >
            <rect x="290" y="145" width="120" height="30" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <text x="350" y="164" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">
              {candidate.confidence}% Match
            </text>
          </g>

          {/* Node: Person A */}
          <g
            className="cursor-pointer group"
            onClick={() =>
              setSelectedElement({
                type: "NODE",
                title: `Entity A: ${recA.name.toUpperCase()}`,
                detail: `Phone: ${recA.phone || "—"} | DOB: ${recA.dob || recA.birthYear || "—"} | Addr: ${recA.address || "—"}`,
              })
            }
          >
            <circle cx="220" cy="160" r="28" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2.5" />
            <text x="220" y="164" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
              {recA.name.substring(0, 6)}
            </text>
            <text x="220" y="200" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Person A
            </text>
          </g>

          {/* Node: Person B */}
          <g
            className="cursor-pointer group"
            onClick={() =>
              setSelectedElement({
                type: "NODE",
                title: `Entity B: ${recB.name.toUpperCase()}`,
                detail: `Phone: ${recB.phone || "—"} | DOB: ${recB.dob || recB.birthYear || "—"} | Addr: ${recB.address || "—"}`,
              })
            }
          >
            <circle cx="480" cy="160" r="28" fill="#831843" stroke="#f472b6" strokeWidth="2.5" />
            <text x="480" y="164" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
              {recB.name.substring(0, 6)}
            </text>
            <text x="480" y="200" textAnchor="middle" fill="#94a3b8" fontSize="10">
              Person B
            </text>
          </g>

          {/* Node: Phone A */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedElement({
                type: "NODE",
                title: `Phone A: ${recA.phone || "N/A"}`,
                detail: `Used by Person A (${recA.name}).`,
              })
            }
          >
            <circle cx="140" cy="70" r="18" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
            <text x="140" y="74" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">
              TEL
            </text>
            <text x="140" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9">
              {recA.phone ? recA.phone.substring(0, 5) + ".." : "Phone A"}
            </text>
          </g>

          {/* Node: Phone B */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedElement({
                type: "NODE",
                title: `Phone B: ${recB.phone || "N/A"}`,
                detail: `Used by Person B (${recB.name}).`,
              })
            }
          >
            <circle cx="560" cy="70" r="18" fill="#064e3b" stroke="#34d399" strokeWidth="1.5" />
            <text x="560" y="74" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold">
              TEL
            </text>
            <text x="560" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9">
              {recB.phone ? recB.phone.substring(0, 5) + ".." : "Phone B"}
            </text>
          </g>

          {/* Node: Address */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedElement({
                type: "NODE",
                title: `Location / Address`,
                detail: `A: "${recA.address || "—"}" | B: "${recB.address || "—"}"`,
              })
            }
          >
            <circle cx="350" cy="70" r="20" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />
            <text x="350" y="74" textAnchor="middle" fill="#fb923c" fontSize="9" fontWeight="bold">
              LOC
            </text>
            <text x="350" y="102" textAnchor="middle" fill="#94a3b8" fontSize="9">
              {recA.city || recB.city || "Address"}
            </text>
          </g>

          {/* Node: Case Docket */}
          <g
            className="cursor-pointer"
            onClick={() =>
              setSelectedElement({
                type: "NODE",
                title: `Investigation Case / FIR`,
                detail: `Docket Link: ${recA.firNo || recA.caseId || recB.firNo || recB.caseId || "General"}`,
              })
            }
          >
            <circle cx="350" cy="250" r="20" fill="#4c1d95" stroke="#a78bfa" strokeWidth="1.5" />
            <text x="350" y="254" textAnchor="middle" fill="#a78bfa" fontSize="9" fontWeight="bold">
              FIR
            </text>
            <text x="350" y="282" textAnchor="middle" fill="#94a3b8" fontSize="9">
              {recA.firNo || recA.caseId || "Case Docket"}
            </text>
          </g>
        </svg>
      </div>

      {/* Selected Element Inspector Drawer */}
      {selectedElement && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-accent">{selectedElement.title}</span>
            {selectedElement.status && (
              <Badge variant="outline" className="text-[10px]">
                {selectedElement.status}
              </Badge>
            )}
          </div>
          <p className="text-muted leading-relaxed">{selectedElement.detail}</p>
        </div>
      )}
    </div>
  );
}
