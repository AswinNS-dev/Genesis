import React from 'react';
import { LayoutDashboard, FolderKanban, Users, Network, ShieldCheck, Database, FileText, Lock } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const menu = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'cases', label: 'Case Management', icon: FolderKanban },
    { id: 'entities', label: 'Entity Registry', icon: Users },
    { id: 'analysis', label: 'Graph & Intelligence', icon: Network },
    { id: 'data-workspace', label: 'Data Workspace', icon: Database },
    { id: 'blockchain', label: 'Blockchain Vault', icon: ShieldCheck },
    { id: 'reports', label: 'Reports & Dossiers', icon: FileText },
    { id: 'security', label: 'Security & Audit', icon: Lock },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-1 min-h-[calc(100vh-4rem)]">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Investigation Ops</div>
      {menu.map((item) => {
        const Icon = item.icon;
        const active = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </aside>
  );
};
