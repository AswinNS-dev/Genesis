// CrimeIntel — Shared entity & relationship metadata
// Pure data functions with no React/UI dependencies.
// Used by both backend services and frontend components.

export const ENTITY_TYPES = [
  "PERSON",
  "PHONE",
  "VEHICLE",
  "LOCATION",
  "ORGANIZATION",
  "FINANCIAL",
  "DATE",
  "EVENT",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_META: Record<string, { label: string; color: string }> = {
  PERSON: { label: "Person", color: "#60a5fa" },
  PHONE: { label: "Phone", color: "#34d399" },
  VEHICLE: { label: "Vehicle", color: "#fbbf24" },
  LOCATION: { label: "Location", color: "#f472b6" },
  ORGANIZATION: { label: "Organization", color: "#a78bfa" },
  FINANCIAL: { label: "Financial", color: "#f87171" },
  DATE: { label: "Date", color: "#22d3ee" },
  EVENT: { label: "Event", color: "#fb923c" },
};

export function entityLabel(type: string): string {
  return ENTITY_META[type]?.label ?? type;
}

export function entityColor(type: string): string {
  return ENTITY_META[type]?.color ?? "#8b9bb4";
}

export const REL_TYPE_META: Record<string, { label: string; color: string }> = {
  COMMUNICATION: { label: "Communication", color: "#34d399" },
  TRANSACTION: { label: "Transaction", color: "#f87171" },
  LOCATION: { label: "Location", color: "#f472b6" },
  CASE: { label: "Case link", color: "#60a5fa" },
  TRANSPORT: { label: "Transport", color: "#fbbf24" },
  FINANCIAL: { label: "Financial", color: "#f87171" },
  OWNERSHIP: { label: "Ownership", color: "#a78bfa" },
};

export function relationLabel(type: string): string {
  return REL_TYPE_META[type]?.label ?? type;
}

export function relationColor(type: string): string {
  return REL_TYPE_META[type]?.color ?? "#8b9bb4";
}

export const CASE_STATUS_META: Record<
  string,
  { label: string; variant: "success" | "warning" | "info" | "default" | "outline" }
> = {
  OPEN: { label: "Open", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export const SEVERITY_META: Record<
  string,
  { label: string; variant: "danger" | "warning" | "info" | "default" }
> = {
  CRITICAL: { label: "Critical", variant: "danger" },
  HIGH: { label: "High", variant: "danger" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "info" },
};
