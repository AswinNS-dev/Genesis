import React, { useState } from 'react';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../app/providers';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@crimeintel.demo');
  const [password, setPassword] = useState('Admin@1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-wider">
            CRIME<span className="text-sky-400">INTEL</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">AI-Assisted Investigation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Secure Authentication</h2>
            <p className="text-xs text-slate-500 mt-0.5">Authorized personnel only. All access is audited.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-sky-500 placeholder-slate-600"
                  placeholder="user@crimeintel.demo"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'Admin', email: 'admin@crimeintel.demo', pw: 'Admin@1234' },
                { role: 'Investigator', email: 'investigator@crimeintel.demo', pw: 'Inv3stigator!' },
                { role: 'Analyst', email: 'analyst@crimeintel.demo', pw: 'An@lyst2024' },
                { role: 'Viewer', email: 'viewer@crimeintel.demo', pw: 'V1ewer_Only' },
              ].map((d) => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                  className="text-left p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-sky-500/30 hover:bg-sky-500/5 transition-colors"
                >
                  <div className="text-xs font-semibold text-sky-400">{d.role}</div>
                  <div className="text-[10px] text-slate-500 truncate">{d.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-4">
          All data is fictional — demo prototype only. Not for real casework.
        </p>
      </div>
    </div>
  );
};
