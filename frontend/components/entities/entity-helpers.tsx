// Shared helpers for entity types — colors, labels, icons.
// Re-exports from backend/lib/colors.ts and adds React/Lucide icon bindings.
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

// Re-export all pure data from the shared backend module
export {
  ENTITY_TYPES,
  type EntityType,
  ENTITY_META,
  entityLabel,
  entityColor,
  REL_TYPE_META,
  relationLabel,
  relationColor,
  CASE_STATUS_META,
  SEVERITY_META,
} from "@backend/lib/colors";

// Frontend-only: attach Lucide icons to entity types
export const ENTITY_ICONS: Record<string, LucideIcon> = {
  PERSON: User,
  PHONE: Phone,
  VEHICLE: Car,
  LOCATION: MapPin,
  ORGANIZATION: Building2,
  FINANCIAL: Banknote,
  DATE: CalendarDays,
  EVENT: Zap,
};

export function entityIcon(type: string): LucideIcon {
  return ENTITY_ICONS[type] ?? User;
}
