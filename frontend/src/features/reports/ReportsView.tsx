import React, { useState } from 'react';
import { reportService } from '../../services/reports';
import { FileText, Download, Printer } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await reportService.generate('CR-2026-1052');
      setReport(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Case Intelligence Dossiers</h1>
          <p className="text-sm text-slate-400">Export official confidential law-enforcement investigation reports.</p>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-sm transition-colors"
        >
          <FileText className="w-4 h-4" /> Generate Dossier (CR-2026-1052)
        </button>
      </div>

      {report && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">{report.case.classification}</span>
              <h2 className="text-xl font-bold text-slate-100 mt-1">{report.reportId}</h2>
              <p className="text-xs text-slate-400">Generated: {report.generatedAt}</p>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-500 uppercase">Case Status</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">{report.case.status}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-500 uppercase">Total Entities</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">{report.summaryMetrics.entityCount}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-500 uppercase">Evidence Documents</div>
              <div className="text-sm font-semibold text-slate-200 mt-1">{report.summaryMetrics.evidenceCount}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-xs text-slate-500 uppercase">Blockchain Verification</div>
              <div className="text-sm font-semibold text-emerald-400 mt-1">{report.summaryMetrics.blockchainIntegrity}</div>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 rounded-lg">
            {report.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
