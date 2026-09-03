import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { caseService, Case, TimelineEventItem, CommunicationItem, TransactionItem, LocationItem } from '../../services/cases';
import { 
  analysisService, NERResult, EntityMatchRecord, 
  GraphAnalysisData, GraphNode, GraphEdge 
} from '../../services/analysis';
import { 
  Network, Clock, PhoneCall, Coins, MapPin, 
  Cpu, CheckCircle, XCircle, Search, Sparkles, 
  ArrowRight, Activity, Zap, Route, Layers, 
  RefreshCw, TrendingUp, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { InteractiveGraphCanvas } from './components/InteractiveGraphCanvas';
import { GraphInsightsPanel } from './components/GraphInsightsPanel';
import { PathFinderVisualizer } from './components/PathFinderVisualizer';
import { EntityDetailCard } from './components/EntityDetailCard';
import { CommunityClusterCards } from './components/CommunityClusterCards';

export const AnalysisView: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'graph' | 'insights' | 'pathfinder' | 'clusters' | 'timeline' | 'comms' | 'txns' | 'locations' | 'ner' | 'matches'
  >('graph');

  // Case Data
  const [graphAnalysis, setGraphAnalysis] = useState<GraphAnalysisData | null>(null);
  const [network, setNetwork] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [timeline, setTimeline] = useState<TimelineEventItem[]>([]);
  const [comms, setComms] = useState<CommunicationItem[]>([]);
  const [txns, setTxns] = useState<TransactionItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Inspector & Path Highlighting
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);

  // ML NER
  const [nerInput, setNerInput] = useState('Intercepted transmission: Target Rahul Kumar (contact: +919876512345) arrived in vehicle DL01AB1234 at Sector 18 Noida to meet associates from ABC Logistics regarding transaction of INR 500,000.');
  const [nerResult, setNerResult] = useState<NERResult | null>(null);
  const [nerRunning, setNerRunning] = useState(false);

  // Entity Matches
  const [matches, setMatches] = useState<EntityMatchRecord[]>([]);

  useEffect(() => {
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

  const loadCaseDetails = async () => {
    if (!selectedCaseId) return;
    setLoading(true);
    try {
      const [analysisData, net, time, commData, txnData, locData, matchData] = await Promise.all([
        analysisService.getGraphAnalysis(selectedCaseId).catch(() => null),
        caseService.getNetwork(selectedCaseId).catch(() => ({ nodes: [], edges: [] })),
        caseService.getTimeline(selectedCaseId).catch(() => []),
        caseService.getCommunications(selectedCaseId).catch(() => []),
        caseService.getTransactions(selectedCaseId).catch(() => []),
        caseService.getLocations(selectedCaseId).catch(() => []),
        analysisService.listEntityMatches().catch(() => []),
      ]);

      setGraphAnalysis(analysisData);
      
      // Merge topology nodes if available
      if (analysisData?.nodes && analysisData.nodes.length > 0) {
        setNetwork({ nodes: analysisData.nodes, edges: analysisData.edges });
      } else {
        setNetwork(net as any);
      }

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

  useEffect(() => {
    loadCaseDetails();
    setSelectedNode(null);
    setHighlightedPath([]);
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

  const handleSelectNeighbor = (neighborId: string) => {
    const neighbor = network.nodes.find(n => n.id === neighborId);
    if (neighbor) {
      setSelectedNode(neighbor);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Case Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Graph & Intelligence Center
            </h1>
            <span className="text-[11px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full">
              AI Powered
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Topological link topology, Brandes centrality heatmaps, Dijkstra pathfinding, and ML entity resolution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-mono text-slate-400">Target Docket:</label>
          <select 
            value={selectedCaseId} 
            onChange={(e) => setSelectedCaseId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500 shadow-sm"
          >
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.caseId} — {c.title}</option>
            ))}
          </select>
          <button
            onClick={loadCaseDetails}
            title="Refresh Intelligence Data"
            className="p-2 text-slate-400 hover:text-white bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium scrollbar-none">
        {[
          { id: 'graph', label: 'Network Topology', icon: Network, count: network.nodes.length },
          { id: 'insights', label: 'AI Syndicate Insights', icon: Sparkles, badge: 'Insights' },
          { id: 'pathfinder', label: 'Path Route Finder', icon: Route },
          { id: 'clusters', label: 'Gang Clusters', icon: Layers, count: graphAnalysis?.communities?.length },
          { id: 'timeline', label: 'Timeline', icon: Clock, count: timeline.length },
          { id: 'comms', label: 'Communications', icon: PhoneCall, count: comms.length },
          { id: 'txns', label: 'Financial Matrix', icon: Coins, count: txns.length },
          { id: 'locations', label: 'Locations', icon: MapPin, count: locations.length },
          { id: 'ner', label: 'AI NER Extractor', icon: Zap },
          { id: 'matches', label: 'Match Review', icon: Cpu, count: matches.filter(m => m.status === 'PENDING').length },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap text-xs font-medium ${
                active 
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm shadow-sky-500/10' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                  active ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-amber-500/20 text-amber-300 font-bold uppercase">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-16 text-center text-slate-500 text-xs font-mono animate-pulse bg-slate-900/30 border border-slate-800 rounded-2xl">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Synchronizing intelligence records & computing network topology from Supabase...
        </div>
      ) : activeTab === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visual Graph Canvas */}
          <div className={selectedNode ? 'lg:col-span-8' : 'lg:col-span-12'}>
            <InteractiveGraphCanvas
              nodes={network.nodes}
              edges={network.edges}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(node) => setSelectedNode(node)}
              highlightedPath={highlightedPath}
            />
          </div>

          {/* Interactive Forensic Inspector Drawer */}
          {selectedNode && (
            <div className="lg:col-span-4">
              <EntityDetailCard
                node={selectedNode}
                edges={network.edges}
                onClose={() => setSelectedNode(null)}
                onSelectNeighbor={handleSelectNeighbor}
              />
            </div>
          )}
        </div>
      ) : activeTab === 'insights' ? (
        <GraphInsightsPanel
          analysisData={graphAnalysis}
          onSelectNode={(node) => {
            setSelectedNode(node);
            setActiveTab('graph');
          }}
        />
      ) : activeTab === 'pathfinder' ? (
        <PathFinderVisualizer
          nodes={network.nodes}
          onHighlightPath={(pathIds) => {
            setHighlightedPath(pathIds);
            setActiveTab('graph');
          }}
        />
      ) : activeTab === 'clusters' ? (
        <CommunityClusterCards
          analysisData={graphAnalysis}
          onSelectNode={(node) => {
            setSelectedNode(node);
            setActiveTab('graph');
          }}
        />
      ) : activeTab === 'timeline' ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Chronological Investigation Timeline ({timeline.length} Events)
            </h3>
            <span className="text-xs font-mono text-slate-500">Temporal Event Correlation</span>
          </div>
          {timeline.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-mono">No timeline events recorded in this case.</div>
          ) : (
            <div className="space-y-3">
              {timeline.map((t, idx) => (
                <div key={t.id || idx} className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="text-sm font-semibold text-white">{t.summary}</h4>
                      <span className="text-xs font-mono text-amber-400/90">{new Date(t.eventAt).toLocaleString()}</span>
                    </div>
                    {t.detail && <p className="text-xs text-slate-400 mt-1">{t.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'comms' ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <PhoneCall className="w-4 h-4 text-sky-400" />
              Telecommunication Intercept Logs & Anomaly Detection
            </h3>
            <span className="text-xs font-mono text-slate-400">{comms.length} records</span>
          </div>
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="p-3.5">Caller / Intercept</th>
                <th className="p-3.5">Recipient Target</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Tower Site</th>
                <th className="p-3.5">Anomaly Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comms.map(c => (
                <tr key={c.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="p-3.5 text-white font-medium">{c.callerName || c.caller}</td>
                  <td className="p-3.5 text-white font-medium">{c.receiverName || c.receiver}</td>
                  <td className="p-3.5">{c.durationSec}s</td>
                  <td className="p-3.5 text-slate-400">{c.cellTower || 'Sector Tower #18'}</td>
                  <td className="p-3.5">
                    {c.isAnomaly ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                        ANOMALOUS BURST
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        NORMAL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'txns' ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
              <Coins className="w-4 h-4 text-amber-400" />
              Financial Transaction Flow & AML Laundering Radar
            </h3>
            <span className="text-xs font-mono text-slate-400">{txns.length} transactions</span>
          </div>
          <table className="w-full text-left text-xs font-mono text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="p-3.5">Origin Account / Sender</th>
                <th className="p-3.5">Beneficiary Receiver</th>
                <th className="p-3.5">Amount (INR)</th>
                <th className="p-3.5">Forensic Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {txns.map(t => (
                <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="p-3.5 text-white font-medium">{t.sender}</td>
                  <td className="p-3.5 text-white font-medium">{t.receiver}</td>
                  <td className="p-3.5 text-amber-400 font-bold">{t.currency} {t.amount.toLocaleString()}</td>
                  <td className="p-3.5">
                    {t.isSuspicious ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                        AML SUSPICIOUS
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                        LEGITIMATE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'locations' ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-sky-950/40 via-slate-900/60 to-slate-950 border border-sky-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                GEOGRAPHIC INVESTIGATION CAPABILITY
              </span>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-400" />
                Case Hotspot & Regional Location Intelligence
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Explore hierarchical state/district drill-downs, heatmaps, cluster markers, and incident-date correlation for this case.
              </p>
            </div>
            <button
              onClick={() => navigate('/locations')}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-all shrink-0"
            >
              <span>Launch Full Hotspot Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                <MapPin className="w-4 h-4 text-rose-400" />
                Case Geolocation Telemetry Traces
              </h3>
              <span className="text-xs font-mono text-slate-400">{locations.length} recorded locations</span>
            </div>
            {locations.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs font-mono">
                No location traces directly linked to this docket. Use the full Hotspot Analysis module to query cross-case regional activity.
              </div>
            ) : (
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                  <tr>
                    <th className="p-3.5">Location Identifier</th>
                    <th className="p-3.5">Observation Source / Type</th>
                    <th className="p-3.5">Geographic Anchor</th>
                    <th className="p-3.5">Coordinates</th>
                    <th className="p-3.5">Activity Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {locations.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="p-3.5 text-white font-medium">{l.name}</td>
                      <td className="p-3.5 text-slate-300">{l.type || 'Surveillance Trace'}</td>
                      <td className="p-3.5 text-slate-400">{l.address || 'Jurisdiction Core'}</td>
                      <td className="p-3.5 text-sky-400 font-mono text-[11px]">{l.coordinates || 'Derived'}</td>
                      <td className="p-3.5 font-bold text-amber-400">{l.activityCount || 1} hits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeTab === 'ner' ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Neural Named Entity Extractor (DistilBERT / Pattern NER)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Extract suspect names, vehicle numbers, phone numbers, and contraband organizations from unstructured text.
            </p>
          </div>
          <textarea
            rows={4}
            value={nerInput}
            onChange={(e) => setNerInput(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            placeholder="Paste raw surveillance transcript, confession, or intercepted message..."
          />
          <button
            onClick={handleRunNER}
            disabled={nerRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{nerRunning ? 'Executing Neural Extraction...' : 'Extract Entities & Sync'}</span>
          </button>

          {nerResult && (
            <div className="mt-4 p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Extracted Forensic Entities ({nerResult.entities.length}):
              </h4>
              <div className="flex flex-wrap gap-2.5">
                {nerResult.entities.map((ent, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-1.5 shadow-sm">
                    <span className="text-amber-400 font-bold">{ent.label}:</span>
                    <span className="text-white font-semibold">{ent.text}</span>
                    <span className="text-slate-500 text-[10px]">({Math.round(ent.confidence * 100)}%)</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Pending Entity Match & Resolution Review
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                AI identity deduplication resolving aliases, multiple phone SIMs, and cross-case personas.
              </p>
            </div>
            <span className="text-xs font-mono bg-sky-500/10 text-sky-400 px-3 py-1 rounded-lg border border-sky-500/20">
              {matches.filter(m => m.status === 'PENDING').length} Pending
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-mono">No pending entity matches awaiting review.</div>
          ) : (
            <div className="space-y-3">
              {matches.map(m => (
                <div key={m.id} className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-slate-300 font-semibold">{m.reasons}</div>
                    <div className="text-xs font-mono text-amber-400 mt-1">
                      Match Confidence: <strong className="text-white">{m.confidence}%</strong> • Status: {m.status}
                    </div>
                  </div>
                  {m.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      <button
                        onClick={() => handleUpdateMatch(m.id, 'APPROVED')}
                        className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs hover:bg-emerald-500/30 font-semibold transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve Match</span>
                      </button>
                      <button
                        onClick={() => handleUpdateMatch(m.id, 'REJECTED')}
                        className="px-3.5 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs hover:bg-rose-500/30 font-semibold transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
