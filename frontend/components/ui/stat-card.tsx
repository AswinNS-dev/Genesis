import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  icon: Icon,
  tint = "text-accent",
  hint,
}: {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tint?: string;
  hint?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{title}</p>
          <Icon className={`h-4 w-4 ${tint}`} />
        </div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function MiniStat({
  icon: Icon,
  label,
  value,
  tint = "text-accent",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  tint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised">
          <Icon className={`h-5 w-5 ${tint}`} />
        </div>
        <div>
          <p className="text-xl font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
