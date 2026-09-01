// Role-Based Access Control helpers.
// Role hierarchy: VIEWER < ANALYST < INVESTIGATOR < ADMIN

import type { Session } from "next-auth";

export type Role = "ADMIN" | "INVESTIGATOR" | "ANALYST" | "VIEWER";

const ROLE_LEVEL: Record<Role, number> = {
  VIEWER: 1,
  ANALYST: 2,
  INVESTIGATOR: 3,
  ADMIN: 4,
};

// Admin-only areas (system config, audit, security management).
const ADMIN_ONLY = new Set(["/settings", "/audit-logs", "/security"]);

// Investigate/write capabilities (create/edit cases, uploads) require at least INVESTIGATOR.
const WRITE_AREAS = new Set([
  "/documents",
  "/cases",
  "/evidence",
  "/blockchain",
]);

export function isRole(role: string | undefined, min: Role): boolean {
  return ROLE_LEVEL[(role as Role) ?? "VIEWER"] >= ROLE_LEVEL[min];
}

export function roleLevel(role: string | undefined): number {
  return ROLE_LEVEL[(role as Role) ?? "VIEWER"] ?? 1;
}

export function canAccessPath(role: string | undefined, pathname: string): boolean {
  const roleVal = (role as Role) ?? "VIEWER";

  // Admin-only modules.
  for (const prefix of ADMIN_ONLY) {
    if (pathname.startsWith(prefix)) {
      return roleVal === "ADMIN";
    }
  }

  // Write / investigative actions need INVESTIGATOR or higher (ADMIN inherits).
  for (const prefix of WRITE_AREAS) {
    if (pathname.startsWith(prefix)) {
      return roleLevel(roleVal) >= ROLE_LEVEL.INVESTIGATOR;
    }
  }

  // Everything else viewable by all (dashboard, analysis modules).
  return true;
}

export function getSessionRole(session: Session | null): string | undefined {
  return session?.user?.role as string | undefined;
}
