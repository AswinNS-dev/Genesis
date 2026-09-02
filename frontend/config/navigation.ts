import {
  LayoutDashboard,
  FolderKanban,
  FileSearch,
  Users,
  Database,
  Radar,
  Landmark,
  Link2,
  ShieldCheck,
  ScrollText,
  FileText,
  Settings,
  Clock,
  Share2,
  GitCompare,
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
    label: "Data",
    items: [
      {
        title: "Data Workspace",
        href: "/data-workspace",
        icon: Database,
        description: "Ingest datasets, map fields, match & merge entities",
      },
    ],
  },
  {
    label: "Investigation Analytics",
    items: [
      {
        title: "Analysis",
        href: "/analysis",
        icon: Radar,
        description: "Unified investigative analysis workspace",
      },
      {
        title: "Graph Analysis",
        href: "/graph-analysis",
        icon: Share2,
        description: "Centrality rankings, communities & path analysis",
      },
      {
        title: "Temporal Detection",
        href: "/temporal",
        icon: Clock,
        description: "Pre/post crime temporal anomaly detection",
      },
      {
        title: "Entity Resolution",
        href: "/entity-resolution",
        icon: GitCompare,
        description: "Phonetic matching, multi-signal evidence & identity review",
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