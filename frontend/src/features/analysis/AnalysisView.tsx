import React, { useEffect, useState } from 'react';
import { caseService, Case, TimelineEventItem, CommunicationItem, TransactionItem, LocationItem } from '../../services/cases';
import { analysisService, NERResult, EntityMatchRecord } from '../../services/analysis';
import { RelationshipNetwork3D } from './RelationshipNetwork3D';
import { 
  Network, 
  Clock, 
  PhoneCall, 
  Coins, 
  MapPin, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const AnalysisView: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'network' | 'timeline' | 'comms' | 'txns' | 'locations' | 'ner' | 'matches'>('network');

  // Case Data
  const [network, setNetwork] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [timeline, setTimeline] = useState<TimelineEventItem[]>([]);
  const [comms, setComms] = useState<CommunicationItem[]>([]);
  const [txns, setTxns] = useState<TransactionItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // ML NER
  const [nerInput, setNerInput] = useState('Intercepted transmission: Target Rahul Kumar (contact: +919876512345) arrived in vehicle DL01AB1234 at Sector 18 Noida to meet associates from ABC Logistics regarding transaction of INR 500,000.');
  const [nerResult, setNerResult] = useState<NERResult | null>(null);
  const [nerRunning, setNerRunning] = useState(false);

  // Entity Matches
  const [matches, setMatches] = useState<EntityMatchRecord[]>([]);
  const [modelHealth, setModelHealth] = useState<Record<string, string>>({});
  const [supabaseStatus, setSupabaseStatus] = useState<string>('checking');
  const [modelOutput, setModelOutput] = useState<string | null>(null);
  const [modelsRunning, setModelsRunning] = useState(false);

  useEffect(() => {
    Promise.all([
      analysisService.getIntelligenceHealth(),
      analysisService.getSupabaseStatus(),
    ]).then(([health, supabase]) => {
      setModelHealth(health.models);
      setSupabaseStatus(supabase.status);
    }).catch(() => {
      setSupabaseStatus('unavailable');
    });

    const loadInitialCases = async () => {
      try {
        const c = await caseService.getCases();
        setCases(c);
        if (c.length > 0) {
          setSelectedCaseId(c[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadInitialCases();
  }, []);

  const runConnectedModels = async () => {
    if (!selectedCaseId) return;
    setModelsRunning(true);
    try {
      const relationships = await analysisService.extractRelationships(
        network.edges.map((edge) => ({ source: edge.source, target: edge.target, type: edge.type, strength: edge.strength }))
      );
      const communicationAnomalies = await analysisService.detectCommunicationAnomalies(
        comms.map((record) => ({ ...record, hour: new Date(record.timestamp).getHours() }))
      );
      const transactionAnomalies = await analysisService.detectTransactionAnomalies(
        txns.map((record) => ({ ...record, amount: record.amount }))
      );
      const temporal = await analysisService.detectTemporalAnomalies(selectedCaseId);
      const selectedCase = cases.find((item) => item.id === selectedCaseId);
      const summary = await analysisService.summarizeCase(`${selectedCase?.title ?? 'Selected case'} ${selectedCase?.description ?? ''}`);
      const leads = await analysisService.generateLeads(network.nodes[0]?.id, selectedCaseId);
      setModelOutput(JSON.stringify({
        selectedCaseId,
        supabase: supabaseStatus,
        graphAnalysis: {
          nodes: network.nodes.length,
          relationships: network.edges.length,
        },
        relationships: relationships.relationships.length,
        communicationAnalysis: {
          records: comms.length,
          anomalies: communicationAnomalies.anomalies.length,
        },
        transactionAnalysis: {
          records: txns.length,
          anomalies: transactionAnomalies.anomalies.length,
        },
        locationAnalysis: {
          records: locations.length,
        },
        temporalPatternDetection: {
          activities: Array.isArray(temporal.timeline) ? temporal.timeline.length : 0,
        },
        investigationSummarizer: {
          fallback: summary.fallback,
          confidence: summary.confidence,
        },
        investigationLeadGenerator: {
          leads: leads.leads.length,
        },
        modelWiring: modelHealth,
      }, null, 2));
    } catch (err) {
      setModelOutput(err instanceof Error ? err.message : 'Model execution failed.');
    } finally {
      setModelsRunning(false);
    }
  };

  useEffect(() => {
    if (!selectedCaseId) return;

    const loadCaseDetails = async () => {
      setLoading(true);
      try {
        const [net, time, commData, txnData, locData, matchData] = await Promise.all([
          caseService.getNetwork(selectedCaseId).catch(() => ({ nodes: [], edges: [] })),
          caseService.getTimeline(selectedCaseId).catch(() => []),
          caseService.getCommunications(selectedCaseId).catch(() => []),
          caseService.getTransactions(selectedCaseId).catch(() => []),
          caseService.getLocations(selectedCaseId).catch(() => []),
          analysisService.listEntityMatches().catch(() => []),
        ]);
        setNetwork(net);
        setTimeline(time);
        setComms(commData);
        setTxns(txnData);
        setLocations(locData);
        setMatches(matchData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadCaseDetails();
  }, [selectedCaseId]);

  const handleRunNER = async () => {
    if (!nerInput.trim()) return;
    try {
      setNerRunning(true);
      const res = await analysisService.extractNER(nerInput, selectedCaseId);
      setNerResult(res);
    } catch (err: any) {
      alert(`NER failed: ${err.message}`);
    } finally {
      setNerRunning(false);
    }
  };

  const handleUpdateMatch = async (matchId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await analysisService.updateMatchStatus(matchId, status);
      setMatches(matches.map(m => m.id === matchId ? { ...m, status } : m));
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            Intelligence Correlation & Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Multi-source link topology, timeline clustering, anomaly detection, and ML entity resolution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">Target Case:</label>
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.caseId} — {c.title}</option>
            ))}
          </select>
        </div>
      </div>

      <section className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Live data and model integration</h2>
            <p className="text-xs text-slate-400">Statuses come from the FastAPI health endpoints; results are generated from the selected case data.</p>
          </div>
          <span className={`text-xs font-mono ${supabaseStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>Supabase: {supabaseStatus}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(modelHealth).map(([name, state]) => (
            <span key={name} className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-mono text-slate-300">
              {name}: <span className="text-sky-400">{state}</span>
            </span>
          ))}
        </div>
        <button onClick={runConnectedModels} disabled={modelsRunning || !selectedCaseId} className="flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">
          {modelsRunning ? 'Running connected detectors...' : 'Run relationship and anomaly models'}
        </button>
        {modelOutput && <pre className="overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-emerald-300">{modelOutput}</pre>}
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        {[
          { id: 'network', label: 'Link Network', icon: Network, count: network.nodes.length },
          { id: 'timeline', label: 'Timeline', icon: Clock, count: timeline.length },
          { id: 'comms', label: 'Communications', icon: PhoneCall, count: comms.length },
          { id: 'txns', label: 'Transactions', icon: Coins, count: txns.length },
          { id: 'locations', label: 'Locations', icon: MapPin, count: locations.length },
          { id: 'ner', label: 'AI NER Extractor', icon: Sparkles },
          { id: 'matches', label: 'Entity Match Review', icon: Cpu, count: matches.filter(m => m.status === 'PENDING').length },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
                active 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  active ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
          Retrieving intelligence records from Supabase...
        </div>
      ) : activeTab === 'network' ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Link Analysis Graph ({network.nodes.length} nodes, {network.edges.length} relationships)</span>
          </div>
          {network.nodes.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">No linked entities in this case.</div>
          ) : (
            <>
              <RelationshipNetwork3D network={network} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono">Nodes (Entities)</h4>
                {network.nodes.map(n => (
                  <div key={n.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-white">{n.label}</span>
                      <span className="ml-2 text-xs font-mono text-slate-500">[{n.type}]</span>
                    </div>
                    <span className="text-xs font-mono text-amber-400">{n.riskScore}% Risk</span>
                  </div>
                ))}
                </div>
                <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase font-mono">Edges (Relationships)</h4>
                {network.edges.map(e => (
                  <div key={e.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300">{e.type} {e.label ? `(${e.label})` : ''}</span>
                    <span className="font-mono text-emerald-400">{e.strength}% Strength</span>
                  </div>
                ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : activeTab === 'timeline' ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 space-y-3">
          {timeline.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No timeline events recorded.</div>
          ) : (
            timeline.map(t => (
              <div key={t.id} className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-white">{t.summary}</h4>
                    <span className="text-xs font-mono text-slate-500">{new Date(t.eventAt).toLocaleString()}</span>
                  </div>
                  {t.detail && <p className="text-xs text-slate-400 mt-1">{t.detail}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'comms' ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="p-3.5">Caller</th>
                <th className="p-3.5">Receiver</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Tower</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comms.map(c => (
                <tr key={c.id} className="hover:bg-slate-900/40">
                  <td className="p-3.5 text-white">{c.callerName || c.caller}</td>
                  <td className="p-3.5 text-white">{c.receiverName || c.receiver}</td>
                  <td className="p-3.5">{c.durationSec}s</td>
                  <td className="p-3.5 text-slate-400">{c.cellTower || 'Sector Tower #18'}</td>
                  <td className="p-3.5">
                    {c.isAnomaly ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Anomaly</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'txns' ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="p-3.5">Sender</th>
                <th className="p-3.5">Receiver</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {txns.map(t => (
                <tr key={t.id} className="hover:bg-slate-900/40">
                  <td className="p-3.5 text-white">{t.sender}</td>
                  <td className="p-3.5 text-white">{t.receiver}</td>
                  <td className="p-3.5 text-amber-400 font-semibold">{t.currency} {t.amount.toLocaleString()}</td>
                  <td className="p-3.5">
                    {t.isSuspicious ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Suspicious</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">Verified</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'ner' ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Forensic Text & Document NER Extractor</h3>
          <textarea
            rows={4}
            value={nerInput}
            onChange={(e) => setNerInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            placeholder="Paste raw surveillance transcript or intercepted message..."
          />
          <button
            onClick={handleRunNER}
            disabled={nerRunning}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs rounded-lg transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{nerRunning ? 'Extracting Entities...' : 'Run Neural / Rule Extraction'}</span>
          </button>

          {nerResult && (
            <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-semibold text-amber-400">Extracted Entities (Persisted to Supabase):</h4>
              <div className="flex flex-wrap gap-2">
                {nerResult.entities.map((ent, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200">
                    <span className="text-amber-400 font-semibold mr-1.5">{ent.label}:</span>
                    {ent.text}
                    <span className="text-slate-500 ml-1.5">({Math.round(ent.confidence * 100)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-white">Pending Entity Match Verification</h3>
          {matches.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No pending entity matches awaiting review.</div>
          ) : (
            matches.map(m => (
              <div key={m.id} className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-slate-400">{m.reasons}</div>
                  <div className="text-xs font-mono text-amber-400 mt-1">Confidence: {m.confidence}% • Status: {m.status}</div>
                </div>
                {m.status === 'PENDING' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateMatch(m.id, 'APPROVED')}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs hover:bg-emerald-500/30"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateMatch(m.id, 'REJECTED')}
                      className="px-3 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs hover:bg-rose-500/30"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
