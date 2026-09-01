"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SessionUser = {
  name: string;
  email: string;
  role: string;
};

const roleColors: Record<string, string> = {
  ADMIN: "bg-danger/10 text-danger ring-danger/30",
  INVESTIGATOR: "bg-warning/10 text-warning ring-warning/30",
  ANALYST: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  VIEWER: "bg-muted/10 text-muted ring-border",
};

function roleColor(role: string): string {
  return roleColors[role] ?? roleColors.VIEWER;
}

export function UserMenu({
  user,
  variant = "sidebar",
}: {
  user: SessionUser;
  variant?: "sidebar" | "topbar";
}) {
  const initials = (user.name || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn("flex items-center gap-3", variant === "topbar" && "pl-3")}>
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-accent/15 ring-1 ring-accent/30",
          variant === "sidebar" ? "h-9 w-9" : "h-8 w-8"
        )}
      >
        <span className="text-xs font-semibold text-accent">{initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge className={cn("px-1.5 py-0 text-[10px]", roleColor(user.role))}>
            {user.role}
          </Badge>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-raised hover:text-danger"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
