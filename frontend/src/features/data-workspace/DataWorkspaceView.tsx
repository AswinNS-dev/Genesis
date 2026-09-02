import React, { useEffect, useState } from 'react';
import { datasetService } from '../../services/datasets';
import { Database, Upload, FileSpreadsheet } from 'lucide-react';

export const DataWorkspaceView: React.FC = () => {
  const [datasets, setDatasets] = useState<any[]>([]);

  useEffect(() => {
    datasetService.list().then(setDatasets).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Multi-Source Data Workspace</h1>
          <p className="text-sm text-slate-400">Ingest CSV, CDR records, bank transaction dumps, and PDF dossiers.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-sm transition-colors">
          <Upload className="w-4 h-4" /> Ingest Dataset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasets.map((d) => (
          <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                <h3 className="font-semibold text-slate-100 text-sm">{d.name}</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {d.sourceType}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Records: <span className="font-semibold text-slate-200">{d.recordCount}</span> · Scope: {d.analysisScope}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
