import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ArrowLeftRight,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  GitBranch,
  GitCommit,
  GitMerge,
  History,
  Layers3,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { SceneEntity, SceneSnapshot } from '../types/engine';
import { buildEntityObject3D } from '../engine/meshBuilder';

interface VisualGitModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: SceneSnapshot[];
  currentBranch: string;
  currentEntities: SceneEntity[];
  onCreateSnapshot: (message: string) => void;
  onCreateBranch: (name: string, fromSnapshotId: string) => void;
  onCheckoutSnapshot: (snapshotId: string) => void;
  onMergeSnapshot: (snapshotId: string, strategy: 'smart' | 'theirs') => void;
}

interface SceneDiffPreviewProps {
  entities: SceneEntity[];
  compareEntities: SceneEntity[];
  side: 'before' | 'after';
  accent: string;
}

const SceneDiffPreview: React.FC<SceneDiffPreviewProps> = ({ entities, compareEntities, side, accent }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080d17');
    scene.fog = new THREE.Fog('#080d17', 20, 52);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(46, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 120);
    camera.position.set(11, 9, 14);
    camera.lookAt(0, 1, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.32;
    controls.enablePan = false;
    controls.minDistance = 9;
    controls.maxDistance = 32;

    scene.add(new THREE.HemisphereLight('#7dd3fc', '#1e1b4b', 1.8));
    const key = new THREE.DirectionalLight('#e0f2fe', 3.0);
    key.position.set(7, 12, 8);
    scene.add(key);
    const fill = new THREE.PointLight(accent, 14, 25);
    fill.position.set(-5, 4, 3);
    scene.add(fill);
    const grid = new THREE.GridHelper(34, 34, accent, '#1e293b');
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    scene.add(grid);

    const compareMap = new Map(compareEntities.map((e) => [e.id, e]));
    for (const entity of entities) {
      const object = buildEntityObject3D(entity, 'lit', []);
      // Diff previews prioritize silhouette and material changes over dense VFX.
      object.traverse((child) => {
        if (child instanceof THREE.Points) {
          const count = child.geometry.getAttribute('position')?.count || 0;
          child.geometry.setDrawRange(0, Math.min(650, count));
        }
      });
      const other = compareMap.get(entity.id);
      const isAdded = side === 'after' && !other;
      const isRemoved = side === 'before' && !other;
      const isChanged = other && JSON.stringify(other) !== JSON.stringify(entity);
      if (isAdded || isRemoved || isChanged) {
        const color = isAdded ? '#34d399' : isRemoved ? '#fb7185' : '#fbbf24';
        const helper = new THREE.BoxHelper(object, color);
        scene.add(helper);
        const beacon = new THREE.PointLight(color, 4, 5);
        beacon.position.set(entity.position[0], entity.position[1] + 2, entity.position[2]);
        scene.add(beacon);
      }
      scene.add(object);
    }

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, [entities, compareEntities, side, accent]);

  return <div ref={mountRef} className="absolute inset-0" />;
};

const timeAgo = (timestamp: number) => {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  return `${Math.floor(hours / 24)}h lalu`;
};

