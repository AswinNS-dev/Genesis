import React, { useEffect, useState } from 'react';
import {
  Database,
  Upload,
  FileSpreadsheet,
  Phone,
  ArrowRightLeft,
  MapPin,
  Users,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
  FileText,
  Filter,
  Plus,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  datasetService,
  DatasetItem,
  DatasetSummary,
  DatasetRecordItem,
} from '../../services/datasets';

export const DataWorkspaceView: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('ALL');

  // Ingestion Modal state
  const [showIngestModal, setShowIngestModal] = useState<boolean>(false);
  const [ingestTab, setIngestTab] = useState<'FILE' | 'PASTE'>('FILE');
  const [datasetName, setDatasetName] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('CDR');
  const [analysisScope, setAnalysisScope] = useState<string>('COMBINED');
  const [caseId, setCaseId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);

  // Record Inspector Modal state
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null);
  const [records, setRecords] = useState<DatasetRecordItem[]>([]);
  const [recordTotal, setRecordTotal] = useState<number>(0);
  const [recordPage, setRecordPage] = useState<number>(0);
  const [recordSearch, setRecordSearch] = useState<string>('');
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listData, sumData] = await Promise.all([
        datasetService.list(undefined, search || undefined, sourceTypeFilter),
        datasetService.getSummary(),
      ]);
      setDatasets(listData);
      setSummary(sumData);
    } catch (err: any) {
      setError(err.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadData();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!datasetName) {
        setDatasetName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
      }
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    setIngestError(null);
    setIngestSuccess(null);

    try {
      if (ingestTab === 'FILE') {
        if (!selectedFile) {
          throw new Error('Please select a file to ingest');
        }
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', datasetName || selectedFile.name);
        formData.append('sourceType', sourceType);
        formData.append('analysisScope', analysisScope);
        if (caseId) formData.append('caseId', caseId);

        const res = await datasetService.ingestFile(formData);
        setIngestSuccess(`Successfully ingested ${res.dataset.recordCount} records into '${res.dataset.name}'!`);
      } else {
        if (!pastedText.trim()) {
          throw new Error('Please enter or paste data to ingest');
        }
        const res = await datasetService.ingestJson({
          name: datasetName || 'Pasted Data Batch',
          sourceType,
          analysisScope,
          caseId: caseId || undefined,
          rawText: pastedText,
        });
        setIngestSuccess(`Successfully ingested ${res.dataset.recordCount} records into '${res.dataset.name}'!`);
      }

      // Refresh list
      setTimeout(() => {
        loadData();
        setShowIngestModal(false);
        resetIngestForm();
      }, 1200);
    } catch (err: any) {
      setIngestError(err.message || 'Dataset ingestion failed');
    } finally {
      setIngesting(false);
    }
  };

  const handleIngestSample = async (sampleType: 'CDR' | 'TRANSACTION' | 'LOCATION' | 'ENTITY') => {
    setLoading(true);
    try {
      await datasetService.ingestSample(sampleType);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest sample dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDataset = async (datasetId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete dataset '${name}'? All parsed records will be removed.`)) {
      return;
    }
    try {
      await datasetService.delete(datasetId);
      if (selectedDataset?.id === datasetId) {
        setSelectedDataset(null);
      }
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleOpenInspector = async (dataset: DatasetItem) => {
    setSelectedDataset(dataset);
    setRecordPage(0);
    setRecordSearch('');
    loadDatasetRecords(dataset.id, 0, '');
  };

  const loadDatasetRecords = async (datasetId: string, page: number, query: string) => {
    setLoadingRecords(true);
    try {
      const res = await datasetService.getRecords(datasetId, 25, page * 25, query);
      setRecords(res.records);
      setRecordTotal(res.total);
    } catch (err: any) {
      console.error('Failed to load dataset records:', err);
    } finally {
      setLoadingRecords(false);
    }
  };

  const resetIngestForm = () => {
    setDatasetName('');
    setSelectedFile(null);
    setPastedText('');
    setIngestError(null);
    setIngestSuccess(null);
  };

  const getSourceIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('CDR') || t.includes('PHONE')) return <Phone className="w-4 h-4 text-amber-400" />;
    if (t.includes('TRANS') || t.includes('BANK')) return <ArrowRightLeft className="w-4 h-4 text-emerald-400" />;
    if (t.includes('LOC') || t.includes('ANPR')) return <MapPin className="w-4 h-4 text-sky-400" />;
    if (t.includes('ENTITY') || t.includes('SUSPECT')) return <Users className="w-4 h-4 text-purple-400" />;
    return <FileSpreadsheet className="w-4 h-4 text-sky-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20 uppercase tracking-widest">
              Forensic Ingestion Engine
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
              Multi-Source Workspace
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">Multi-Source Data Workspace</h1>
          <p className="text-xs text-slate-400">
            Ingest, normalize, and correlate CDR logs, bank transaction dumps, ANPR toll scans, and entity manifests.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              resetIngestForm();
              setShowIngestModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" /> Ingest Dataset
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-lg text-xs transition-colors"
            title="Refresh Datasets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-400" /> Ingested Datasets
          </div>
          <div className="text-xl font-bold text-slate-100 mt-1">{summary?.totalDatasets ?? datasets.length}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Records Processed
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {(summary?.totalRecords ?? 0).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-amber-400" /> Telecom CDRs
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">{summary?.sourceBreakdown?.['CDR'] ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" /> Banking Flows
          </div>
          <div className="text-xl font-bold text-purple-400 mt-1">{summary?.sourceBreakdown?.['TRANSACTION'] ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <div className="text-[11px] text-slate-500 uppercase flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400" /> Location Scans
          </div>
          <div className="text-xl font-bold text-sky-400 mt-1">{summary?.sourceBreakdown?.['LOCATION'] ?? 0}</div>
        </div>
      </div>

      {/* Quick Demo Data Ingestion Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span><strong>Quick Ingestion:</strong> Load pre-formatted forensic test datasets directly into the pipeline:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleIngestSample('CDR')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 rounded text-[11px] font-medium transition-colors"
          >
            + Add Telecom CDR Dump
          </button>
          <button
            onClick={() => handleIngestSample('TRANSACTION')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-medium transition-colors"
          >
            + Add Bank Hawala Ledger
          </button>
          <button
            onClick={() => handleIngestSample('LOCATION')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/20 rounded text-[11px] font-medium transition-colors"
          >
            + Add ANPR Toll Scans
          </button>
          <button
            onClick={() => handleIngestSample('ENTITY')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-purple-400 border border-purple-500/20 rounded text-[11px] font-medium transition-colors"
          >
            + Add Suspect Manifest
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <form onSubmit={handleApplyFilter} className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by dataset title, file name, or source..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={sourceTypeFilter}
              onChange={(e) => setSourceTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Sources</option>
              <option value="CDR">CDR Telecom</option>
              <option value="TRANSACTION">Bank Transactions</option>
              <option value="LOCATION">ANPR / Location</option>
              <option value="GENERIC_CSV">Entity CSV / Manifest</option>
            </select>

            <button
              type="submit"
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors whitespace-nowrap"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <div>{error}</div>
        </div>
      )}

      {/* DATASET LISTING */}
      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
          Loading workspace datasets...
        </div>
      ) : datasets.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center">
          <Database className="w-8 h-8 text-sky-400 mb-2" />
          <h3 className="text-base font-semibold text-slate-200">No forensic datasets ingested yet</h3>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
            Upload CSV, CDR, or bank transaction dumps, or use the quick sample buttons above to populate the workspace.
          </p>
          <button
            onClick={() => handleIngestSample('CDR')}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-xs transition-colors"
          >
            Load Sample CDR Dataset
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasets.map((d) => (
            <div
              key={d.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      {getSourceIcon(d.sourceType)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100 text-xs leading-snug">{d.name}</h3>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{d.fileName || 'data-stream.csv'}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {d.sourceType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase">Records</div>
                    <div className="font-bold text-slate-200 mt-0.5">{d.recordCount} rows</div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase">Scope</div>
                    <div className="font-bold text-purple-400 mt-0.5">{d.analysisScope}</div>
                  </div>
                </div>

                {d.caseId && (
                  <div className="text-[10px] text-slate-400 mt-2">
                    Case Link: <strong className="text-slate-200 font-mono">{d.caseId}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-[10px] text-slate-500">
                <span>{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Active'}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenInspector(d)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-sky-400 transition-colors flex items-center gap-1 text-[11px] px-2 border border-slate-800"
                    title="Inspect Parsed Records"
                  >
                    <Eye className="w-3 h-3" /> View Data
                  </button>
                  <button
                    onClick={() => handleDeleteDataset(d.id, d.name)}
                    className="p-1.5 hover:bg-rose-500/10 rounded text-slate-400 hover:text-rose-400 transition-colors border border-slate-800"
                    title="Delete Dataset"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL 1: INGEST DATASET */}
      {showIngestModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-sm">Ingest Forensic Intelligence Dataset</h3>
              </div>
              <button
                onClick={() => setShowIngestModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ingestion Mode Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setIngestTab('FILE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  ingestTab === 'FILE'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload File (.csv, .json, .xlsx)
              </button>
              <button
                type="button"
                onClick={() => setIngestTab('PASTE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  ingestTab === 'PASTE'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Paste CSV / JSON Text
              </button>
            </div>

            {ingestError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{ingestError}</span>
              </div>
            )}

            {ingestSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{ingestSuccess}</span>
              </div>
            )}

            <form onSubmit={handleIngestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Dataset Title *</label>
                <input
                  type="text"
                  required
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. NCR Telecom CDR Intercept - Jan 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Source Type *</label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="CDR">CDR Telecom Dump</option>
                    <option value="TRANSACTION">Bank Transactions</option>
                    <option value="LOCATION">ANPR / Toll / GPS</option>
                    <option value="GENERIC_CSV">Entity Manifest / CSV</option>
                    <option value="CRIMINAL_HISTORY">Criminal Dockets</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Analysis Scope</label>
                  <select
                    value={analysisScope}
                    onChange={(e) => setAnalysisScope(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                  >
                    <option value="COMBINED">Combined Cross-Analysis</option>
                    <option value="STANDALONE">Isolated Standalone</option>
                    <option value="FORENSIC_TRIAGE">Rapid Forensic Triage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Link to FIR Case (Optional)</label>
                <input
                  type="text"
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  placeholder="e.g. CR-2026-1048 or FIR-001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              {ingestTab === 'FILE' ? (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Select File to Upload *</label>
                  <input
                    type="file"
                    accept=".csv,.tsv,.json,.xlsx,.pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="w-full text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/20 cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="text-[11px] text-emerald-400 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Paste CSV Header & Rows or JSON *</label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="caller_name,caller_phone,callee_name,callee_phone,duration_sec,timestamp&#10;Rahul Kumar,+919876512345,Ramesh Kumar,+919811099882,142,2026-09-02 23:45:10"
                    className="w-full font-mono text-[11px] bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ingesting}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {ingesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {ingesting ? 'Processing & Normalizing...' : 'Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD INSPECTOR */}
      {selectedDataset && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {selectedDataset.sourceType}
                  </span>
                  <h3 className="font-bold text-slate-100 text-base">{selectedDataset.name}</h3>
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Showing records for file: <span className="font-mono text-slate-200">{selectedDataset.fileName}</span> ({recordTotal} total rows)
                </div>
              </div>
              <button
                onClick={() => setSelectedDataset(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Record Search Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={recordSearch}
                  onChange={(e) => setRecordSearch(e.target.value)}
                  placeholder="Filter records by suspect name, phone, account, or location..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                onClick={() => loadDatasetRecords(selectedDataset.id, 0, recordSearch)}
                className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-slate-950 font-semibold rounded-lg text-xs"
              >
                Search
              </button>
            </div>

            {/* Records Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-lg bg-slate-950">
              {loadingRecords ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                  Loading parsed records...
                </div>
              ) : records.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  No records found in this dataset.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-mono sticky top-0">
                    <tr>
                      <th className="p-2.5 w-12">#</th>
                      <th className="p-2.5">Raw Stream Record</th>
                      <th className="p-2.5">Normalized Forensic Fields</th>
                      <th className="p-2.5 w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-slate-500 font-bold">{r.rowIndex}</td>
                        <td className="p-2.5 text-slate-300 max-w-xs truncate">
                          {JSON.stringify(r.raw)}
                        </td>
                        <td className="p-2.5 text-emerald-400 max-w-sm truncate">
                          {JSON.stringify(r.normalized)}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400">
                            {r.matchStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div>
                Showing page {recordPage + 1} of {Math.ceil(recordTotal / 25) || 1} ({recordTotal} records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={recordPage === 0 || loadingRecords}
                  onClick={() => {
                    const next = recordPage - 1;
                    setRecordPage(next);
                    loadDatasetRecords(selectedDataset.id, next, recordSearch);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={(recordPage + 1) * 25 >= recordTotal || loadingRecords}
                  onClick={() => {
                    const next = recordPage + 1;
                    setRecordPage(next);
                    loadDatasetRecords(selectedDataset.id, next, recordSearch);
                  }}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
