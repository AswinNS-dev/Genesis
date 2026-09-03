import React, { useEffect, useState } from 'react';
import { visualizationsService, VisualizationsData } from '../../services/visualizations';
import { 
  RotateCw, 
  Download, 
  TrendingUp, 
  Layers, 
  Network, 
  Sparkles, 
  FolderLock, 
  Users, 
  PhoneCall, 
  Coins, 
  ShieldCheck, 
  FileText, 
  Activity, 
  MapPin, 
  Clock, 
  CheckCircle,
  Database,
  Filter,
  BarChart2,
  Zap,
  Target,
  AlertTriangle,
  Award,
  ChevronRight,
  TrendingDown,
  Globe
} from 'lucide-react';

export const VisualizationsView: React.FC = () => {
  const [data, setData] = useState<VisualizationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Database Filters
  const [district, setDistrict] = useState('All Districts');
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState('All Statuses');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await visualizationsService.getVisualizations({
        district: district !== 'All Districts' ? district : undefined,
        category: category !== 'All Categories' ? category : undefined,
        status: status !== 'All Statuses' ? status : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load visualizations data:', err);
      setError(err.message || 'Unable to load visualization data from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [district, category, status, dateFrom, dateTo]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 font-mono text-xs tracking-wider uppercase">Loading Database Visualizations...</span>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-100">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            Crime Intelligence & Statistical Visualizations
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time analytics engine synchronized with database records • {data?.dataSource || 'PostgreSQL'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-700/60 transition-all shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh Data</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-400 text-xs font-semibold rounded-lg border border-cyan-600/40 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-mono">
          {error}
        </div>
      )}

      {/* Dynamic Database-Backed Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl backdrop-blur-md grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Jurisdiction / District</label>
          <select 
            value={district} 
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option>All Districts</option>
            {data?.filterOptions.districts.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Crime Category</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option>All Categories</option>
            {data?.filterOptions.categories.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Docket Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option>All Statuses</option>
            {data?.filterOptions.statuses.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Date From</label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Date To</label>
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 font-medium"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setDistrict('All Districts');
              setCategory('All Categories');
              setStatus('All Statuses');
              setDateFrom('');
              setDateTo('');
            }}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Real Database KPI Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-gradient-to-br from-slate-900/80 to-amber-950/20 border border-amber-500/20 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-amber-300">
            <span>FIR Dockets</span>
            <FolderLock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-bold font-mono text-white">{kpis?.totalCases?.toLocaleString() ?? 0}</span>
          </div>
          <div className="text-[10px] text-amber-400 font-mono">
            {kpis?.filteredCount} in active filter
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-blue-950/20 border border-blue-500/20 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-blue-300">
            <span>Master Entities</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-bold font-mono text-white">{kpis?.totalEntities?.toLocaleString() ?? 0}</span>
          </div>
          <div className="text-[10px] text-blue-400/80 font-mono">
            Cataloged Suspects
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-cyan-950/20 border border-cyan-500/20 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-cyan-300">
            <span>CDR Intercepts</span>
            <PhoneCall className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-bold font-mono text-white">{kpis?.totalCommunications?.toLocaleString() ?? 0}</span>
          </div>
          <div className="text-[10px] text-cyan-400 font-mono">
            Call Logs & SMS
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-emerald-300">
            <span>Financial Transfers</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-bold font-mono text-white">{kpis?.totalTransactions?.toLocaleString() ?? 0}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            AML Transactions
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-rose-950/20 border border-rose-500/20 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-rose-300">
            <span>Active Inquiries</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-bold font-mono text-white">{kpis?.activeCases?.toLocaleString() ?? 0}</span>
          </div>
          <div className="text-[10px] text-rose-400 font-mono">
            Under Investigation
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/80 to-teal-950/20 border border-teal-500/20 p-3.5 rounded-xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium text-teal-300">
            <span>Evidence Items</span>
            <ShieldCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-bold font-mono text-white">{kpis?.evidenceDocuments?.toLocaleString() ?? 0}</span>
          </div>
          <div className="text-[10px] text-teal-400 font-mono">
            SHA-256 Verified
          </div>
        </div>
      </div>

      {/* Row 1 of Visualizations: Crime Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 1: Crime Trend (Monthly Timeline from Database) */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">1. Case Occurrence & Resolution Trend</h2>
              <p className="text-[11px] text-slate-400 font-mono">Monthly aggregation derived from database filing dates</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Total Cases
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Solved / Charged
              </span>
            </div>
          </div>

          {data?.crimeTrend && data.crimeTrend.length > 0 ? (
            <div className="h-56 w-full flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-800">
              {data.crimeTrend.map((t, idx) => {
                const maxVal = Math.max(...data.crimeTrend.map(x => x.total), 1);
                const heightPct = Math.max(12, Math.round((t.total / maxVal) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[10px] font-mono text-cyan-400 group-hover:text-white font-bold">
                      {t.total}
                    </span>
                    <div 
                      className="w-full max-w-[28px] bg-gradient-to-t from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 rounded-t transition-all shadow-sm"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-slate-500 truncate max-w-[40px] text-center">
                      {t.period.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-500 text-xs font-mono">
              No date-indexed case records available.
            </div>
          )}
        </div>

        {/* Visual 2: Crime Type Distribution */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">2. Crime Classification Breakdown</h2>
              <p className="text-[11px] text-slate-400 font-mono">Relative proportion across all registered offenses</p>
            </div>
            <span className="text-xs font-mono text-cyan-400">
              {data?.categoryDistribution.length} Categories
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.categoryDistribution.map((cat, idx) => {
              const gradients = [
                'from-cyan-500 to-blue-500',
                'from-blue-500 to-indigo-500',
                'from-purple-500 to-pink-500',
                'from-amber-500 to-orange-500',
                'from-emerald-500 to-teal-500',
                'from-rose-500 to-red-500',
                'from-sky-500 to-cyan-500'
              ];
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-200">{cat.name}</span>
                    <span className="font-mono text-slate-400">{cat.count} cases ({cat.percentage}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${gradients[idx % gradients.length]} rounded-full transition-all duration-500`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2 of Visualizations: District Analysis & Case Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 3: District / Jurisdiction Analysis */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">3. Jurisdictional Case Distribution</h2>
              <p className="text-[11px] text-slate-400 font-mono">Geographical case volume by police command center</p>
            </div>
            <MapPin className="w-4 h-4 text-rose-400" />
          </div>

          <div className="space-y-2.5">
            {data?.districtAnalysis.map((dist, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-200">{dist.district}</span>
                  <span className="font-mono text-slate-400">{dist.count} dockets ({dist.percentage}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${dist.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual 4: Case Status Distribution */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">4. Case Docket Progression & Status</h2>
              <p className="text-[11px] text-slate-400 font-mono">Current state of active police investigations</p>
            </div>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-3">
            {data?.statusDistribution.map((st, idx) => {
              const badgeColors: Record<string, string> = {
                'Chargesheeted': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                'Under Investigation': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                'Closed': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                'Open': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                'Acquitted': 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              };
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950/70 rounded-lg border border-slate-800/90 hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${badgeColors[st.status] || 'bg-slate-800 text-slate-300'}`}>
                      {st.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-white">{st.count}</span>
                    <span className="text-xs text-slate-400 font-mono ml-2">({st.percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3 of Visualizations: Colorful Network Intercept Hubs & Rich Intelligence Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual 5: Network Topology & Key Intercept Hubs (Visually Rich) */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                5. Network Topology & Key Intercept Hubs
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">Entities with highest connection degrees in the database</p>
            </div>
            <a 
              href="/network-graph"
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-950/50 border border-cyan-800/40 px-2.5 py-1 rounded-lg transition-colors"
            >
              Open Network Graph →
            </a>
          </div>

          <div className="space-y-2.5">
            {data?.networkInsight.topConnected.map((node, idx) => {
              const rankStyles = [
                { badge: 'from-amber-400 to-yellow-600 text-slate-950 border-amber-300', bar: 'from-amber-400 to-yellow-500' },
                { badge: 'from-cyan-400 to-blue-600 text-slate-950 border-cyan-300', bar: 'from-cyan-400 to-blue-500' },
                { badge: 'from-purple-400 to-pink-600 text-slate-950 border-purple-300', bar: 'from-purple-400 to-pink-500' },
                { badge: 'from-slate-700 to-slate-800 text-slate-300 border-slate-600', bar: 'from-slate-600 to-slate-700' },
                { badge: 'from-slate-700 to-slate-800 text-slate-300 border-slate-600', bar: 'from-slate-600 to-slate-700' },
                { badge: 'from-slate-700 to-slate-800 text-slate-300 border-slate-600', bar: 'from-slate-600 to-slate-700' },
              ];
              const style = rankStyles[idx] || rankStyles[3];
              const maxConn = Math.max(...(data?.networkInsight.topConnected.map(x => x.connections) || [1]), 1);
              const connPct = Math.round((node.connections / maxConn) * 100);

              const typeColors: Record<string, string> = {
                'LOCATION': 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                'PERSON': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
                'PHONE': 'bg-blue-500/10 text-blue-300 border-blue-500/30',
                'VEHICLE': 'bg-purple-500/10 text-purple-300 border-purple-500/30',
                'FIR': 'bg-pink-500/10 text-pink-300 border-pink-500/30'
              };

              return (
                <div key={idx} className="p-3 bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/90 hover:border-cyan-500/30 rounded-xl transition-all space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${style.badge} border flex items-center justify-center font-mono text-xs font-bold shadow-sm`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-white tracking-wide">{node.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${typeColors[node.type] || 'bg-slate-800 text-slate-400'}`}>
                            {node.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                            ID: {node.id.slice(0, 14)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold shadow-sm">
                        {node.connections} links
                      </span>
                    </div>
                  </div>

                  {/* Progress Meter Bar */}
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${style.bar} rounded-full transition-all duration-700`}
                      style={{ width: `${connPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual 6: Dynamic Intelligence Insights (Rich Visual Cards) */}
        <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                6. Intelligence Findings & Synthesis
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">Automated factual synthesis derived from live database records</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 border border-purple-800/40 text-purple-300">
              Live Synthesis
            </span>
          </div>

          <div className="space-y-3">
            {/* Card 1: Concentration Hotspot */}
            <div className="p-3.5 bg-gradient-to-r from-rose-950/40 to-slate-950 border border-rose-500/30 rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-rose-300 font-semibold">Primary Regional Hotspot</div>
                <div className="text-xs text-white font-medium mt-0.5">
                  {data?.insights[0] || 'Analyzing jurisdictional concentrations across active records.'}
                </div>
              </div>
            </div>

            {/* Card 2: Crime Type Trend */}
            <div className="p-3.5 bg-gradient-to-r from-purple-950/40 to-slate-950 border border-purple-500/30 rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0 mt-0.5">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-semibold">Dominant Offense Pattern</div>
                <div className="text-xs text-white font-medium mt-0.5">
                  {data?.insights[1] || 'Analyzing offense distribution across docket registry.'}
                </div>
              </div>
            </div>

            {/* Card 3: Docket Prosecution Stage */}
            <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 to-slate-950 border border-cyan-500/30 rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">Investigation Life-Cycle Status</div>
                <div className="text-xs text-white font-medium mt-0.5">
                  {data?.insights[2] || 'Tracking prosecution and inquiry progress.'}
                </div>
              </div>
            </div>

            {/* Card 4: Multi-Layer Telemetry */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/30 rounded-xl flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">Cross-Database Surveillance Corpus</div>
                <div className="text-xs text-white font-medium mt-0.5">
                  {data?.insights[3] || 'Audited against Supabase database tables.'}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Audit Status: Single Source of Truth</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> 100% Real Database Records
            </span>
          </div>
        </div>
      </div>

      {/* Filtered Incidents Live Table */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Filtered Case Records Stream</h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Showing {data?.recentIncidents.length} active items</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase font-semibold text-slate-400 tracking-wider font-mono">
                <th className="pb-2.5">Case Number</th>
                <th className="pb-2.5">Classification</th>
                <th className="pb-2.5">Jurisdiction</th>
                <th className="pb-2.5">Investigator</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Date Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {data?.recentIncidents.map((inc, i) => {
                const statusStyles: Record<string, string> = {
                  'UNDER_INVESTIGATION': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                  'CHARGESHEETED': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
                  'CLOSED': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                  'ACQUITTED': 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                };
                return (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 font-mono text-cyan-400 font-semibold">{inc.caseNumber}</td>
                    <td className="py-2.5 text-slate-200">{inc.crimeType}</td>
                    <td className="py-2.5 text-slate-400">{inc.location}</td>
                    <td className="py-2.5 text-slate-400 font-mono text-[11px]">{inc.officer}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${statusStyles[inc.status] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-[11px] text-slate-400">{inc.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
