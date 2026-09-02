"use client";

import { GitCompare } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EntityResolutionDashboard } from "@/components/entity-resolution/entity-resolution-dashboard";

export default function EntityResolutionPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Entity Resolution & Identity Integrity"
        description="Explainable, multi-signal identity matching, phonetic normalization, contradiction detection, and blockchain-notarized investigator review."
        icon={GitCompare}
        badge="Investigation Support"
      />

      <EntityResolutionDashboard />
    </div>
  );
}
