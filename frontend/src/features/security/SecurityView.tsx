import React from 'react';
import { Lock, ShieldAlert, KeyRound } from 'lucide-react';

export const SecurityView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Security & Access Audit</h1>
        <p className="text-sm text-slate-400">Multi-tier role based access control (RBAC) and real-time security events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sky-400 text-sm font-semibold mb-2">
            <Lock className="w-4 h-4" /> Role Hierarchy
          </div>
          <p className="text-xs text-slate-400">Strict hierarchical roles: VIEWER &lt; ANALYST &lt; INVESTIGATOR &lt; ADMIN.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-2">
            <KeyRound className="w-4 h-4" /> Cryptographic JWT
          </div>
          <p className="text-xs text-slate-400">State-of-the-art HS256 tokens with Bcrypt password hashing.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-2">
            <ShieldAlert className="w-4 h-4" /> Brute-force Shield
          </div>
          <p className="text-xs text-slate-400">Automatic account lockouts triggered after 5 consecutive failed attempts.</p>
        </div>
      </div>
    </div>
  );
};
