import React from 'react';
import { Shield, Search, Bell, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
          <Shield className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-wider text-slate-100">CRIME<span className="text-sky-400">INTEL</span></span>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 ml-2">v1.0.0</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases, entities, suspects..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64"
          />
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-semibold">
            VR
          </div>
          <span className="text-sm font-medium text-slate-300">Insp. Vikram Rao</span>
        </div>
      </div>
    </header>
  );
};
