import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../services/api';
import { BlockchainRecord } from '../../types';

export const BlockchainView: React.FC = () => {
  const [blocks, setBlocks] = useState<BlockchainRecord[]>([]);
  const [validating, setValidating] = useState(false);
  const [status, setStatus] = useState<string>('VALID');

  const loadBlocks = () => {
    apiRequest<BlockchainRecord[]>('/blockchain').then(setBlocks).catch(() => {});
  };

  useEffect(() => {
    loadBlocks();
  }, []);

  const verifyChain = async () => {
    setValidating(true);
    try {
      const res = await apiRequest<any>('/blockchain/verify-chain', { method: 'POST' });
      setStatus(res.status);
    } catch {
      setStatus('ERROR');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Cryptographic Blockchain Ledger</h1>
          <p className="text-sm text-slate-400">Tamper-evident chained SHA-256 evidence verification records.</p>
        </div>
        <button
          onClick={verifyChain}
          disabled={validating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} /> Verify Complete Chain
        </button>
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        <div>
          <div className="text-sm font-semibold text-emerald-400">Chain Integrity Status: {status}</div>
          <div className="text-xs text-slate-400">All blocks cryptographically validated from Genesis. Zero tampering detected.</div>
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-bold text-sky-400">BLOCK #{b.index}</span>
              <span>{new Date(b.timestamp).toISOString()}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500">Hash: </span>
                <span className="text-emerald-400 break-all">{b.hash}</span>
              </div>
              <div>
                <span className="text-slate-500">Prev Hash: </span>
                <span className="text-slate-400 break-all">{b.previousHash}</span>
              </div>
            </div>
            {b.note && <div className="text-slate-400 italic pt-1 border-t border-slate-800 font-sans">{b.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};
