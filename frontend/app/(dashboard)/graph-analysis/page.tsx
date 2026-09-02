"use client";

import { Share2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { GraphAnalysisView } from "@/components/graph-analysis/graph-analysis-view";

export default function GraphAnalysisPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Graph Analysis"
        description="Comprehensive network analytics — centrality rankings, community clusters, multi-hop connection paths, and structural intelligence patterns."
        icon={Share2}
        badge="Intelligence Analytics"
      />

      <GraphAnalysisView />
    </div>
  );
}
