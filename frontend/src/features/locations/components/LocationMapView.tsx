import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Flame, MapPin, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { HotspotPoint, ClusterMarker } from '../../../services/locations';

interface Props {
  center: [number, number];
  zoom: number;
  hotspots: HotspotPoint[];
  clusters: ClusterMarker[];
  onSelectCluster: (cluster: ClusterMarker) => void;
  selectedCluster: ClusterMarker | null;
  onClearSelection: () => void;
  onResetView: () => void;
}

export const LocationMapView: React.FC<Props> = ({
  center,
  zoom,
  hotspots,
  clusters,
  onSelectCluster,
  selectedCluster,
  onClearSelection,
  onResetView
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const clusterLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [viewMode, setViewMode] = useState<'both' | 'clusters' | 'heatmap'>('both');

  // Strict India Geographic Confinement Bounds
  const INDIA_BOUNDS: L.LatLngBoundsLiteral = [
    [6.5, 68.0],   // Southwest corner (Southern tip / Arabian Sea)
    [37.5, 97.5]   // Northeast corner (Kashmir / Arunachal Pradesh)
  ];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5937, 78.9629],
      zoom: 5,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: INDIA_BOUNDS,
      maxBoundsViscosity: 1.0, // Hard stop: cannot pan outside India
      zoomControl: false,
      attributionControl: false
    });

    // Clean Dark Gray Canvas tile layer (Enterprise GIS, 100% free, NO API KEY REQUIRED watermark)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
      bounds: INDIA_BOUNDS,
    }).addTo(map);

    // Layer groups
    const heatGroup = L.layerGroup().addTo(map);
    const clusterGroup = L.layerGroup().addTo(map);

    heatLayerGroupRef.current = heatGroup;
    clusterLayerGroupRef.current = clusterGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Center & Zoom dynamically on drill-down
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo(center, zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    }
  }, [center[0], center[1], zoom]);

  // Render Heatmap & Cluster Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const heatGroup = heatLayerGroupRef.current;
    const clusterGroup = clusterLayerGroupRef.current;
    if (!map || !heatGroup || !clusterGroup) return;

    heatGroup.clearLayers();
    clusterGroup.clearLayers();

    // 1. Render Heatmap circles with density gradients
    if (viewMode === 'heatmap' || viewMode === 'both') {
      hotspots.forEach((pt) => {
        const intensity = Math.max(0.1, Math.min(1.0, pt.intensity));
        const radius = Math.max(16, Math.min(48, Math.round(intensity * 40) + 12));

        // Color ramp: low = cyan/emerald, mid = amber, high = rose/crimson
        let fillColor = '#06b6d4'; // cyan-500
        let fillOpacity = 0.35;
        if (intensity > 0.6) {
          fillColor = '#f43f5e'; // rose-500
          fillOpacity = 0.55;
        } else if (intensity > 0.3) {
          fillColor = '#f59e0b'; // amber-500
          fillOpacity = 0.45;
        }

        // Outer glow halo
        const outerCircle = L.circleMarker([pt.latitude, pt.longitude], {
          radius: radius * 1.5,
          color: 'transparent',
          fillColor: fillColor,
          fillOpacity: fillOpacity * 0.4,
          interactive: false
        });

        // Core intensity spot
        const coreCircle = L.circleMarker([pt.latitude, pt.longitude], {
          radius: radius,
          color: fillColor,
          weight: 1,
          opacity: 0.6,
          fillColor: fillColor,
          fillOpacity: fillOpacity,
          interactive: false
        });

        outerCircle.addTo(heatGroup);
        coreCircle.addTo(heatGroup);
      });
    }

    // 2. Render Cluster Markers with Activity Count Badges
    if (viewMode === 'clusters' || viewMode === 'both') {
      clusters.forEach((cl) => {
        const isSelected = selectedCluster?.id === cl.id;
        const count = cl.activityCount;

        // Visual tier
        let badgeColor = 'border-sky-500/50 text-sky-300 bg-slate-900/90 shadow-sky-500/20';
        let dotColor = 'bg-sky-400';
        let pulseClass = '';

        if (count >= 100 || cl.activityScore >= 75) {
          badgeColor = 'border-rose-500 text-rose-300 bg-slate-950/95 shadow-rose-500/30';
          dotColor = 'bg-rose-500';
          pulseClass = 'animate-ping';
        } else if (count >= 40 || cl.activityScore >= 50) {
          badgeColor = 'border-amber-500/70 text-amber-300 bg-slate-950/90 shadow-amber-500/20';
          dotColor = 'bg-amber-400';
        }

        const iconHtml = `
          <div class="relative group cursor-pointer transform transition-all duration-200 hover:scale-110">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${badgeColor} shadow-lg backdrop-blur-md ${isSelected ? 'ring-2 ring-sky-400 scale-110' : ''}">
              <span class="relative flex h-2 w-2">
                <span class="${pulseClass} absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 ${dotColor}"></span>
              </span>
              <span class="font-mono text-xs font-bold tracking-tight">${count}</span>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-slate-800 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
              ${cl.title}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-cluster-marker',
          iconSize: [60, 30],
          iconAnchor: [30, 15]
        });

        const marker = L.marker([cl.latitude, cl.longitude], { icon: customIcon });
        marker.on('click', () => {
          onSelectCluster(cl);
        });

        marker.addTo(clusterGroup);
      });
    }
  }, [hotspots, clusters, viewMode, selectedCluster?.id]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Controls Top-Left */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 shadow-xl">
          <button
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'both' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Combined</span>
          </button>
          <button
            onClick={() => setViewMode('clusters')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'clusters' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cluster Markers</span>
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              viewMode === 'heatmap' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap</span>
          </button>
        </div>
      </div>

      {/* Scope Watermark Badge Top-Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 shadow-xl pointer-events-none select-none">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold text-white">Jurisdiction: Republic of India</span>
        <span className="text-slate-600">|</span>
        <span className="text-sky-400">National Grid Active</span>
      </div>

      {/* Floating Zoom & Reset Top-Right */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 flex items-center gap-1 shadow-xl">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={onResetView}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset to National View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Map Legend Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-xl max-w-xs text-xs space-y-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-sky-400" />
          <span>Investigation Activity Intensity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500" />
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>Baseline</span>
          <span>Moderate Surge</span>
          <span>High Concentration</span>
        </div>
        <div className="text-[9px] text-slate-500 italic pt-1 border-t border-slate-800/60">
          Click any cluster marker to zoom into localized area records.
        </div>
      </div>

      {/* Selected Cluster Drawer Bottom-Right */}
      {selectedCluster && (
        <div className="absolute bottom-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                {selectedCluster.level.toUpperCase()} LEVEL HOTSPOT
              </span>
              <h4 className="text-sm font-bold text-white mt-0.5">{selectedCluster.title}</h4>
              <p className="text-xs text-slate-400">{selectedCluster.subtitle}</p>
            </div>
            <button
              onClick={onClearSelection}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Activity Score</span>
              <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                {selectedCluster.activityScore} / 100
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Flagged Records</span>
              <div className="text-base font-bold font-mono text-rose-400 mt-0.5 flex items-center gap-1">
                {selectedCluster.flaggedCount > 0 && <AlertTriangle className="w-3.5 h-3.5" />}
                {selectedCluster.flaggedCount}
              </div>
            </div>
          </div>

          {selectedCluster.recentEvents && selectedCluster.recentEvents.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Recent Area Traces ({selectedCluster.recentEvents.length})
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {selectedCluster.recentEvents.map((ev, idx) => (
                  <div key={idx} className="p-1.5 rounded-lg bg-slate-950/50 border border-slate-800 text-[11px] flex items-center justify-between">
                    <div>
                      <div className="text-slate-200 font-medium">{ev.type}</div>
                      <div className="text-[10px] text-slate-400">{ev.source}</div>
                    </div>
                    {ev.flagged && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold">
                        FLAGGED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => onSelectCluster(selectedCluster)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 transition-colors"
          >
            <span>Drill Down into {selectedCluster.title}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
