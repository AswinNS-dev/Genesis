import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const icons = {
  info: Info,
  warning: AlertTriangle,
  danger: ShieldAlert,
  success: CheckCircle2,
};

type AlertVariant = keyof typeof icons;

export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: AlertVariant;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = icons[variant];
  const styles: Record<AlertVariant, string> = {
    info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    warning: "border-warning/30 bg-warning/10 text-warning",
    danger: "border-danger/30 bg-danger/10 text-red-200",
    success: "border-success/30 bg-success/10 text-green-200",
  };
  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border p-3 text-sm",
        styles[variant],
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="mt-0.5">{children}</div> : null}
      </div>
    </div>
  );
}
