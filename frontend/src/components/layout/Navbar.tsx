import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Search, Bell, User as UserIcon, LogOut, LogIn, ChevronDown, Check, Sparkles, Database } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { authService, DemoUserItem } from '../../services/auth';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [demoUsers, setDemoUsers] = useState<DemoUserItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchDemoUsers() {
      try {
        const res = await authService.getDemoUsers();
        if (res?.demoUsers) {
          setDemoUsers(res.demoUsers);
        }
      } catch {}
    }
    fetchDemoUsers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'OP';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch ((role || '').toUpperCase()) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'INVESTIGATOR':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ANALYST':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'VIEWER':
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 group-hover:border-sky-400 transition-colors">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-wider text-slate-100 group-hover:text-white transition-colors">
            CRIME<span className="text-sky-400">INTEL</span>
          </span>
        </Link>
        <span className="text-[11px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 ml-1">
          v1.0.0
        </span>
        <div className="hidden md:flex items-center gap-1.5 ml-3 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Supabase Live</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search cases, entities, suspects..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-64"
          />
        </div>

        {/* Demo Credentials Quick Link */}
        <Link
          to="/login"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
        >
          <KeyIcon className="w-3.5 h-3.5 text-sky-400" />
          <span>Demo Credentials</span>
        </Link>

        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-2 py-1 pr-2 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-800"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-sky-500/30">
                {getInitials(user.name)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-semibold text-slate-200 leading-tight">
                  {user.name}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(user.role)}`}>
                    {user.role}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate max-w-[110px]">{user.email}</span>
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 backdrop-blur-xl">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-xs text-slate-500 font-mono">AUTHENTICATED OFFICER</p>
                  <p className="text-sm font-bold text-white mt-0.5">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>

                {/* Quick Account Switcher */}
                <div className="px-3 py-2 border-b border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1 px-1">
                    <span>SWITCH DEMO PROFILE</span>
                    <span className="text-[10px] text-sky-400">Supabase</span>
                  </div>
                  <div className="space-y-1">
                    {demoUsers.map((du) => {
                      const isCurrent = user.email.toLowerCase() === du.email.toLowerCase();
                      return (
                        <button
                          key={du.id}
                          onClick={async () => {
                            await switchAccount(du);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            isCurrent
                              ? 'bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/30'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="block font-medium">{du.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{du.role}</span>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-1 px-2">
                  <Link
                    to="/login"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <KeyIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>View All Demo Credentials</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors font-medium mt-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In / Demo</span>
          </Link>
        )}
      </div>
    </header>
  );
};

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);