export const VisualGitModal: React.FC<VisualGitModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  currentBranch,
  currentEntities,
  onCreateSnapshot,
  onCreateBranch,
  onCheckoutSnapshot,
  onMergeSnapshot,
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(snapshots[0]?.id || null);
  const [commitMessage, setCommitMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState<'smart' | 'theirs'>('smart');
  const [sidebarTab, setSidebarTab] = useState<'history' | 'changes'>('history');

  useEffect(() => {
    if (snapshots[0]) setSelectedSnapshotId(snapshots[0].id);
  }, [snapshots[0]?.id]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId) || snapshots[0];
  const beforeEntities = selectedSnapshot?.entities || [];

  const diff = useMemo(() => {
    const beforeMap = new Map(beforeEntities.map((e) => [e.id, e]));
    const currentMap = new Map(currentEntities.map((e) => [e.id, e]));
    const added = currentEntities.filter((e) => !beforeMap.has(e.id));
    const removed = beforeEntities.filter((e) => !currentMap.has(e.id));
    const changed = currentEntities.filter((e) => {
      const before = beforeMap.get(e.id);
      return before && JSON.stringify(before) !== JSON.stringify(e);
    });
    return { added, removed, changed };
  }, [beforeEntities, currentEntities]);

  if (!isOpen) return null;

  const hasChanges = diff.added.length + diff.removed.length + diff.changed.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-7xl h-[92vh] bg-[#0d1320] border border-purple-500/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="px-5 py-3.5 bg-[#090d16] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300"><GitBranch className="w-5 h-5" /></div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">Visual Version Control <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">GIT, WITHOUT THE FEAR</span></h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Snapshot, branch, visual scene diff, dan merge dalam satu canvas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/25 text-[11px] text-purple-200 font-mono-code"><GitBranch className="w-3.5 h-3.5" />{currentBranch}</span>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Snapshot action bar */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-[#0b101b] flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex-1 min-w-[220px] relative">
            <GitCommit className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && commitMessage.trim()) {
                  onCreateSnapshot(commitMessage.trim());
                  setCommitMessage('');
                }
              }}
              placeholder="Describe your changes… mis. Add mossy ruins & crystal glow"
              className="w-full bg-[#070b14] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
            />
          </div>
          <button
            disabled={!commitMessage.trim()}
            onClick={() => {
              onCreateSnapshot(commitMessage.trim());
              setCommitMessage('');
            }}
            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold flex items-center gap-2 transition"
          ><GitCommit className="w-4 h-4" /> Create snapshot</button>
          <button onClick={() => setShowBranchInput((v) => !v)} className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> New branch</button>
          {showBranchInput && (
            <div className="w-full flex gap-2 pt-1">
              <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="feature/nama-branch" className="flex-1 bg-[#070b14] border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono-code focus:outline-none focus:border-cyan-500/50" />
              <button
                disabled={!branchName.trim() || !selectedSnapshot}
                onClick={() => {
                  if (selectedSnapshot) onCreateBranch(branchName.trim(), selectedSnapshot.id);
                  setBranchName('');
                  setShowBranchInput(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 text-xs disabled:opacity-40"
              >Create from selected</button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[265px_1fr]">
          {/* Snapshot history / change list */}
          <aside className="border-r border-slate-800 bg-[#0a0f1a] flex flex-col min-h-0 max-h-[35vh] lg:max-h-none">
            <div className="grid grid-cols-2 border-b border-slate-800 shrink-0">
              <button onClick={() => setSidebarTab('history')} className={`py-2.5 text-[11px] font-semibold border-b-2 ${sidebarTab === 'history' ? 'text-purple-300 border-purple-400 bg-purple-500/5' : 'text-slate-500 border-transparent'}`}><History className="w-3.5 h-3.5 inline mr-1.5" />History</button>
              <button onClick={() => setSidebarTab('changes')} className={`py-2.5 text-[11px] font-semibold border-b-2 ${sidebarTab === 'changes' ? 'text-cyan-300 border-cyan-400 bg-cyan-500/5' : 'text-slate-500 border-transparent'}`}><Layers3 className="w-3.5 h-3.5 inline mr-1.5" />Changes</button>
            </div>

            {sidebarTab === 'history' ? (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="relative">
                  <div className="absolute left-[9px] top-4 bottom-4 w-px bg-slate-800" />
                  {/* Working tree pseudo node */}
                  <div className="relative flex gap-3 p-2 mb-1 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                    <CircleDot className="w-[18px] h-[18px] text-cyan-300 shrink-0 bg-[#0a0f1a] z-10" />
                    <div><div className="text-[11px] font-semibold text-cyan-200">Working scene</div><div className="text-[9px] text-slate-500 mt-0.5">{currentEntities.length} nodes • uncommitted</div></div>
                  </div>
                  {snapshots.map((snapshot, index) => (
                    <button
                      key={snapshot.id}
                      onClick={() => setSelectedSnapshotId(snapshot.id)}
                      className={`relative w-full text-left flex gap-3 p-2 my-1 rounded-xl border transition ${selectedSnapshot?.id === snapshot.id ? 'bg-purple-500/10 border-purple-500/35' : 'border-transparent hover:bg-slate-900'}`}
                    >
                      <div className={`w-[18px] h-[18px] rounded-full border-4 border-[#0a0f1a] z-10 shrink-0 ${index === 0 ? 'bg-purple-400' : 'bg-slate-600'}`} />
                      <div className="min-w-0">
                        <div className={`text-[11px] font-medium leading-snug ${selectedSnapshot?.id === snapshot.id ? 'text-purple-100' : 'text-slate-300'}`}>{snapshot.message}</div>
                        <div className="text-[9px] text-slate-600 mt-1 flex items-center gap-1.5"><span className="font-mono-code">{snapshot.id.slice(-6)}</span>•<span>{timeAgo(snapshot.timestamp)}</span></div>
                        <div className="flex items-center gap-1 mt-1.5"><span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 font-mono-code">{snapshot.branch}</span>{index === 0 && <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">HEAD</span>}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
                {[
                  { title: 'Added', color: 'text-emerald-300', items: diff.added },
                  { title: 'Modified', color: 'text-amber-300', items: diff.changed },
                  { title: 'Removed', color: 'text-rose-300', items: diff.removed },
                ].map((group) => (
                  <div key={group.title}>
                    <div className={`font-semibold ${group.color} mb-1.5 flex items-center justify-between`}><span>{group.title}</span><span>{group.items.length}</span></div>
                    {group.items.length === 0 ? <div className="text-slate-600 text-[10px]">No scene nodes</div> : group.items.map((entity) => <div key={entity.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-900 text-slate-400"><Box className="w-3 h-3" /><span className="truncate">{entity.name}</span><ChevronRight className="w-3 h-3 ml-auto text-slate-700" /></div>)}
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 border-t border-slate-800 text-[9px] text-slate-600 leading-relaxed shrink-0">
              <span className="text-emerald-400 mr-1">●</span> CRDT-safe history. Snapshot disimpan lokal bersama scene Anda.
            </div>
          </aside>

          {/* Main visual diff */}
          <main className="min-h-0 overflow-y-auto p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500">Visual scene diff</div>
                <h3 className="text-sm font-bold text-slate-100 mt-1">{selectedSnapshot?.message || 'Initial scene'} <span className="text-slate-600 mx-1">→</span> <span className="text-cyan-300">Working scene</span></h3>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-emerald-300">+{diff.added.length} added</span><span className="text-amber-300">~{diff.changed.length} changed</span><span className="text-rose-300">−{diff.removed.length} removed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#080d17]">
                <div className="h-9 px-3 flex items-center justify-between bg-[#0b101b] border-b border-slate-800"><span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1.5"><GitCommit className="w-3.5 h-3.5 text-purple-300" />{selectedSnapshot?.id.slice(-6) || 'BASE'} • Snapshot</span><span className="text-[9px] text-slate-600">{beforeEntities.length} nodes</span></div>
                <div className="relative h-[270px]"><SceneDiffPreview entities={beforeEntities} compareEntities={currentEntities} side="before" accent="#a855f7" /></div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-cyan-500/25 bg-[#080d17]">
                <div className="h-9 px-3 flex items-center justify-between bg-[#0b101b] border-b border-slate-800"><span className="text-[10px] font-semibold text-cyan-200 flex items-center gap-1.5"><CircleDot className="w-3.5 h-3.5" />Working scene • Current</span><span className="text-[9px] text-slate-600">{currentEntities.length} nodes</span></div>
                <div className="relative h-[270px]"><SceneDiffPreview entities={currentEntities} compareEntities={beforeEntities} side="after" accent="#00f0ff" /></div>
              </div>
            </div>

            {/* Transform-level change details */}
            <div className="rounded-xl border border-slate-800 bg-[#0a0f1a] overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-300 flex items-center gap-1.5"><ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />Scene property changes</span><span className="text-[9px] text-slate-600">Entity-level visual merge</span></div>
              <div className="max-h-36 overflow-y-auto">
                {!hasChanges ? (
                  <div className="p-5 text-center text-[11px] text-slate-500"><CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-400" />Working scene identik dengan snapshot ini.</div>
                ) : [...diff.added, ...diff.changed, ...diff.removed].slice(0, 8).map((entity) => {
                  const before = beforeEntities.find((e) => e.id === entity.id);
                  const status = !before ? 'ADDED' : !currentEntities.find((e) => e.id === entity.id) ? 'REMOVED' : 'MODIFIED';
                  return (
                    <div key={`${status}-${entity.id}`} className="px-3 py-2 flex items-center gap-3 border-b border-slate-800/50 last:border-0 text-[10px]">
                      <span className={`w-16 shrink-0 font-mono-code ${status === 'ADDED' ? 'text-emerald-300' : status === 'REMOVED' ? 'text-rose-300' : 'text-amber-300'}`}>{status}</span>
                      <Box className="w-3 h-3 text-slate-600" /><span className="text-slate-300 truncate">{entity.name}</span>
                      <span className="ml-auto font-mono-code text-slate-600 hidden sm:block">{before ? `Y ${before.position[1].toFixed(1)} → ${entity.position[1].toFixed(1)}` : entity.id}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Merge / checkout actions */}
            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 p-3.5 flex flex-wrap items-center gap-3">
              <div className="mr-auto"><div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-300" />Ready to reconcile?</div><div className="text-[10px] text-slate-500 mt-1">Preview sudah diverifikasi. Checkout atau merge snapshot ke working scene.</div></div>
              <select value={mergeStrategy} onChange={(e) => setMergeStrategy(e.target.value as 'smart' | 'theirs')} className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-[10px] text-slate-300"><option value="smart">Smart scene merge</option><option value="theirs">Use snapshot version</option></select>
              <button disabled={!selectedSnapshot} onClick={() => selectedSnapshot && onCheckoutSnapshot(selectedSnapshot.id)} className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5 disabled:opacity-40"><RotateCcw className="w-3.5 h-3.5" />Checkout</button>
              <button disabled={!selectedSnapshot || !hasChanges} onClick={() => selectedSnapshot && onMergeSnapshot(selectedSnapshot.id, mergeStrategy)} className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white text-[10px] font-bold flex items-center gap-1.5"><GitMerge className="w-4 h-4" />Merge into {currentBranch}</button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
