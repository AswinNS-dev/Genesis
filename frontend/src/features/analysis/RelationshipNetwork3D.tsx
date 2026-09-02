import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, GitBranch, RotateCcw, Search, ZoomIn, ZoomOut } from 'lucide-react';
import { CaseNetworkResponse } from '../../services/cases';

type GraphNode = CaseNetworkResponse['nodes'][number];
type GraphEdge = CaseNetworkResponse['edges'][number];

interface PositionedNode extends GraphNode {
  position: THREE.Vector3;
  color: string;
}

const ENTITY_COLORS: Record<string, string> = {
  PERSON: '#38bdf8',
  ORGANIZATION: '#a78bfa',
  ACCOUNT: '#f59e0b',
  VEHICLE: '#22c55e',
  LOCATION: '#fb7185',
};

const RELATION_COLORS: Record<string, string> = {
  COMMUNICATED_WITH: '#38bdf8',
  TRANSACTED_WITH: '#f59e0b',
  LOCATED_AT: '#fb7185',
  USES_VEHICLE: '#22c55e',
  ASSOCIATED_WITH: '#a78bfa',
};

function colorForType(type: string, fallback: string) {
  return ENTITY_COLORS[type?.toUpperCase()] ?? RELATION_COLORS[type?.toUpperCase()] ?? fallback;
}

function makeLabelTexture(text: string, color: string) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512;
  canvas.height = 128;
  if (!context) return new THREE.CanvasTexture(canvas);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = '600 34px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = 'rgba(9, 13, 22, 0.74)';
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.roundRect(22, 30, 468, 68, 18);
  context.fill();
  context.stroke();
  context.fillStyle = '#e5e7eb';
  context.fillText(text.slice(0, 24), 256, 65, 430);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function buildPositions(nodes: GraphNode[], edges: GraphEdge[]): PositionedNode[] {
  const degree = new Map<string, number>();
  edges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  });

  const byType = nodes.reduce<Record<string, GraphNode[]>>((acc, node) => {
    const key = node.type || 'UNKNOWN';
    (acc[key] ??= []).push(node);
    return acc;
  }, {});

  const types = Object.keys(byType);
  const positioned: PositionedNode[] = [];
  types.forEach((type, typeIndex) => {
    const group = byType[type];
    const typeAngle = (typeIndex / Math.max(types.length, 1)) * Math.PI * 2;
    const clusterCenter = new THREE.Vector3(
      Math.cos(typeAngle) * 9,
      (typeIndex % 2 === 0 ? 1 : -1) * 2.3,
      Math.sin(typeAngle) * 9
    );

    group.forEach((node, index) => {
      const rankPull = Math.min(degree.get(node.id) ?? 0, 5) * 0.55;
      const angle = (index / Math.max(group.length, 1)) * Math.PI * 2 + typeAngle / 2;
      const radius = Math.max(2.2, 5.4 - rankPull);
      positioned.push({
        ...node,
        color: colorForType(type, '#94a3b8'),
        position: new THREE.Vector3(
          clusterCenter.x + Math.cos(angle) * radius,
          clusterCenter.y + Math.sin(index * 1.7) * 2.8,
          clusterCenter.z + Math.sin(angle) * radius
        ),
      });
    });
  });
  return positioned;
}

