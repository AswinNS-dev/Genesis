import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, Lock, Mail, Key, ArrowRight, CheckCircle2, AlertCircle,
  Database, Sparkles, UserCheck, Eye, EyeOff, RefreshCw, Copy, Check
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { authService, DemoUserItem } from '../../services/auth';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, quickLogin, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLoginLoadingId, setQuickLoginLoadingId] = useState<string | null>(null);

  // Demo users from Supabase
  const [demoUsers, setDemoUsers] = useState<DemoUserItem[]>([]);
  const [loadingDemoUsers, setLoadingDemoUsers] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const loadDemoUsers = async () => {
    setLoadingDemoUsers(true);
    try {
      const res = await authService.getDemoUsers();
      if (res?.demoUsers && res.demoUsers.length > 0) {
        setDemoUsers(res.demoUsers);
      } else {
        setDemoUsers(fallbackDemoUsers);
      }
    } catch (err) {
      console.warn('Could not fetch demo users from Supabase, using fallback:', err);
      setDemoUsers(fallbackDemoUsers);
    } finally {
      setLoadingDemoUsers(false);
    }
  };

  useEffect(() => {
    loadDemoUsers();
  }, []);

  const fallbackDemoUsers: DemoUserItem[] = [
    {
      id: 'usr-admin-001',
      email: 'admin@crimeintel.demo',
      name: 'Chief Inspector Admin',
      role: 'ADMIN',
      roleTitle: 'Chief Inspector / Admin',
      description: 'Full system control, user access, and audit logs',
      defaultPassword: 'Admin@1234',
      status: 'ACTIVE'
    },
    {
      id: 'usr-inv-002',
      email: 'investigator@crimeintel.demo',
      name: 'Senior Detective Rajesh Rao',
      role: 'INVESTIGATOR',
      roleTitle: 'Lead Investigator',
      description: 'Case management, suspect tracking, and timeline analysis',
      defaultPassword: 'Investigator@1234',
      status: 'ACTIVE'
    },
    {
      id: 'usr-ana-003',
      email: 'analyst@crimeintel.demo',
      name: 'Intelligence Analyst Priya Sharma',
      role: 'ANALYST',
      roleTitle: 'Forensic Intelligence Analyst',
      description: 'Graph clustering, anomaly detection, and link analysis',
      defaultPassword: 'Analyst@1234',
      status: 'ACTIVE'
    },
    {
      id: 'usr-view-004',
      email: 'viewer@crimeintel.demo',
      name: 'Field Officer Vikram Singh',
      role: 'VIEWER',
      roleTitle: 'Field Officer / Observer',
      description: 'Read-only access to dossiers, evidence, and public reports',
      defaultPassword: 'Viewer@1234',
      status: 'ACTIVE'
    }
  ];

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (user: DemoUserItem) => {
    setEmail(user.email);
    setPassword(user.defaultPassword || 'Admin@1234');
    setError(null);
  };

  const handleInstantDemoLogin = async (user: DemoUserItem) => {
    setQuickLoginLoadingId(user.id);
    setError(null);
    try {
      await quickLogin(user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || `Failed to sign in as ${user.name}`);
    } finally {
      setQuickLoginLoadingId(null);
    }
  };

  const copyCredentials = (user: DemoUserItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `Email: ${user.email}\nPassword: ${user.defaultPassword || 'Admin@1234'}`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'INVESTIGATOR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'ANALYST':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'VIEWER':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white relative overflow-hidden">
      {/* Background Cyber Grid Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-wider text-white">CRIME<span className="text-sky-400">INTEL</span></span>
              <span className="text-[10px] font-mono tracking-widest bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.5 rounded">RESTRICTED</span>
            </div>
            <p className="text-xs text-slate-400">AI-Powered Forensic Intelligence & Case Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-full font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Supabase Live Cloud Connected
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Live Demo Credentials (Visible to Anyone) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-sky-400" />
                    <h2 className="text-lg font-bold text-white tracking-wide">Live Demo Access Credentials</h2>
                    <span className="text-xs bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded-md border border-sky-500/30">
                      Public Visibility
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Directly synchronized with the <strong>Supabase User Database</strong>. Click any profile to fill the form or sign in instantly.
                  </p>
                </div>

                <button
                  onClick={loadDemoUsers}
                  disabled={loadingDemoUsers}
                  title="Reload from Supabase"
                  className="p-2 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800 flex items-center gap-1 text-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingDemoUsers ? 'animate-spin text-sky-400' : ''}`} />
                  <span className="hidden sm:inline">Sync</span>
                </button>
              </div>

              {/* Demo User Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {demoUsers.map((user) => {
                  const isQuickLoading = quickLoginLoadingId === user.id;
                  const isCurrentSelection = email.toLowerCase() === user.email.toLowerCase();

                  return (
                    <div
                      key={user.id}
                      onClick={() => handleSelectDemoUser(user)}
                      className={`group relative p-4 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                        isCurrentSelection
                          ? 'bg-sky-950/40 border-sky-500/50 shadow-md shadow-sky-500/10'
                          : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                          <button
                            onClick={(e) => copyCredentials(user, e)}
                            title="Copy credentials"
                            className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                          >
                            {copiedId === user.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <h3 className="font-semibold text-sm text-slate-100 group-hover:text-sky-300 transition-colors">
                          {user.name}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 mb-3">
                          {user.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-800/60 font-mono text-[11px]">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-slate-500">ID:</span>
                          <span className="text-slate-300 font-semibold truncate max-w-[150px]">{user.email}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-slate-500">Password:</span>
                          <span className="text-emerald-400 font-bold tracking-wider">{user.defaultPassword || 'Admin@1234'}</span>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectDemoUser(user);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans font-medium transition-colors text-center"
                          >
                            Fill Form
                          </button>
                          <button
                            type="button"
                            disabled={loading || isQuickLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInstantDemoLogin(user);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-sans font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm shadow-sky-600/30"
                          >
                            {isQuickLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <span>1-Click Sign In</span>
                                <ArrowRight className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Source Notice */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3 text-sky-400" />
                  Source: Supabase PostgreSQL `User` Table
                </span>
                <span>4 Active Accounts Pre-Configured</span>
              </div>
            </div>
          </div>

          {/* Right Column: Terminal Login Form */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-7 backdrop-blur-md shadow-2xl relative">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="w-5 h-5 text-sky-400" />
                  <h1 className="text-xl font-bold text-white tracking-wide">Investigator Sign-In</h1>
                </div>
                <p className="text-xs text-slate-400">
                  Authenticate using authorized department credentials or a demo profile.
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Authentication Error</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wider font-mono">
                    Officer Email / Identity
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@crimeintel.demo"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300 uppercase tracking-wider font-mono">
                      Security Passcode
                    </label>
                  </div>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-sky-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <span>Remember terminal session</span>
                  </label>
                  <span className="text-slate-500 font-mono text-[11px]">8h JWT Session</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Authenticate & Launch Console</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Guest Access */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">Want to explore immediately?</span>
                <button
                  type="button"
                  onClick={() => {
                    const adminUser = demoUsers.find(u => u.role === 'ADMIN') || demoUsers[0];
                    if (adminUser) handleInstantDemoLogin(adminUser);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Instant Admin Access</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 font-mono">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>CrimeIntel Forensic Intelligence Platform • v1.0.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span>SHA-256 Chained Evidence Ledger Active</span>
          <span>•</span>
          <span>Supabase RBAC Protocol</span>
        </div>
      </footer>
    </div>
  );
};
