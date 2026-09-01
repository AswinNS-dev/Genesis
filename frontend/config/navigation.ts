import {
  LayoutDashboard,
  FolderKanban,
  FileSearch,
  Users,
  Share2,
  CalendarDays,
  MapPin,
  Phone,
  Coins,
  Sparkles,
  Landmark,
  Link2,
  ShieldCheck,
  ScrollText,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Intelligence",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Command overview and case load",
      },
      {
        title: "Cases",
        href: "/cases",
        icon: FolderKanban,
        description: "FIRs and investigation dockets",
      },
      {
        title: "Documents",
        href: "/documents",
        icon: FileSearch,
        description: "Uploads and AI extraction",
      },
      {
        title: "Entities",
        href: "/entities",
        icon: Users,
        description: "Persons, orgs, vehicles, locations",
      },
    ],
  },
  {
    label: "Analysis",
    items: [
      {
        title: "Network Graph",
        href: "/network",
        icon: Share2,
        description: "Connected intelligence view",
      },
      {
        title: "Timeline",
        href: "/timeline",
        icon: CalendarDays,
        description: "Chronological event view",
      },
      {
        title: "Locations",
        href: "/locations",
        icon: MapPin,
        description: "Mapping and geo-links",
      },
      {
        title: "Communications",
        href: "/communications",
        icon: Phone,
        description: "Call records and clusters",
      },
      {
        title: "Transactions",
        href: "/transactions",
        icon: Coins,
        description: "Financial trails and chains",
      },
      {
        title: "AI Insights",
        href: "/ai-insights",
        icon: Sparkles,
        description: "Patterns and explained leads",
      },
    ],
  },
  {
    label: "Integrity",
    items: [
      {
        title: "Evidence",
        href: "/evidence",
        icon: Landmark,
        description: "Exhibits store, per case",
      },
      {
        title: "Blockchain",
        href: "/blockchain",
        icon: Link2,
        description: "Simulated ledger integrity",
      },
      {
        title: "Security",
        href: "/security",
        icon: ShieldCheck,
        description: "Threat detection and alerts",
      },
      {
        title: "Audit Logs",
        href: "/audit-logs",
        icon: ScrollText,
        description: "Full action trail",
      },
      {
        title: "Reports",
        href: "/reports",
        icon: FileText,
        description: "Structured investigation reports",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        description: "System configuration",
      },
    ],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);