export function RelationshipNetwork3D({ network }: { network: CaseNetworkResponse }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const graphGroupRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number | null>(null);
  const nodeObjectsRef = useRef<THREE.Object3D[]>([]);
  const edgeObjectsRef = useRef<THREE.Object3D[]>([]);
  const [query, setQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const filteredNetwork = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return network;
    const nodes = network.nodes.filter((node) =>
      `${node.label} ${node.type}`.toLowerCase().includes(q)
    );
    const ids = new Set(nodes.map((node) => node.id));
    const edges = network.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    return { nodes, edges };
  }, [network, query]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060914');
    scene.fog = new THREE.Fog('#060914', 36, 88);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 10, 34);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight('#e0f2fe', 0.75));
    const keyLight = new THREE.PointLight('#f8fafc', 220, 80);
    keyLight.position.set(10, 20, 18);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight('#38bdf8', 70, 50);
    rimLight.position.set(-16, -4, -12);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(44, 22, '#1f2937', '#111827');
    grid.position.y = -7;
    scene.add(grid);

    const graphGroup = new THREE.Group();
    graphGroupRef.current = graphGroup;
    scene.add(graphGroup);

    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.38 };
    const pointer = new THREE.Vector2();
    let dragging = false;
    let moved = false;
    let lastX = 0;
    let lastY = 0;

    const setPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const pick = (event: PointerEvent, commit: boolean) => {
      setPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([...nodeObjectsRef.current, ...edgeObjectsRef.current], true);
      const hit = hits.find((item) => item.object.userData?.node || item.object.userData?.edge);
      if (!hit) {
        setHoverLabel(null);
        if (commit) {
          setSelectedNode(null);
          setSelectedEdge(null);
        }
        return;
      }
      const node = hit.object.userData.node as GraphNode | undefined;
      const edge = hit.object.userData.edge as GraphEdge | undefined;
      setHoverLabel(node ? `${node.label} (${node.type})` : `${edge?.type} relationship`);
      if (commit) {
        setSelectedNode(node ?? null);
        setSelectedEdge(edge ?? null);
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      moved = false;
      lastX = event.clientX;
      lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (dragging) {
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        graphGroup.rotation.y += dx * 0.008;
        graphGroup.rotation.x += dy * 0.004;
        graphGroup.rotation.x = Math.max(-0.75, Math.min(0.75, graphGroup.rotation.x));
        moved = moved || Math.abs(dx) + Math.abs(dy) > 3;
        lastX = event.clientX;
        lastY = event.clientY;
      } else {
        pick(event, false);
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.releasePointerCapture(event.pointerId);
      if (!moved) pick(event, true);
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      camera.position.z = Math.max(16, Math.min(58, camera.position.z + event.deltaY * 0.025));
    };
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      graphGroup.rotation.y += 0.0018;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const group = graphGroupRef.current;
    if (!group) return;
    group.clear();
    nodeObjectsRef.current = [];
    edgeObjectsRef.current = [];

    const positioned = buildPositions(filteredNetwork.nodes, filteredNetwork.edges);
    const nodeMap = new Map(positioned.map((node) => [node.id, node]));

    filteredNetwork.edges.forEach((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;
      const material = new THREE.LineBasicMaterial({
        color: colorForType(edge.type, '#64748b'),
        transparent: true,
        opacity: Math.max(0.42, Math.min((edge.strength ?? 55) / 100, 0.95)),
      });
      const geometry = new THREE.BufferGeometry().setFromPoints([source.position, target.position]);
      const line = new THREE.Line(geometry, material);
      line.userData.edge = edge;
      group.add(line);
      edgeObjectsRef.current.push(line);
    });

    positioned.forEach((node) => {
      const radius = 0.55 + Math.min(node.riskScore ?? 50, 100) / 210;
      const geometry = new THREE.SphereGeometry(radius, 32, 18);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.22,
        roughness: 0.42,
        metalness: 0.28,
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.copy(node.position);
      sphere.userData.node = node;
      group.add(sphere);
      nodeObjectsRef.current.push(sphere);

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 0.18, 0.025, 8, 48),
        new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: 0.62 })
      );
      ring.position.copy(node.position);
      ring.rotation.x = Math.PI / 2;
      ring.userData.node = node;
      group.add(ring);
      nodeObjectsRef.current.push(ring);

      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeLabelTexture(node.label, node.color),
          transparent: true,
          depthWrite: false,
        })
      );
      label.position.copy(node.position).add(new THREE.Vector3(0, radius + 0.85, 0));
      label.scale.set(4.8, 1.2, 1);
      group.add(label);
    });
  }, [filteredNetwork]);

  const selectedSource = selectedEdge
    ? network.nodes.find((node) => node.id === selectedEdge.source)?.label ?? selectedEdge.source
    : '';
  const selectedTarget = selectedEdge
    ? network.nodes.find((node) => node.id === selectedEdge.target)?.label ?? selectedEdge.target
    : '';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Box className="h-4 w-4 text-sky-400" />
          <span>3D Relationship Network</span>
        </div>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search entities"
            className="h-8 w-44 rounded-md border border-slate-700 bg-slate-950 pl-8 pr-2 text-xs text-slate-200 outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Drag rotate</span>
          <ZoomIn className="ml-2 h-3.5 w-3.5" />
          <ZoomOut className="h-3.5 w-3.5" />
          <span>Wheel zoom</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative h-[540px]">
          <div ref={mountRef} className="h-full w-full" />
          {hoverLabel && (
            <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-200 shadow-xl">
              {hoverLabel}
            </div>
          )}
          {filteredNetwork.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              No matching graph entities.
            </div>
          )}
        </div>

        <aside className="border-t border-slate-800 bg-slate-900/40 p-4 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-mono text-lg font-bold text-sky-400">{filteredNetwork.nodes.length}</div>
              <div className="text-slate-500">nodes</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <div className="font-mono text-lg font-bold text-amber-400">{filteredNetwork.edges.length}</div>
              <div className="text-slate-500">relationships</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(ENTITY_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  {type}
                </span>
                <span>{network.nodes.filter((node) => node.type === type).length}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
              <GitBranch className="h-3.5 w-3.5 text-amber-400" />
              <span>Selection</span>
            </div>
            {selectedNode ? (
              <div className="space-y-1 text-xs text-slate-300">
                <div className="font-semibold text-white">{selectedNode.label}</div>
                <div>Type: {selectedNode.type}</div>
                <div>Risk: {selectedNode.riskScore}%</div>
              </div>
            ) : selectedEdge ? (
              <div className="space-y-1 text-xs text-slate-300">
                <div className="font-semibold text-white">{selectedEdge.type}</div>
                <div>{selectedSource}</div>
                <div className="text-slate-500">to</div>
                <div>{selectedTarget}</div>
                <div>Strength: {selectedEdge.strength}%</div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Click a sphere or link to inspect it.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
