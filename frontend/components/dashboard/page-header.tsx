import { type LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = "info",
  actions,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: BadgeVariant;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {badge ? <Badge variant={badgeVariant}>{badge}</Badge> : null}
          </div>
          {description ? (
            <p className="mt-1 text-sm text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Placeholder({
  module,
  description,
  phase,
}: {
  module: string;
  description: string;
  phase: string;
}) {
  return (
    <Card className="animate-fade-in">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
          <Construction className="h-7 w-7 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{module}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            {description}
          </p>
        </div>
        <Badge variant="outline">{phase}</Badge>
      </div>
    </Card>
  );
}
