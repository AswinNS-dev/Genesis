import React, { useState, useEffect } from 'react';
import { 
  MapPin, Globe, Filter, Calendar, Clock, AlertTriangle, 
  ChevronRight, RefreshCw, CheckCircle2, ShieldAlert, 
  Layers, PhoneCall, Coins, Car, FolderKanban, Radio, Sparkles
} from 'lucide-react';
import { 
  locationService, 
  GeographicHierarchyResponse, 
  HotspotsResponse, 
  CaseIncidentOption, 
  ClusterMarker 
} from '../../services/locations';
import { LocationMapView } from './components/LocationMapView';

export const LocationAnalysisView: React.FC = () => {
  // Geographic Hierarchy State
  const [level, setLevel] = useState<'india' | 'state' | 'district' | 'area'>('india');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [hierarchy, setHierarchy] = useState<GeographicHierarchyResponse | null>(null);

  // Category & Time Filter State
  const [category, setCategory] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Incident Comparison State
  const [incidentMode, setIncidentMode] = useState<boolean>(false);
  const [casesList, setCasesList] = useState<CaseIncidentOption[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [incidentWindow, setIncidentWindow] = useState<number>(3);

  // Data Loading & Map State
  const [hotspotData, setHotspotData] = useState<HotspotsResponse | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterMarker | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load Geographic Hierarchy & Cases on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const [hRes, cRes] = await Promise.all([
          locationService.getHierarchy(),
          locationService.getCasesWithIncidents(100)
        ]);
        setHierarchy(hRes);
        setCasesList(cRes);
      } catch (err: any) {
        console.error('Failed to load geographic hierarchy:', err);
      }
    };
    initData();
  }, []);

  // Fetch Hotspots on filter changes
  useEffect(() => {
    fetchHotspots();
  }, [level, selectedState, selectedDistrict, selectedArea, category, timeRange, dateFrom, dateTo, selectedCaseId, incidentWindow, incidentMode]);

  const fetchHotspots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await locationService.getHotspots({
        level,
        state: selectedState || undefined,
        district: selectedDistrict || undefined,
        area: selectedArea || undefined,
        category,
        timeRange,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        caseId: incidentMode && selectedCaseId ? selectedCaseId : undefined,
        incidentWindow
      });
      setHotspotData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation hotspots');
    } finally {
      setLoading(false);
    }
  };

  // Drill-down handlers
  const handleDrillDownToState = (stateName: string) => {
    setSelectedState(stateName);
    setSelectedDistrict('');
    setSelectedArea('');
    setLevel('state');
    setSelectedCluster(null);
  };

  const handleDrillDownToDistrict = (districtName: string) => {
    setSelectedDistrict(districtName);
    setSelectedArea('');
    setLevel('district');
    setSelectedCluster(null);
  };

  const handleDrillDownToArea = (areaName: string) => {
    setSelectedArea(areaName);
    setLevel('area');
    setSelectedCluster(null);
  };

  const handleResetToNational = () => {
    setSelectedState('');
    setSelectedDistrict('');
    setSelectedArea('');
    setLevel('india');
    setSelectedCluster(null);
  };

  const handleClusterSelect = (cluster: ClusterMarker) => {
    setSelectedCluster(cluster);
    if (cluster.drillDownTarget.level === 'state' && cluster.drillDownTarget.state) {
      handleDrillDownToState(cluster.drillDownTarget.state);
    } else if (cluster.drillDownTarget.level === 'district' && cluster.drillDownTarget.district) {
      handleDrillDownToDistrict(cluster.drillDownTarget.district);
    } else if (cluster.drillDownTarget.level === 'area' && cluster.drillDownTarget.area) {
      handleDrillDownToArea(cluster.drillDownTarget.area);
    }
  };

  // Active Case selection for Incident Date Comparison
  const currentCase = casesList.find(c => c.id === selectedCaseId);

  const categories = [
    { id: 'ALL', label: 'Overall Activity', icon: Globe },
    { id: 'COMMUNICATION', label: 'Communication Activity', icon: PhoneCall },
    { id: 'FINANCIAL', label: 'Financial Activity', icon: Coins },
    { id: 'VEHICLE', label: 'Vehicle Activity', icon: Car },
    { id: 'CASE', label: 'Case/FIR Activity', icon: FolderKanban },
    { id: 'LOCATION', label: 'Location/Event Activity', icon: MapPin },
  ];

  const timePresets = [
    { id: 'all', label: 'All Available Data' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: '6m', label: 'Last 6 Months' },
    { id: 'custom', label: 'Custom Range' },
  ];

  // Selected state's districts from hierarchy
  const availableDistricts = hierarchy?.states.find(s => s.name === selectedState)?.districts || [];
  const availableAreas = selectedDistrict && hierarchy?.areasByDistrict[selectedDistrict] ? hierarchy.areasByDistrict[selectedDistrict] : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 mb-1">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>GEO-SPATIAL INTELLIGENCE & TELEMETRY</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Investigation Hotspot & Location Analysis
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Hierarchical geographic drill-down, multi-source telemetry concentration, and incident timeline correlation.
          </p>
        </div>

        {/* Global Action Refresh */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHotspots}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Sync Hotspots</span>
          </button>
        </div>
      </div>

      {/* 1. Hierarchical Geographic Breadcrumb & Selection Bar */}
      <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          <button
            onClick={handleResetToNational}
            className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
              level === 'india'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>India (National)</span>
          </button>

          {selectedState && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => handleDrillDownToState(selectedState)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  level === 'state'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {selectedState}
              </button>
            </>
          )}

          {selectedDistrict && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={() => handleDrillDownToDistrict(selectedDistrict)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  level === 'district'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {selectedDistrict}
              </button>
            </>
          )}

          {selectedArea && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold font-mono">
                {selectedArea}
              </span>
            </>
          )}
        </div>

        {/* Dropdown Hierarchy Selectors */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* State Selector */}
          <select
            value={selectedState}
            onChange={(e) => {
              if (!e.target.value) handleResetToNational();
              else handleDrillDownToState(e.target.value);
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 font-mono shadow-sm"
          >
            <option value="">Select State / UT...</option>
            {hierarchy?.states.map((st) => (
              <option key={st.name} value={st.name}>
                {st.name} ({st.districtCount} Districts)
              </option>
            ))}
          </select>

          {/* District Selector */}
          <select
            value={selectedDistrict}
            disabled={!selectedState}
            onChange={(e) => {
              if (e.target.value) {
                handleDrillDownToDistrict(e.target.value);
              } else if (selectedState) {
                handleDrillDownToState(selectedState);
              }
            }}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 font-mono disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <option value="">
              {!selectedState ? 'Select State first...' : `Select District (${availableDistricts.length} available)...`}
            </option>
            {availableDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Area Selector */}
          {availableAreas.length > 0 && (
            <select
              value={selectedArea}
              onChange={(e) => {
                if (e.target.value) {
                  handleDrillDownToArea(e.target.value);
                } else if (selectedDistrict) {
                  handleDrillDownToDistrict(selectedDistrict);
                }
              }}
              className="bg-slate-950 border border-slate-800 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-500 font-mono shadow-sm"
            >
              <option value="">Select Local Sector / Area ({availableAreas.length})...</option>
              {availableAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}

          {level !== 'india' && (
            <button
              onClick={handleResetToNational}
              className="text-xs font-mono text-slate-400 hover:text-sky-400 underline underline-offset-4 ml-1"
            >
              Reset to India
            </button>
          )}
        </div>
      </div>

      {/* 2. Category Tabs & Time Filtering */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Category Tabs */}
        <div className="lg:col-span-8 flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Time Filters */}
        <div className="lg:col-span-4 flex items-center justify-end gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-900/80 border border-slate-800 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono shadow-sm"
          >
            {timePresets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          {timeRange === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[11px] text-white rounded-lg p-1.5 font-mono focus:outline-none focus:border-sky-500"
              />
              <span className="text-slate-600">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[11px] text-white rounded-lg p-1.5 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* 6. Incident-Date Comparison Drawer / Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Incident-Date Correlation Analysis
                </span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                  Temporal Window
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Isolate historical telemetry within a tight configurable window (±1, ±3, ±7 days) around a case's verified incident date.
              </p>
            </div>
          </div>

          {/* Toggle Incident Mode */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
              <input
                type="checkbox"
                checked={incidentMode}
                onChange={(e) => setIncidentMode(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 focus:ring-offset-0 w-4 h-4"
              />
              <span>Enable Incident Window</span>
            </label>
          </div>
        </div>

        {/* Expanded Incident Mode Controls */}
        {incidentMode && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Case Selector */}
            <div className="md:col-span-5">
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Select FIR Docket / Case
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              >
                <option value="">Choose an active investigation case...</option>
                {casesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.incidentDate ? `(Incident: ${c.incidentDate})` : '(No Incident Date)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Window Selector */}
            <div className="md:col-span-3">
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Comparison Window
              </label>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[1, 3, 7].map((w) => (
                  <button
                    key={w}
                    onClick={() => setIncidentWindow(w)}
                    className={`flex-1 py-1 text-xs font-mono rounded-lg transition-colors ${
                      incidentWindow === w
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ±{w} Day{w > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Date Feedback Banner */}
            <div className="md:col-span-4">
              {selectedCaseId ? (
                currentCase?.hasIncidentDate ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Incident Date: {currentCase.incidentDate}</span>
                      <div className="text-[11px] text-emerald-400/80 mt-0.5">
                        Evaluating activity ±{incidentWindow} days around incident.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">No incident date is available for this case.</span>
                      <div className="text-[11px] text-amber-400/80 mt-0.5">
                        Showing full available telemetry records.
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-xs text-slate-500 italic">
                  Select a case above to isolate the pre/post incident window.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 8. Interactive Map Visualization */}
      <div className="space-y-2">
        {loading && (
          <div className="text-xs font-mono text-sky-400 flex items-center gap-2 animate-pulse mb-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Computing geographic clusters & hotspot surfaces from live database...</span>
          </div>
        )}

        {error ? (
          <div className="p-12 text-center bg-slate-900/30 border border-rose-900/40 rounded-2xl text-xs font-mono text-rose-400 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
            <div>Failed to load hotspot data from backend: {error}</div>
            <button
              onClick={fetchHotspots}
              className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl border border-rose-500/30 font-bold"
            >
              Retry Query
            </button>
          </div>
        ) : (
          <LocationMapView
            center={hotspotData?.center || [22.5937, 78.9629]}
            zoom={hotspotData?.zoom || 5}
            hotspots={hotspotData?.hotspots || []}
            clusters={hotspotData?.clusters || []}
            onSelectCluster={handleClusterSelect}
            selectedCluster={selectedCluster}
            onClearSelection={() => setSelectedCluster(null)}
            onResetView={handleResetToNational}
          />
        )}
      </div>

      {/* 10. Data Quality Indicators Panel */}
      {hotspotData?.dataQuality && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                DATA QUALITY & PROVENANCE METRICS
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparency indicators for the currently active geographic view and category filter.
              </p>
            </div>
            <div className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-800 text-slate-300">
              Scope: {hotspotData.dataQuality.scope.state} • {hotspotData.dataQuality.scope.district}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Metric 1: Coverage Bar */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Data Coverage</span>
                <span className="text-white font-bold font-mono">
                  {hotspotData.dataQuality.coveragePercent}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${hotspotData.dataQuality.coveragePercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {hotspotData.dataQuality.recordsWithLocation.toLocaleString()} records with valid spatial coordinates
              </div>
            </div>

            {/* Metric 2: Records Analyzed */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Records Analyzed</span>
              <div className="text-xl font-bold font-mono text-white">
                {hotspotData.dataQuality.recordsAnalyzed.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Across category: {hotspotData.dataQuality.scope.category}
              </div>
            </div>

            {/* Metric 3: Missing Location Records */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Missing Location Info</span>
              <div className="text-xl font-bold font-mono text-amber-400">
                {hotspotData.dataQuality.missingLocationPct}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {hotspotData.dataQuality.recordsMissingLocation} records without geo-anchors
              </div>
            </div>

            {/* Metric 4: Intelligence Streams Represented */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-400">Sources Represented</span>
              <div className="text-xl font-bold font-mono text-sky-400">
                {hotspotData.dataQuality.sourceCount} Sources
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Completeness: {hotspotData.dataQuality.dataCompleteness}%
              </div>
            </div>
          </div>

          {/* Sources breakdown pills */}
          {hotspotData.dataQuality.sourcesList.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Contributing Feeds & Telemetry Sources:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {hotspotData.dataQuality.sourcesList.map((src, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Attribution Notice */}
          <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
              <span>{hotspotData.dataQuality.attribution}</span>
            </span>
            <span className="text-[10px] text-slate-500 italic hidden md:inline">
              Historical analytical correlation — not predictive forecasting.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
