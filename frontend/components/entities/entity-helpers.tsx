// Shared helpers for entity types — colors, labels, icons.
import {
  User,
  Phone,
  Car,
  MapPin,
  Building2,
  Banknote,
  CalendarDays,
  Zap,
  type LucideIcon,
} from "lucide-react";

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

export const ENTITY_META: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  PERSON: { label: "Person", color: "#60a5fa", icon: User },
  PHONE: { label: "Phone", color: "#34d399", icon: Phone },
  VEHICLE: { label: "Vehicle", color: "#fbbf24", icon: Car },
  LOCATION: { label: "Location", color: "#f472b6", icon: MapPin },
  ORGANIZATION: { label: "Organization", color: "#a78bfa", icon: Building2 },
  FINANCIAL: { label: "Financial", color: "#f87171", icon: Banknote },
  DATE: { label: "Date", color: "#22d3ee", icon: CalendarDays },
  EVENT: { label: "Event", color: "#fb923c", icon: Zap },
};

export function entityLabel(type: string): string {
  return ENTITY_META[type]?.label ?? type;
}

export function entityColor(type: string): string {
  return ENTITY_META[type]?.color ?? "#8b9bb4";
}

export function entityIcon(type: string): LucideIcon {
  return ENTITY_META[type]?.icon ?? User;
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

export const CASE_STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "info" | "default" | "outline" }> = {
  OPEN: { label: "Open", variant: "success" },
  CLOSED: { label: "Closed", variant: "default" },
  ARCHIVED: { label: "Archived", variant: "outline" },
};

export const SEVERITY_META: Record<string, { label: string; variant: "danger" | "warning" | "info" | "default" }> = {
  CRITICAL: { label: "Critical", variant: "danger" },
  HIGH: { label: "High", variant: "danger" },
  MEDIUM: { label: "Medium", variant: "warning" },
  LOW: { label: "Low", variant: "info" },
};
