import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Users, Network, ShieldCheck, Database, FileText, Lock } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const menu = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/cases', label: 'Case Management', icon: FolderKanban },
    { path: '/entities', label: 'Entity Registry', icon: Users },
    { path: '/analysis', label: 'Graph & Intelligence', icon: Network },
    { path: '/data-workspace', label: 'Data Workspace', icon: Database },
    { path: '/blockchain', label: 'Blockchain Vault', icon: ShieldCheck },
    { path: '/reports', label: 'Reports & Dossiers', icon: FileText },
    { path: '/security', label: 'Security & Audit', icon: Lock },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-1 min-h-[calc(100vh-4rem)]">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Investigation Ops</div>
      {menu.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        );
      })}
    </aside>
  );
};
