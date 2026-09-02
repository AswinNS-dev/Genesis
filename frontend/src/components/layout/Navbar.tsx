import React, { useState } from 'react';
import { Shield, Search, Bell, LogOut } from 'lucide-react';
import { User } from '../../types';
import { useAuth } from '../../app/providers';
import { apiRequest } from '../../services/api';

interface NavbarProps {
  user: User;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiRequest<any>(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(res);
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  };

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/70 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
          <Shield className="w-5 h-5" />
        </div>
        <span className="font-bold text-lg tracking-wider text-slate-100">
          CRIME<span className="text-sky-400">INTEL</span>
        </span>
        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 ml-2">v1.0.0</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search cases, entities… (Enter)"
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64"
          />
          {searching && (
            <span className="absolute right-3 top-2.5 text-xs text-slate-500 animate-pulse">…</span>
          )}
        </div>

        {searchResults && (
          <div className="absolute top-16 right-64 z-50 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl min-w-[360px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Search: "{searchResults.query}"</span>
              <button onClick={() => setSearchResults(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕</button>
            </div>
            {searchResults.cases?.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Cases</div>
                {searchResults.cases.map((c: any) => (
                  <div key={c.id} className="text-xs text-slate-300 py-1 border-b border-slate-800">
                    <span className="font-mono text-sky-400 mr-2">{c.caseId}</span>{c.title}
                  </div>
                ))}
              </div>
            )}
            {searchResults.entities?.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Entities</div>
                {searchResults.entities.map((e: any) => (
                  <div key={e.id} className="text-xs text-slate-300 py-1 border-b border-slate-800">
                    <span className="text-purple-400 mr-2">[{e.type}]</span>{e.name}
                    <span className="ml-2 text-rose-400 font-mono">risk:{e.riskScore}</span>
                  </div>
                ))}
              </div>
            )}
            {(!searchResults.cases?.length && !searchResults.entities?.length) && (
              <p className="text-xs text-slate-500">No results found.</p>
            )}
          </div>
        )}

        <button className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg">
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-slate-300 leading-none">{user.name}</div>
            <div className="text-[10px] text-slate-500">{user.role}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="ml-1 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
