import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  visualizationsService, 
  NetworkExplorerNode, 
  NetworkExplorerEdge, 
  NetworkExplorerData,
  NetworkCommunity,
  NetworkLinkAnalysisItem,
  NetworkTimelineItem
} from '../../services/visualizations';
import { 
  Network, 
  Search, 
  Layers, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  RefreshCw, 
  RotateCcw,
  Database, 
  Phone, 
  Car, 
  MapPin, 
  FileText, 
  Route, 
  Users, 
  GitFork, 
  Activity, 
  Sparkles, 
  Radio, 
  FolderLock,
  ArrowRight,
  Shield,
  Clock,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Sliders,
  Filter,
  Share2,
  Calendar,
  Building,
  CreditCard,
  Hash,
  FileCheck,
  ChevronRight,
  Cpu,
  Info
} from 'lucide-react';

interface SimulationNode extends NetworkExplorerNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fixed?: boolean;
}

export const NetworkGraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active Analysis View Mode
  const [activeMode, setActiveMode] = useState<
    'EXPLORER' | 'SHORTEST_PATH' | 'COMMUNITIES' | 'CENTRALITY' | 'TIMELINE' | 'LINK_ANALYSIS' | 'AI_INSIGHTS'
  >('EXPLORER');

  // Network Data State
  const [graphData, setGraphData] = useState<NetworkExplorerData | null>(null);
  const [simNodes, setSimNodes] = useState<SimulationNode[]>([]);
  const [allEdges, setAllEdges] = useState<NetworkExplorerEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection & Inspector State (null by default so connections only show on user click)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkExplorerEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<NetworkExplorerEdge | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);

  // Focus Subgraph Mode
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusHops, setFocusHops] = useState<number>(2);

  // Pathfinding State
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [pathResultSteps, setPathResultSteps] = useState<Array<{ from: string; to: string; type: string; detail?: string; date?: string }>>([]);
  const [pathSearched, setPathSearched] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('All Categories');
  const [crimeTypeFilter, setCrimeTypeFilter] = useState('All Crime Types');
  const [districtFilter, setDistrictFilter] = useState('All Districts');
  const [policeStationFilter, setPoliceStationFilter] = useState('All Police Stations');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minRisk, setMinRisk] = useState(0);

  // View Controls
  const [showLegend, setShowLegend] = useState(true);
  const [showAllLabels, setShowAllLabels] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 950, height: 700 });
  const [sqlFallbackActive, setSqlFallbackActive] = useState(false);

  // Responsive Canvas Sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setCanvasDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      observer.disconnect();
    };
  }, []);

  // Premium, High-Contrast 3D Glass Sphere Palette (Vibrant, Clear, Modern)
  const getNodeColorTheme = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'FIR':
      case 'CASE':
        return {
          highlight: '#ff99b0',
          primary: '#ff1744',   // Vivid Ruby Crimson
          deep: '#520014',
          glow: '#ff2a5f',
          border: '#ff99b0',
          name: 'FIR DOCKET'
        };
      case 'PERSON':
      case 'SUSPECT':
        return {
          highlight: '#a0e4ff',
          primary: '#0099ff',   // Electric Neon Cyan / Blue
          deep: '#002b5c',
          glow: '#00f0ff',
          border: '#a0e4ff',
          name: 'SUSPECT'
        };
      case 'PHONE':
        return {
          highlight: '#c2dbff',
          primary: '#2979ff',   // Royal Sapphire Blue
          deep: '#001f5c',
          glow: '#3d84ff',
          border: '#c2dbff',
          name: 'PHONE (CDR)'
        };
      case 'VICTIM':
      case 'WITNESS':
        return {
          highlight: '#b3ffdb',
          primary: '#00e676',   // Bright Luminous Emerald
          deep: '#003818',
          glow: '#00ff88',
          border: '#b3ffdb',
          name: 'VICTIM'
        };
      case 'LOCATION':
        return {
          highlight: '#ffe0b2',
          primary: '#ff9100',   // Vivid Solar Gold / Amber
          deep: '#5c3100',
          glow: '#ffab00',
          border: '#ffe0b2',
          name: 'LOCATION'
        };
      case 'VEHICLE':
        return {
          highlight: '#f5c2ff',
          primary: '#d500f9',   // Radiant Electric Purple
          deep: '#42004f',
          glow: '#e040fb',
          border: '#f5c2ff',
          name: 'VEHICLE'
        };
      case 'FINANCIAL':
        return {
          highlight: '#ccff90',
          primary: '#76ff03',   // Neon Lime / Jade
          deep: '#1b5e20',
          glow: '#76ff03',
          border: '#ccff90',
          name: 'FINANCIAL'
        };
      case 'OFFICER':
        return {
          highlight: '#d4f9de',
          primary: '#00c853',   // Crisp Police Green
          deep: '#003d14',
          glow: '#00e676',
          border: '#d4f9de',
          name: 'OFFICER'
        };
      default:
        return {
          highlight: '#e2e8f0',
          primary: '#64748b',
          deep: '#0f172a',
          glow: '#94a3b8',
          border: '#cbd5e1',
          name: 'ENTITY'
        };
    }
  };

  // Run Balanced Force-Directed Relaxation Simulation
  const runForceSimulation = (nodes: NetworkExplorerNode[], edges: NetworkExplorerEdge[], width: number, height: number): SimulationNode[] => {
    const N = nodes.length;
    if (N === 0) return [];

    const cx = width / 2;
    const cy = height / 2;

    // Calculate node degrees
    const degreeMap: Record<string, number> = {};
    edges.forEach((e) => {
      degreeMap[e.source] = (degreeMap[e.source] || 0) + 1;
      degreeMap[e.target] = (degreeMap[e.target] || 0) + 1;
    });

    // 1. Initial Position & Clean Proportional Radii
    const simNodesList: SimulationNode[] = nodes.map((n, idx) => {
      const deg = degreeMap[n.id] || n.degree || 1;
      const isHub = n.type === 'FIR' || n.type === 'CASE' || deg >= 4;
      const isMedium = deg >= 2 || n.type === 'PERSON' || n.type === 'LOCATION';
      
      let radius = 15;
      if (isHub) {
        radius = Math.min(26 + deg * 1.8, 34); // Key Hubs: 26px - 34px
      } else if (isMedium) {
        radius = Math.min(18 + deg * 1.4, 24); // Medium: 18px - 24px
      } else {
        radius = 13 + (idx % 2) * 2; // Satellites: 13px - 15px
      }

      const phi = idx * 2.399963;
      const initialDist = 100 + Math.sqrt(idx) * 48;

      return {
        ...n,
        x: cx + Math.cos(phi) * initialDist,
        y: cy + Math.sin(phi) * initialDist,
        vx: 0,
        vy: 0,
        radius: radius,
        degree: deg
      };
    });

    const nodeIndexMap: Record<string, number> = {};
    simNodesList.forEach((n, idx) => {
      nodeIndexMap[n.id] = idx;
    });

    // 2. Physics Force Relaxation with Balanced Spacing
    const iterations = Math.min(130, Math.max(70, N));
    const k_rep = 20000;
    const k_spring = 0.04;
    const target_edge_len = 135;

    for (let iter = 0; iter < iterations; iter++) {
      const alpha = 1 - iter / iterations;

      // A. Node-Node Repulsion
      for (let i = 0; i < N; i++) {
        const u = simNodesList[i];
        for (let j = i + 1; j < N; j++) {
          const v = simNodesList[j];
          let dx = v.x - u.x;
          let dy = v.y - u.y;
          let distSq = dx * dx + dy * dy;
          if (distSq === 0) {
            dx = (Math.random() - 0.5) * 3;
            dy = (Math.random() - 0.5) * 3;
            distSq = dx * dx + dy * dy;
          }
          const dist = Math.sqrt(distSq);
          const minAllowed = u.radius + v.radius + 24;

          let force = (k_rep / (distSq + 250)) * alpha;
          if (dist < minAllowed) {
            force += ((minAllowed - dist) / minAllowed) * 4.5 * alpha;
          }

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          u.vx -= fx;
          u.vy -= fy;
          v.vx += fx;
          v.vy += fy;
        }
      }

      // B. Edge Spring Attraction Force
      for (let e = 0; e < edges.length; e++) {
        const edge = edges[e];
        const uIdx = nodeIndexMap[edge.source];
        const vIdx = nodeIndexMap[edge.target];
        if (uIdx === undefined || vIdx === undefined) continue;

        const u = simNodesList[uIdx];
        const v = simNodesList[vIdx];

        let dx = v.x - u.x;
        let dy = v.y - u.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const idealDist = target_edge_len + u.radius + v.radius;
        const displacement = dist - idealDist;
        const force = displacement * k_spring * alpha;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        u.vx += fx;
        u.vy += fy;
        v.vx -= fx;
        v.vy -= fy;
      }

      // C. Centering Pull & Velocity Integration
      for (let i = 0; i < N; i++) {
        const node = simNodesList[i];
        if (node.fixed) continue;

        const centerForceX = (cx - node.x) * 0.010 * alpha;
        const centerForceY = (cy - node.y) * 0.010 * alpha;

        node.vx = (node.vx + centerForceX) * 0.72;
        node.vy = (node.vy + centerForceY) * 0.72;

        node.x += node.vx;
        node.y += node.vy;
      }
    }

    return simNodesList;
  };

  // Fit Graph Viewport Calculation
  const fitGraphToView = (nodes: SimulationNode[], width: number, height: number) => {
    if (nodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      minX = Math.min(minX, n.x - n.radius);
      maxX = Math.max(maxX, n.x + n.radius);
      minY = Math.min(minY, n.y - n.radius);
      maxY = Math.max(maxY, n.y + n.radius);
    });

    const graphW = maxX - minX || 1;
    const graphH = maxY - minY || 1;
    const pad = 70;

    const scaleX = (width - pad * 2) / graphW;
    const scaleY = (height - pad * 2) / graphH;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.5);

    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const newPanX = (width / 2 - graphCenterX) * newZoom;
    const newPanY = (height / 2 - graphCenterY) * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Fetch Graph Data from Database
  const fetchGraph = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await visualizationsService.getNetworkExplorer({
        search: searchQuery || undefined,
        crime_type: crimeTypeFilter !== 'All Crime Types' ? crimeTypeFilter : undefined,
        district: districtFilter !== 'All Districts' ? districtFilter : undefined,
        police_station: policeStationFilter !== 'All Police Stations' ? policeStationFilter : undefined,
        entity_type: entityTypeFilter !== 'All Categories' ? entityTypeFilter : undefined,
        min_risk: minRisk > 0 ? minRisk : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        focus_id: focusNodeId || undefined,
        hops: focusHops,
        limit: 220
      });

      setGraphData(res);

      // Run Force-Directed Simulation
      const simulated = runForceSimulation(
        res.nodes,
        res.edges,
        canvasDimensions.width,
        canvasDimensions.height
      );

      setSimNodes(simulated);
      setAllEdges(res.edges);

      // Auto-fit camera
      fitGraphToView(simulated, canvasDimensions.width, canvasDimensions.height);
    } catch (err: any) {
      console.error('Network graph fetch error:', err);
      setError('Unable to load network graph records from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [entityTypeFilter, crimeTypeFilter, districtFilter, policeStationFilter, minRisk, focusNodeId, focusHops]);

  // Active Selected Node Object
  const selectedNode = useMemo(() => {
    return simNodes.find((n) => n.id === selectedNodeId) || null;
  }, [simNodes, selectedNodeId]);

  // Connected Neighbors for Selected Node
  const directConnectedNeighbors = useMemo(() => {
    if (!selectedNodeId) return [];
    const neighbors: Array<{ node: SimulationNode; edge: NetworkExplorerEdge }> = [];
    allEdges.forEach((e) => {
      if (e.source === selectedNodeId) {
        const tgt = simNodes.find((n) => n.id === e.target);
        if (tgt) neighbors.push({ node: tgt, edge: e });
      } else if (e.target === selectedNodeId) {
        const src = simNodes.find((n) => n.id === e.source);
        if (src) neighbors.push({ node: src, edge: e });
      }
    });
    return neighbors;
  }, [selectedNodeId, allEdges, simNodes]);

  // Canvas Drawing Loop (Clean, Vibrant 3D Orbs, High-Contrast Pill Badges for Labels)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Transform Coordinates with Pan & Zoom
      ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const nodeMap = new Map<string, SimulationNode>();
      simNodes.forEach((n) => nodeMap.set(n.id, n));

      const isNodeSelected = !!selectedNodeId;
      const isPathActive = highlightedPath.length > 0;

      // 1. Draw Edges: Subtle by default, illuminated ONLY when clicked/selected
      allEdges.forEach((e) => {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        if (!src || !tgt) return;

        const isPathEdge = isPathActive && highlightedPath.includes(e.source) && highlightedPath.includes(e.target);
        const isSelectedEdge = selectedEdge?.id === e.id || 
          (isNodeSelected && (selectedNodeId === e.source || selectedNodeId === e.target));
        const isHoveredEdge = hoveredEdge?.id === e.id;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);

        if (isPathEdge) {
          // Shortest Path Glowing Beam
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
          ctx.lineWidth = 10;
          ctx.stroke();

          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 14;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (isSelectedEdge || isHoveredEdge) {
          // Clicked Node Connection Illuminated Beam
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.30)';
          ctx.lineWidth = 9;
          ctx.stroke();

          ctx.strokeStyle = '#00e5ff';
          ctx.lineWidth = 2.8;
          ctx.shadowColor = '#00e5ff';
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (isNodeSelected || isPathActive) {
          // Fade unrelated edges when something is selected
          ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else {
          // Default: Clean, subtle relationship line
          ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      });

      // 2. Draw 3D Glowing Glass Spheres (Nodes)
      simNodes.forEach((n) => {
        const isSelected = selectedNodeId === n.id;
        const isHovered = hoveredNode?.id === n.id;
        const isPathNode = isPathActive && highlightedPath.includes(n.id);
        const isNeighborOfSelected = isNodeSelected && directConnectedNeighbors.some((nb) => nb.node.id === n.id);
        const isDimmed = isNodeSelected && !isSelected && !isNeighborOfSelected && !isPathNode;

        const theme = getNodeColorTheme(n.type);
        const r = isSelected ? n.radius + 5 : isHovered ? n.radius + 3 : n.radius;

        // Ambient Outer Halo Glow
        if (isSelected || isPathNode || isNeighborOfSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2);
          ctx.fillStyle = `${theme.glow}35`;
          ctx.fill();
        }

        // 3D Glass Sphere Body with Specular Highlight
        const sphereGrad = ctx.createRadialGradient(
          n.x - r * 0.35,
          n.y - r * 0.35,
          r * 0.06,
          n.x - r * 0.1,
          n.y - r * 0.1,
          r
        );

        if (isDimmed) {
          sphereGrad.addColorStop(0, `${theme.highlight}45`);
          sphereGrad.addColorStop(0.45, `${theme.primary}55`);
          sphereGrad.addColorStop(1, `${theme.deep}75`);
        } else {
          sphereGrad.addColorStop(0, '#ffffff'); // Crisp white specular gloss at top-left
          sphereGrad.addColorStop(0.18, theme.highlight);
          sphereGrad.addColorStop(0.55, theme.primary);
          sphereGrad.addColorStop(1, theme.deep);
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = sphereGrad;
        ctx.fill();

        // Glowing Spherical Ring / Border
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (isSelected || isPathNode) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.2;
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (isHovered || isNeighborOfSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = 12;
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = isDimmed ? `${theme.border}40` : `${theme.border}95`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }

        // 3. High-Contrast, Crystal-Clear Frosted Pill Badges for Labels
        const isKeyHub = n.radius >= 26;
        const shouldShowLabel = showAllLabels || isSelected || isHovered || isPathNode || isNeighborOfSelected || (isKeyHub && !isNodeSelected);

        if (shouldShowLabel) {
          const rawLabel = n.label || n.id;
          const displayLabel = rawLabel.length > 22 ? rawLabel.slice(0, 20) + '…' : rawLabel;
          
          ctx.font = isSelected ? 'bold 12px system-ui, -apple-system, sans-serif' : '11px system-ui, -apple-system, sans-serif';
          const textMetrics = ctx.measureText(displayLabel);
          const badgeW = textMetrics.width + 16;
          const badgeH = 22;
          const badgeX = n.x - badgeW / 2;
          const badgeY = n.y + r + 7;

          // Draw High-Contrast Dark Frosted Pill Background
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
          ctx.fillStyle = isSelected 
            ? 'rgba(10, 25, 47, 0.95)' 
            : isDimmed 
            ? 'rgba(15, 23, 42, 0.70)' 
            : 'rgba(8, 14, 28, 0.88)';
          ctx.fill();

          ctx.strokeStyle = isSelected 
            ? '#00f0ff' 
            : isNeighborOfSelected || isHovered 
            ? theme.glow 
            : 'rgba(51, 65, 85, 0.8)';
          ctx.lineWidth = isSelected ? 1.5 : 1;
          ctx.stroke();

          // Draw Sharp, Centered Text
          ctx.fillStyle = isSelected ? '#ffffff' : isDimmed ? '#94a3b8' : '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(displayLabel, n.x, badgeY + badgeH / 2 + 0.5);
          
          // Reset text alignment for canvas
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
        }
      });

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [simNodes, allEdges, selectedNodeId, selectedEdge, hoveredNode, hoveredEdge, zoom, pan, highlightedPath, canvasDimensions, showAllLabels, directConnectedNeighbors]);

  // Point to Line Distance Calculation for Edge Clicks
  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
  };

  // Mouse Handlers: Drag Node, Pan Canvas, Hover, Click
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
    const mouseY = (e.clientY - rect.top - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

    const foundNode = simNodes.find((n) => {
      const dist = Math.sqrt((n.x - mouseX) ** 2 + (n.y - mouseY) ** 2);
      return dist <= n.radius + 6;
    });

    if (foundNode) {
      setDraggedNode(foundNode);
      foundNode.fixed = true;
      setSelectedNodeId(foundNode.id);
      setSelectedEdge(null);
    } else {
      setIsDraggingCanvas(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - (canvas.width / 2 + pan.x)) / zoom + canvas.width / 2;
    const mouseY = (e.clientY - rect.top - (canvas.height / 2 + pan.y)) / zoom + canvas.height / 2;

    if (draggedNode) {
      draggedNode.x = mouseX;
      draggedNode.y = mouseY;
      setSimNodes([...simNodes]);
      return;
    }

    if (isDraggingCanvas) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    // Node Hover Check
    const foundNode = simNodes.find((n) => {
      const dist = Math.sqrt((n.x - mouseX) ** 2 + (n.y - mouseY) ** 2);
      return dist <= n.radius + 6;
    });

    setHoveredNode(foundNode || null);

    // Edge Hover Check (if not hovering a node)
    if (!foundNode) {
      const nodeMap = new Map<string, SimulationNode>();
      simNodes.forEach((n) => nodeMap.set(n.id, n));

      const foundEdge = allEdges.find((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return false;
        const dist = pointToLineDistance(mouseX, mouseY, src.x, src.y, tgt.x, tgt.y);
        return dist <= 7;
      });
      setHoveredEdge(foundEdge || null);
    } else {
      setHoveredEdge(null);
    }
  };

  const handleMouseUp = () => {
    if (draggedNode) {
      draggedNode.fixed = false;
      setDraggedNode(null);
    }
    setIsDraggingCanvas(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      setSelectedNodeId(hoveredNode.id);
      setSelectedEdge(null);
    } else if (hoveredEdge) {
      setSelectedEdge(hoveredEdge);
    } else {
      // Clicked on empty canvas: deselect to restore clean view
      setSelectedNodeId(null);
      setSelectedEdge(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setZoom((z) => Math.min(Math.max(z * zoomFactor, 0.35), 3.5));
  };

  // BFS Shortest Path Execution
  const runShortestPath = (srcId: string, tgtId: string) => {
    if (!srcId || !tgtId || srcId === tgtId) return;
    setPathSearched(true);

    const adj: Record<string, Array<{ target: string; edge: NetworkExplorerEdge }>> = {};
    allEdges.forEach((e) => {
      if (!adj[e.source]) adj[e.source] = [];
      if (!adj[e.target]) adj[e.target] = [];
      adj[e.source].push({ target: e.target, edge: e });
      adj[e.target].push({ target: e.source, edge: e });
    });

    const queue: Array<{ path: string[]; edges: NetworkExplorerEdge[] }> = [{ path: [srcId], edges: [] }];
    const visited = new Set<string>([srcId]);
    let foundPath: string[] = [];
    let foundEdges: NetworkExplorerEdge[] = [];

    while (queue.length > 0) {
      const { path, edges } = queue.shift()!;
      const current = path[path.length - 1];

      if (current === tgtId) {
        foundPath = path;
        foundEdges = edges;
        break;
      }

      for (const neighbor of adj[current] || []) {
        if (!visited.has(neighbor.target)) {
          visited.add(neighbor.target);
          queue.push({
            path: [...path, neighbor.target],
            edges: [...edges, neighbor.edge]
          });
        }
      }
    }

    if (foundPath.length > 0) {
      setHighlightedPath(foundPath);
      const steps = foundEdges.map((e, idx) => ({
        from: foundPath[idx],
        to: foundPath[idx + 1],
        type: e.type,
        detail: e.supportingDetail || e.supportingRecord,
        date: e.date
      }));
      setPathResultSteps(steps);

      const pathNodes = simNodes.filter((n) => foundPath.includes(n.id));
      fitGraphToView(pathNodes, canvasDimensions.width, canvasDimensions.height);
    } else {
      setHighlightedPath([]);
      setPathResultSteps([]);
    }
  };

  // Export Network Matrix
  const handleExportMatrix = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      source: 'Criminal Intelligence Platform Database',
      totalNodes: simNodes.length,
      totalEdges: allEdges.length,
      nodes: simNodes.map((n) => ({ id: n.id, label: n.label, type: n.type, degree: n.degree, community: n.community })),
      edges: allEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, type: e.type, record: e.supportingRecord }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network_matrix_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 font-sans text-slate-100 pb-8 flex flex-col min-h-[calc(100vh-6rem)] select-none">
      {/* 1. Header Banner */}
      <div className="bg-slate-900/70 border border-slate-800/90 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-white tracking-wide">Criminal Network Analysis & Link Explorer</h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/40 text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Live Database Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              3D Glass Sphere Topography • Brandes Centrality • High-Legibility Investigative Badges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="px-3 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300">
            <span className="text-cyan-400 font-bold">{simNodes.length}</span> Nodes • <span className="text-purple-400 font-bold">{allEdges.length}</span> Edges
          </div>

          <button
            onClick={() => setSqlFallbackActive(!sqlFallbackActive)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all ${
              sqlFallbackActive ? 'bg-amber-950/70 text-amber-300 border-amber-500/40' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {sqlFallbackActive ? 'SQL Direct Active' : 'SQL Graph Fallback'}
          </button>

          <button
            onClick={handleExportMatrix}
            className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-600/40 text-cyan-400 rounded-lg transition-colors text-[11px] font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export Matrix
          </button>
        </div>
      </div>

      {/* 2. Mode Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/60 border border-slate-800/80 p-2 rounded-xl backdrop-blur-md text-xs font-medium">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveMode('EXPLORER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'EXPLORER' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" /> 3D/2D Graph Explorer
          </button>

          <button
            onClick={() => {
              setActiveMode('SHORTEST_PATH');
              setPathSearched(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'SHORTEST_PATH' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Route className="w-3.5 h-3.5" /> Shortest Path
          </button>

          <button
            onClick={() => setActiveMode('COMMUNITIES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'COMMUNITIES' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Network Communities
          </button>

          <button
            onClick={() => setActiveMode('CENTRALITY')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'CENTRALITY' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Key Player Centrality
          </button>

          <button
            onClick={() => setActiveMode('TIMELINE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'TIMELINE' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Timeline View
          </button>

          <button
            onClick={() => setActiveMode('LINK_ANALYSIS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'LINK_ANALYSIS' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" /> Link Analysis
          </button>

          <button
            onClick={() => setActiveMode('AI_INSIGHTS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeMode === 'AI_INSIGHTS' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Explainable Insights
          </button>
        </div>

        <div className="flex items-center gap-2">
          {focusNodeId && (
            <button
              onClick={() => {
                setFocusNodeId(null);
                setHighlightedPath([]);
                fetchGraph();
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-amber-950/60 text-amber-400 border border-amber-600/40 rounded-lg text-xs font-mono font-semibold shadow-sm"
            >
              <RotateCcw className="w-3 h-3" /> Restore Full Network
            </button>
          )}

          <button
            onClick={fetchGraph}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* 3. Entity Category Filter Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto text-xs font-medium scrollbar-none">
        {[
          { id: 'All Categories', label: 'All Categories', count: simNodes.length },
          { id: 'PERSON', label: 'Persons & Suspects', count: simNodes.filter(n => n.type === 'PERSON').length },
          { id: 'PHONE', label: 'Phone Intercepts (CDR)', count: simNodes.filter(n => n.type === 'PHONE').length },
          { id: 'VEHICLE', label: 'Vehicles', count: simNodes.filter(n => n.type === 'VEHICLE').length },
          { id: 'LOCATION', label: 'Locations & Towers', count: simNodes.filter(n => n.type === 'LOCATION').length },
          { id: 'FIR', label: 'FIR Dockets', count: simNodes.filter(n => n.type === 'FIR').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setEntityTypeFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-all text-xs flex items-center gap-1.5 whitespace-nowrap ${
              entityTypeFilter === tab.id
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-slate-800 text-slate-300">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 4. Structured Multi-Parameter Search & Filters */}
      <div className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suspect name, crime type (e.g. Fraud, Theft), FIR docket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGraph()}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Crime Type Filter */}
        <div>
          <select
            value={crimeTypeFilter}
            onChange={(e) => setCrimeTypeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option>All Crime Types</option>
            {graphData?.filterOptions?.crimeTypes.map((c, i) => (
              <option key={i} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* District Filter */}
        <div>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
          >
            <option>All Districts</option>
            {graphData?.filterOptions?.districts.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* Min Risk Slider */}
        <div className="flex items-center gap-2 px-2 bg-slate-950 border border-slate-800 rounded-lg">
          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">Risk ≥ {minRisk}%</span>
          <input
            type="range"
            min="0"
            max="90"
            step="10"
            value={minRisk}
            onChange={(e) => setMinRisk(Number(e.target.value))}
            className="w-full accent-cyan-500 h-1 bg-slate-800 rounded cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchGraph}
            className="flex-1 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg text-xs font-mono transition-colors"
          >
            Apply
          </button>
          <button
            onClick={() => {
              setSearchQuery('');
              setEntityTypeFilter('All Categories');
              setCrimeTypeFilter('All Crime Types');
              setDistrictFilter('All Districts');
              setMinRisk(0);
              setDateFrom('');
              setDateTo('');
              setFocusNodeId(null);
              setHighlightedPath([]);
              setSelectedNodeId(null);
              setSelectedEdge(null);
              fetchGraph();
            }}
            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* 5. Main Content Grid (Graph 70–75% + Intelligence Dossier 25–30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[580px]">
        {/* Network Graph Canvas Viewport (75% on large screens) */}
        <div 
          ref={containerRef}
          className="lg:col-span-8 xl:col-span-9 bg-slate-950 border border-slate-800/90 rounded-xl relative overflow-hidden flex flex-col shadow-inner min-h-[560px]"
        >
          {/* Top HUD Overlay */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none font-mono">
            <div className="border border-cyan-500/40 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-lg text-[11px] text-cyan-300 shadow-xl space-y-0.5">
              <div className="text-[10px] text-cyan-400/80 font-bold uppercase tracking-wider flex items-center gap-2">
                <span>FIR #FIR-293/SYN/2026</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">SECTOR RADAR</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-[10px]">
                <span className="text-white font-bold">{simNodes.length} NODES</span>
                <span className="text-slate-600">/</span>
                <span className="text-white font-bold">{allEdges.length} EDGES</span>
                <span className="text-cyan-400">CLICK NODE TO TRACE CONNECTIONS</span>
              </div>
            </div>
          </div>

          {/* Empty Search State */}
          {simNodes.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
              <div className="text-sm font-bold text-white">No Matching Entities or Connections Found</div>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm">
                No database records matched your search query &quot;{searchQuery}&quot;. Try clearing filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setEntityTypeFilter('All Categories');
                  fetchGraph();
                }}
                className="mt-3 px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono"
              >
                Clear Search & Reset
              </button>
            </div>
          )}

          {/* Interactive HTML5 Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onClick={handleClick}
            onWheel={handleWheel}
            className="w-full h-full cursor-grab active:cursor-grabbing bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]"
          />

          {/* Hover Tooltip Card */}
          {hoveredNode && (
            <div 
              className="absolute pointer-events-none z-30 bg-slate-900/95 border border-slate-700/90 p-3 rounded-xl shadow-2xl backdrop-blur-md max-w-xs font-mono text-xs space-y-1.5"
              style={{
                left: Math.min(Math.max((hoveredNode.x - canvasDimensions.width / 2) * zoom + canvasDimensions.width / 2 + pan.x + 20, 20), canvasDimensions.width - 250),
                top: Math.min(Math.max((hoveredNode.y - canvasDimensions.height / 2) * zoom + canvasDimensions.height / 2 + pan.y + 20, 20), canvasDimensions.height - 150),
              }}
            >
              <div className="border-b border-slate-800 pb-1.5">
                <div className="font-bold text-white font-sans text-sm truncate">{hoveredNode.label || hoveredNode.id}</div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
                  <span className="text-emerald-400 font-bold uppercase">{hoveredNode.type}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-300 font-bold">VERIFIED DB</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-300 space-y-0.5">
                <div>Connections: <span className="text-cyan-400 font-bold">{hoveredNode.degree || 1} links</span></div>
                {hoveredNode.phone && <div>Phone: <span className="text-slate-200">{hoveredNode.phone}</span></div>}
                {hoveredNode.vehicle && <div>Vehicle: <span className="text-slate-200">{hoveredNode.vehicle}</span></div>}
                {hoveredNode.caseId && <div>Case: <span className="text-amber-400">{hoveredNode.caseId}</span></div>}
              </div>
            </div>
          )}

          {/* Edge Hover Tooltip Card */}
          {hoveredEdge && !hoveredNode && (
            <div className="absolute bottom-14 left-4 z-30 bg-slate-900/95 border border-slate-700 p-2.5 rounded-xl shadow-xl font-mono text-[11px] space-y-1">
              <div className="text-cyan-400 font-bold">{hoveredEdge.type}</div>
              <div className="text-slate-300">{hoveredEdge.supportingDetail || hoveredEdge.supportingRecord}</div>
              {hoveredEdge.date && <div className="text-slate-500 text-[10px]">{hoveredEdge.date}</div>}
            </div>
          )}

          {/* Bottom HUD Signature */}
          <div className="absolute bottom-3 left-4 z-10 pointer-events-none font-mono text-[10px] text-slate-500">
            SAKSHA v2.0 • Criminal Intelligence Network Platform
          </div>

          {/* Entity Legend */}
          {showLegend && (
            <div className="absolute bottom-8 left-4 z-10 bg-slate-900/95 border border-slate-800 p-2.5 rounded-lg text-[10px] font-mono backdrop-blur-md space-y-1 shadow-md">
              <div className="font-bold text-slate-300 flex justify-between gap-4 pb-1 border-b border-slate-800">
                <span>ENTITY TYPES & ORBS</span>
                <button onClick={() => setShowLegend(false)} className="text-slate-500 hover:text-white pointer-events-auto">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5 text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> FIR / CASE (Ruby Crimson)</span>
                <span className="flex items-center gap-1.5 text-cyan-400"><span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm" /> PERSON / SUSPECT (Neon Aqua)</span>
                <span className="flex items-center gap-1.5 text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" /> PHONE (Royal Sapphire)</span>
                <span className="flex items-center gap-1.5 text-purple-400"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" /> VEHICLE (Radiant Purple)</span>
                <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> LOCATION (Solar Gold)</span>
                <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm" /> VICTIM / WITNESS (Emerald)</span>
              </div>
            </div>
          )}

          {/* Canvas Controls Toolbar */}
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 bg-slate-900/95 border border-slate-800 p-1 rounded-lg shadow-md">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 3.5))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.35))}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowAllLabels(!showAllLabels)}
              className={`p-1.5 rounded text-xs transition-colors ${showAllLabels ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}
              title="Toggle All Node Labels"
            >
              {showAllLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => fitGraphToView(simNodes, canvasDimensions.width, canvasDimensions.height)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Fit Graph to Screen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setSelectedNodeId(null);
                setSelectedEdge(null);
                setHighlightedPath([]);
                setFocusNodeId(null);
                fitGraphToView(simNodes, canvasDimensions.width, canvasDimensions.height);
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right-Side Intelligence Dossier & Inspector (25–30% width) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between overflow-y-auto max-h-[640px] shadow-lg">
          {/* View 1: Edge Relationship Inspector */}
          {selectedEdge ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Relationship Intelligence</h3>
                </div>
                <button onClick={() => setSelectedEdge(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-[10px] uppercase text-cyan-400 font-bold">Relationship Type</div>
                <div className="text-sm font-bold text-white">{selectedEdge.type}</div>

                <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Source Node:</span>
                    <span className="text-slate-200 font-bold">{simNodes.find(n => n.id === selectedEdge.source)?.label || selectedEdge.source}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Target Node:</span>
                    <span className="text-slate-200 font-bold">{simNodes.find(n => n.id === selectedEdge.target)?.label || selectedEdge.target}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Supporting Record:</span>
                    <span className="text-amber-400">{selectedEdge.supportingRecord || 'DB Link'}</span>
                  </div>
                  {selectedEdge.date && (
                    <div className="flex justify-between text-slate-400">
                      <span>Event Timestamp:</span>
                      <span className="text-slate-300">{selectedEdge.date}</span>
                    </div>
                  )}
                </div>

                {selectedEdge.supportingDetail && (
                  <div className="p-2 bg-slate-900/90 rounded-lg text-[11px] text-slate-300 leading-relaxed">
                    {selectedEdge.supportingDetail}
                  </div>
                )}
              </div>
            </div>
          ) : activeMode === 'SHORTEST_PATH' ? (
            /* View 2: BFS Shortest Path Finder */
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Route className="w-4 h-4 text-cyan-400" />
                  BFS Shortest Path Finder
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Trace investigative connections between any two entities
                </p>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Source Entity (Origin):</label>
                  <select
                    value={pathSource || ''}
                    onChange={(e) => setPathSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="">Select Source Node</option>
                    {simNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.label || n.id} ({n.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase mb-1">Target Entity (Destination):</label>
                  <select
                    value={pathTarget || ''}
                    onChange={(e) => setPathTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="">Select Target Node</option>
                    {simNodes.map((n) => (
                      <option key={n.id} value={n.id}>{n.label || n.id} ({n.type})</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => pathSource && pathTarget && runShortestPath(pathSource, pathTarget)}
                  disabled={!pathSource || !pathTarget}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-colors shadow-sm"
                >
                  Calculate Connection Path
                </button>
              </div>

              {pathResultSteps.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Found {pathResultSteps.length} hop connection path:
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {pathResultSteps.map((step, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                          <span>{simNodes.find(n => n.id === step.from)?.label || step.from}</span>
                          <ArrowRight className="w-3 h-3 text-cyan-400" />
                          <span>{simNodes.find(n => n.id === step.to)?.label || step.to}</span>
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono font-semibold">{step.type}</div>
                        {step.detail && (
                          <div className="text-[10px] text-slate-400 font-mono">{step.detail}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : pathSearched && pathSource && pathTarget && (
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-2">
                  <div className="text-amber-400 font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    No direct path in current cluster
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                    Both entities exist in the database, but no recorded link connects them within the current investigation dataset.
                  </p>
                </div>
              )}
            </div>
          ) : activeMode === 'COMMUNITIES' ? (
            /* View 3: Communities View */
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Network Communities ({graphData?.communities?.length || 0})
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Connected Component Clusters</p>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {graphData?.communities?.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{c.name}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-[10px]">
                        {c.memberCount} members
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Internal Links: {c.edgeCount} • Dominant: {c.dominantType}
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium pt-1">
                      Key Members: {c.topMembers.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMode === 'CENTRALITY' ? (
            /* View 4: Centrality Ranks */
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  Key Player Centrality Analysis
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Brandes Betweenness & Degree Centrality</p>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Top Degree Hubs:</div>
                {graphData?.topHubs?.map((h) => (
                  <div 
                    key={h.id} 
                    onClick={() => setSelectedNodeId(h.id)}
                    className="p-2.5 bg-slate-950/80 hover:bg-slate-800 rounded-lg border border-slate-800 cursor-pointer text-xs flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{h.label || h.id}</div>
                      <div className="text-[10px] font-mono text-slate-400">{h.type} • ID: {h.id.slice(0, 12)}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 font-mono text-xs font-bold">
                      {h.degree} links
                    </span>
                  </div>
                ))}

                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider font-mono pt-2">Top Bridge Brokers (Betweenness):</div>
                {graphData?.topBridges?.map((b) => (
                  <div 
                    key={b.id} 
                    onClick={() => setSelectedNodeId(b.id)}
                    className="p-2.5 bg-slate-950/80 hover:bg-slate-800 rounded-lg border border-slate-800 cursor-pointer text-xs flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-white">{b.label || b.id}</div>
                      <div className="text-[10px] font-mono text-slate-400">Betweenness: {(b.betweenness || 0).toFixed(4)}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 font-mono text-xs font-bold">
                      Bridge
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMode === 'TIMELINE' ? (
            /* View 5: Timeline View */
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Chronological Timeline ({graphData?.timeline?.length || 0})
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Database Event Sequence</p>
              </div>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {graphData?.timeline?.map((t) => (
                  <div key={t.id} className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{t.title}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{t.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{t.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMode === 'LINK_ANALYSIS' ? (
            /* View 6: Link Analysis */
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-cyan-400" />
                  Link Relationship Breakdown
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Inter-Entity Relationship Types</p>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {graphData?.linkAnalysis?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-white">{item.type}</span>
                      <span className="font-mono text-cyan-400">{item.count} links ({item.percentage}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeMode === 'AI_INSIGHTS' ? (
            /* View 7: AI Insights */
            <div className="space-y-3">
              <div className="pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  AI Explainable Insights
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">Factual Observations from Graph Topology</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> High Connectivity Observation
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    The active graph contains {simNodes.length} nodes across {graphData?.communities?.length || 1} distinct connected clusters. Key intercept hubs have up to {graphData?.topHubs?.[0]?.degree || 0} direct relationships.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Evidentiary Audit
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    100% of plotted graph edges correspond to verified database records (CDR telephony, bank transfers, FIR dockets, ANPR camera hits).
                  </p>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            /* Default Mode: Selected Node Dossier & Inspector */
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <span 
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase"
                    style={{ 
                      backgroundColor: `${getNodeColorTheme(selectedNode.type).primary}25`,
                      color: getNodeColorTheme(selectedNode.type).glow 
                    }}
                  >
                    {selectedNode.type}
                  </span>
                  <h2 className="text-base font-bold text-white mt-1">{selectedNode.label || selectedNode.id}</h2>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {selectedNode.id}</p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 font-mono uppercase">Connections</div>
                  <div className="text-base font-bold font-mono text-cyan-400">
                    {selectedNode.degree || directConnectedNeighbors.length}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    setFocusNodeId(selectedNode.id);
                    setFocusHops(2);
                  }}
                  className="p-2 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-600/40 text-cyan-400 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Focus 2-Hops
                </button>

                <button
                  onClick={() => {
                    setPathSource(selectedNode.id);
                    setActiveMode('SHORTEST_PATH');
                    setPathSearched(false);
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm"
                >
                  <Route className="w-3.5 h-3.5" /> Path Endpoint
                </button>
              </div>

              {/* Factual Record Details */}
              <div className="space-y-2 text-xs font-mono">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                  Database Record Attributes
                </div>
                <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                  {selectedNode.phone && (
                    <div className="flex justify-between text-slate-400">
                      <span>Phone:</span>
                      <span className="text-slate-200">{selectedNode.phone}</span>
                    </div>
                  )}
                  {selectedNode.vehicle && (
                    <div className="flex justify-between text-slate-400">
                      <span>Vehicle:</span>
                      <span className="text-slate-200">{selectedNode.vehicle}</span>
                    </div>
                  )}
                  {selectedNode.location && (
                    <div className="flex justify-between text-slate-400">
                      <span>Location:</span>
                      <span className="text-slate-200">{selectedNode.location}</span>
                    </div>
                  )}
                  {selectedNode.caseId && (
                    <div className="flex justify-between text-slate-400">
                      <span>Case ID:</span>
                      <span className="text-cyan-400">{selectedNode.caseId}</span>
                    </div>
                  )}
                  {selectedNode.crimeType && (
                    <div className="flex justify-between text-slate-400">
                      <span>Classification:</span>
                      <span className="text-slate-200">{selectedNode.crimeType}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Database Status:</span>
                    <span className="text-emerald-400 font-semibold">Verified</span>
                  </div>
                </div>
              </div>

              {/* Direct Evidence Connections */}
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex justify-between">
                  <span>Direct Relationships</span>
                  <span className="font-mono text-cyan-400">{directConnectedNeighbors.length}</span>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {directConnectedNeighbors.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 font-mono text-[11px] bg-slate-950/50 rounded">
                      No connected neighbors in current filter.
                    </div>
                  ) : (
                    directConnectedNeighbors.map(({ node: nb, edge: ed }) => (
                      <div
                        key={nb.id}
                        onClick={() => {
                          setSelectedNodeId(nb.id);
                          setSelectedEdge(ed);
                        }}
                        className="p-2 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 rounded-lg cursor-pointer transition-colors space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-slate-200 font-medium truncate max-w-[140px] text-xs">
                            {nb.label || nb.id}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-400">{ed.type}</span>
                        </div>
                        {ed.supportingDetail && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">{ed.supportingDetail}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dossier Generation Button */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowDossierModal(true)}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
                >
                  <FileText className="w-3.5 h-3.5" /> Generate Complete Dossier
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Layers className="w-10 h-10 text-slate-700" />
              <div className="text-xs font-mono uppercase text-slate-400">
                Click any entity node to illuminate investigative relationships
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. Complete Dossier Modal Popup */}
      {showDossierModal && selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Forensic Intelligence Dossier</h3>
              </div>
              <button onClick={() => setShowDossierModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-white">{selectedNode.label || selectedNode.id}</div>
                  <div className="text-[11px] font-mono text-cyan-400">{selectedNode.type} • ID: {selectedNode.id}</div>
                </div>
                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold rounded-lg border border-cyan-500/30">
                  {selectedNode.degree || 0} Total Links
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-500 uppercase">Primary Phone</div>
                  <div className="text-slate-200 font-bold">{selectedNode.phone || 'No Phone Intercept'}</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-500 uppercase">Registered Vehicle</div>
                  <div className="text-slate-200 font-bold">{selectedNode.vehicle || 'No Vehicle Linked'}</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-500 uppercase">Primary Jurisdiction</div>
                  <div className="text-slate-200 font-bold">{selectedNode.location || selectedNode.jurisdiction || 'Monitored Sector'}</div>
                </div>
                <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 space-y-1">
                  <div className="text-slate-500 uppercase">Assigned Docket</div>
                  <div className="text-cyan-400 font-bold">{selectedNode.caseId || 'Cross-Case Entity'}</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white font-mono text-xs uppercase">Direct Relationship Evidence ({directConnectedNeighbors.length})</div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {directConnectedNeighbors.map(({ node: nb, edge: ed }, i) => (
                    <div key={i} className="text-[11px] font-mono p-1.5 bg-slate-900/80 rounded border border-slate-800 flex justify-between">
                      <span className="text-slate-200">{nb.label || nb.id}</span>
                      <span className="text-cyan-400">{ed.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Print / Export Dossier (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
