import React, { useEffect, useState } from 'react';
import { reportService } from '../../services/reports';
import { caseService } from '../../services/cases';
import { Case } from '../../types';
import { FileText, Download, Printer, ChevronDown } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [casesLoading, setCasesLoading] = useState(true);

  useEffect(() => {
    caseService
      .list()
      .then((data) => {
        setCases(data);
        if (data.length > 0) {
          setSelectedCaseId(data[0].caseId);
        }
      })
      .catch(() => {})
      .finally(() => setCasesLoading(false));
  }, []);

  const fetchReport = async () => {
    if (!selectedCaseId) return;
    setLoading(true);
    setReport(null);
    try {
      const data = await reportService.generate(selectedCaseId);
      setReport(data);
    } catch (err) {
      console.error('Report generation error:', err);
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
      </div>

      {/* Case Selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <select
            value={selectedCaseId}
            onChange={(e) => setSelectedCaseId(e.target.value)}
            disabled={casesLoading}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-sky-500"
          >
            {casesLoading ? (
              <option>Loading cases…</option>
            ) : cases.length === 0 ? (
              <option>No cases available</option>
            ) : (
              cases.map((c) => (
                <option key={c.id} value={c.caseId}>
                  {c.caseId} — {c.title}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading || !selectedCaseId}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg text-sm transition-colors"
        >
          <FileText className="w-4 h-4" />
          {loading ? 'Generating…' : 'Generate Dossier'}
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
              <div className={`text-sm font-semibold mt-1 ${report.summaryMetrics.blockchainIntegrity === 'INTACT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {report.summaryMetrics.blockchainIntegrity}
              </div>
            </div>
          </div>

          {/* Entities table */}
          {report.entities && report.entities.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Registered Entities ({report.entities.length})</h3>
              <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 font-semibold uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Risk Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {report.entities.map((e: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-900/50">
                        <td className="px-3 py-2 font-medium">{e.name}</td>
                        <td className="px-3 py-2 text-slate-400">{e.type}</td>
                        <td className="px-3 py-2">
                          <span className={`font-bold ${e.riskScore > 70 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {e.riskScore}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 rounded-lg">
            {report.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
};
