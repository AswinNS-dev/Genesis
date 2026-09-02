"use client";

import { Clock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { TemporalDetection } from "@/components/temporal/temporal-detection";

export default function TemporalAnomalyPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Temporal Anomaly Detection"
        description="Analyze unusual entity activity occurring before and after a selected crime relative to historical baselines."
        icon={Clock}
        badge="Analytics"
      />

      <TemporalDetection />
    </div>
  );
}
