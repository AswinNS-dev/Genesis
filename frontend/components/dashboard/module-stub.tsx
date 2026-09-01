import { PageHeader, Placeholder } from "@/components/dashboard/page-header";
import type { LucideIcon } from "lucide-react";

export function ModuleStub({
  title,
  description,
  icon,
  phase,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={title}
        description={description}
        icon={icon}
        badge="Phase"
        badgeVariant="outline"
      />
      <Placeholder module={title} description={description} phase={phase} />
    </div>
  );
}
