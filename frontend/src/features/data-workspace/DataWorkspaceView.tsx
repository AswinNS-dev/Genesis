import React, { useEffect, useRef, useState } from 'react';
import { datasetService } from '../../services/datasets';
import { Database, Upload, FileSpreadsheet, CheckCircle2, Clock, AlertCircle, X } from 'lucide-react';

interface IngestResult {
  name: string;
  recordCount: number;
  status: string;
}

export const DataWorkspaceView: React.FC = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<IngestResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setLoading(true);
    datasetService
      .list()
      .then(setDatasets)
      .catch(() => setDatasets([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadResult(null);
    setUploading(true);

    try {
      const token = (window as any).__CI_TOKEN__;
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name.replace(/\.[^.]+$/, ''));
      form.append('analysisScope', 'COMBINED');

      const res = await fetch('/api/datasets/ingest', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || 'Upload failed');
      }

      const data = await res.json();
      setUploadResult({ name: data.name, recordCount: data.recordCount, status: data.status });
      reload();
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const statusMeta: Record<string, { label: string; cls: string }> = {
    UPLOADED: { label: 'Uploaded', cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    READY: { label: 'Ready', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    MATCHING: { label: 'Matching', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    ERROR: { label: 'Error', cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Multi-Source Data Workspace</h1>
          <p className="text-sm text-slate-400">Ingest CSV records for CDR, transactions, FIR and vehicle data.</p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg text-sm transition-colors"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Ingest CSV Dataset'}
          </button>
        </div>
      </div>

      {/* Upload feedback */}
      {uploadResult && (
        <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-emerald-400">Dataset ingested successfully</div>
            <div className="text-slate-400 text-xs mt-0.5">
              {uploadResult.name} — {uploadResult.recordCount.toLocaleString()} records — Status: {uploadResult.status}
            </div>
          </div>
          <button onClick={() => setUploadResult(null)}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-rose-400">Ingestion failed</div>
            <div className="text-slate-400 text-xs mt-0.5">{uploadError}</div>
          </div>
          <button onClick={() => setUploadError(null)}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-500 py-12 text-sm">Loading datasets…</div>
      ) : datasets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-700 rounded-xl text-center">
          <Database className="w-12 h-12 text-slate-700 mb-3" />
          <div className="text-slate-400 font-medium">No datasets yet</div>
          <div className="text-slate-600 text-sm mt-1">Click "Ingest CSV Dataset" to upload your first dataset.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.map((d) => {
            const meta = statusMeta[d.status] ?? { label: d.status, cls: 'bg-slate-700 text-slate-400 border-slate-600' };
            return (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileSpreadsheet className="w-5 h-5 text-sky-400 shrink-0" />
                    <h3 className="font-semibold text-slate-100 text-sm truncate">{d.name}</h3>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded border shrink-0 ${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Source type</span>
                    <span>{d.sourceType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Records</span>
                    <span className="font-semibold text-slate-200">{(d.recordCount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Scope</span>
                    <span>{d.analysisScope}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ingested</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(d.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
