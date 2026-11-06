import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  CloudDownload,
  Code2,
  GitCommit,
  Film,
  Volume2,
  Terminal,
  Activity,
  Play,
  Pause,
  Plus,
  Cpu,
  Check,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import type {
  AnimationTrack,
  AssetItem,
  BlueprintNode,
  BlueprintNodeType,
  ConsoleLogEntry,
  GeneratedPBRTexturePack,
  ProfilerSample,
  SceneEntity,
  ScriptLanguage,
  VisualScriptGraph,
} from '../types/engine';
import { spatialAudio, type ReverbPreset } from '../engine/spatialAudio';
import { aetherWasm } from '../engine/wasmCore';

export type BottomTabId = 'assets' | 'scripting' | 'anim_audio' | 'console_profiler';

interface BottomPanelProps {
  activeTab: BottomTabId;
  onChangeTab: (tab: BottomTabId) => void;
  assets: AssetItem[];
  onDownloadCloudAsset: (assetId: string) => void;
  onUseAsset: (asset: AssetItem) => void;
  texturePacks: GeneratedPBRTexturePack[];
  onApplyTextureToSelected: (packId: string) => void;
  selectedEntity: SceneEntity | null;
  onUpdateEntity: (id: string, patch: Partial<SceneEntity>) => void;
  visualGraph: VisualScriptGraph;
  onUpdateVisualGraph: (graph: VisualScriptGraph) => void;
  animationTracks: AnimationTrack[];
  timelineTime: number;
  onChangeTimelineTime: (t: number) => void;
  isTimelinePlaying: boolean;
  onToggleTimelinePlay: () => void;
  onAddKeyframe: () => void;
  logs: ConsoleLogEntry[];
  onClearLogs: () => void;
  onConsoleCommand: (cmd: string) => void;
  profilerHistory: ProfilerSample[];
  opfsInfo: { opfsSupported: boolean; usageMb: number };
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  activeTab,
  onChangeTab,
  assets,
  onDownloadCloudAsset,
  onUseAsset,
  texturePacks,
  onApplyTextureToSelected,
  selectedEntity,
  onUpdateEntity,
  visualGraph,
  onUpdateVisualGraph,
  animationTracks,
  timelineTime,
  onChangeTimelineTime,
  isTimelinePlaying,
  onToggleTimelinePlay,
  onAddKeyframe,
  logs,
  onClearLogs,
  onConsoleCommand,
  profilerHistory,
  opfsInfo,
}) => {
  // Sub-states for Asset Browser
  const [assetSourceFilter, setAssetSourceFilter] = useState<'all' | 'local_opfs' | 'cloud_r2'>('all');

  // Sub-states for Scripting Tab (Code Editor vs Blueprint Visual Script)
  const [scriptMode, setScriptMode] = useState<'blueprint' | 'code'>('blueprint');
  const [codeDraft, setCodeDraft] = useState('');
  const [scriptLang, setScriptLang] = useState<ScriptLanguage>('typescript');
  const [wasmBenchResult, setWasmBenchResult] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Sub-states for Audio Mixer
  const [beaconOn, setBeaconOn] = useState(false);
  const [reverb, setReverb] = useState<ReverbPreset>(spatialAudio.currentReverb);
  const [masterVol, setMasterVol] = useState(0.75);
  const [sfxVol, setSfxVol] = useState(0.85);
  const [ambVol, setAmbVol] = useState(0.55);
  const [vuBars, setVuBars] = useState<number[]>([12, 24, 18, 30, 16, 10, 8, 5]);

  // Sub-states for Console
  const [logFilter, setLogFilter] = useState<'all' | 'ai' | 'wasm' | 'collab' | 'error'>('all');
  const [cmdInput, setCmdInput] = useState('');

  // Sync code editor draft when selected entity changes
  useEffect(() => {
    if (selectedEntity?.script) {
      setCodeDraft(selectedEntity.script.code);
      setScriptLang(selectedEntity.script.language);
    } else {
      setCodeDraft(`// Pilih objek lalu klik "Compile & Attach (Hot-Reload)"
export function onUpdate(entity: AetherEntity, dt: number, input: InputState, world: WorldAPI): void {
  // Putar objek & lompat saat Spasi ditekan
  entity.rotation.y = (entity.rotation.y + 60 * dt) % 360;
  if (input.keys['Space'] && entity.isGrounded) {
    entity.velocity.y = 8.5;
    entity.isGrounded = false;
  }
}`);
    }
  }, [selectedEntity?.id, selectedEntity?.script?.code, selectedEntity?.script?.language]);

  // Poll Audio Analyser VU bars when Audio tab is open
  useEffect(() => {
    if (activeTab !== 'anim_audio') return;
    const id = setInterval(() => {
      const levels = spatialAudio.getSpectrumLevels();
      if (levels.some((v) => v > 0)) {
        setVuBars(levels);
      } else if (beaconOn) {
        setVuBars(levels.map((_, i) => 20 + Math.round(Math.sin(Date.now() * 0.01 + i) * 15)));
      }
    }, 120);
    return () => clearInterval(id);
  }, [activeTab, beaconOn]);

  const handleCompileCode = () => {
    if (!selectedEntity) return;
    const ext = scriptLang === 'rust_wasm' ? 'rs' : scriptLang === 'csharp_wasm' ? 'cs' : 'ts';
    const kernel =
      scriptLang === 'rust_wasm'
        ? 'hover_wave'
        : scriptLang === 'csharp_wasm'
        ? 'orbital'
        : 'none';
    onUpdateEntity(selectedEntity.id, {
      script: {
        enabled: true,
        name: `${selectedEntity.name.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`,
        language: scriptLang,
        wasmKernel: kernel,
        code: codeDraft,
      },
    });
  };

  const handleAddBlueprintNode = (type: BlueprintNodeType) => {
    const titles: Record<BlueprintNodeType, { title: string; cat: 'event' | 'action' | 'value'; params: Record<string, any> }> = {
      event_tick: { title: 'Event: On Tick (60Hz)', cat: 'event', params: { enabled: true } },
      event_key_space: { title: 'Event: Key [Space]', cat: 'event', params: { key: 'Space' } },
      event_proximity: { title: 'Event: Near Player', cat: 'event', params: { radius: 4 } },
      action_rotate: { title: 'Rotate Y (Hot-Reload)', cat: 'action', params: { speedDeg: 90 } },
      action_hover_sin: { title: 'Sinusoidal Hover', cat: 'action', params: { amplitude: 0.45, speed: 3.0 } },
      action_pulse_emissive: { title: 'Pulse Neon Glow', cat: 'action', params: { minGlow: 0.5, maxGlow: 2.2, frequency: 3.5 } },
      action_jump: { title: 'Physics Jump Impulse', cat: 'action', params: { force: 9.0 } },
      action_chase_player: { title: 'Chase Player AI', cat: 'action', params: { speed: 3.8 } },
      action_play_sfx: { title: 'Play 3D Spatial Sound', cat: 'action', params: { sfx: 'crystal' } },
      param_float: { title: 'Float Constant', cat: 'value', params: { value: 5.0 } },
      param_color: { title: 'HDR Color', cat: 'value', params: { color: '#00f0ff' } },
    };
    const meta = titles[type];
    const newNode: BlueprintNode = {
      id: `bn-${Date.now()}`,
      type,
      title: meta.title,
      category: meta.cat,
      x: 280 + (visualGraph.nodes.length % 3) * 60,
      y: 35 + (visualGraph.nodes.length % 2) * 85,
      params: meta.params,
    };

    // Auto-connect to first event node so user sees immediate live Hot-Reload!
    const firstEvent = visualGraph.nodes.find((n) => n.category === 'event');
    const nextEdges = [...visualGraph.edges];
    if (meta.cat === 'action' && firstEvent) {
      nextEdges.push({
        id: `edge-${Date.now()}`,
        fromNodeId: firstEvent.id,
        fromPort: 'exec_out',
        toNodeId: newNode.id,
        toPort: 'exec_in',
      });
    }

    onUpdateVisualGraph({
      ...visualGraph,
      nodes: [...visualGraph.nodes, newNode],
      edges: nextEdges,
    });
  };

  const updateBlueprintParam = (nodeId: string, key: string, val: number | string | boolean) => {
    onUpdateVisualGraph({
      ...visualGraph,
      nodes: visualGraph.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, [key]: val } } : n
      ),
    });
  };

  const latestSample: ProfilerSample = profilerHistory[profilerHistory.length - 1] || {
    fps: 60,
    frameTimeMs: 16.6,
    memoryMb: 72,
    drawCalls: 18,
    triangles: 6420,
    physicsBodies: 6,
    wasmStepUs: 38,
  };

  return (
    <div className="h-full bg-[#0c121e] border-t border-slate-800/90 flex flex-col select-none">
      {/* Multi-Editor Tab Bar */}
      <div className="h-9 bg-[#080c15] border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'assets', label: 'Asset Drawer & Cloud Store', icon: FolderOpen },
            { id: 'scripting', label: 'Visual Blueprint & Code Editor', icon: Code2 },
            { id: 'anim_audio', label: 'Animation Timeline & 3D Audio', icon: Film },
            { id: 'console_profiler', label: 'Console & Performance Profiler', icon: Activity },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChangeTab(t.id as BottomTabId)}
                className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Quick OPFS & Telemetry Status Pill */}
        <div className="hidden 2xl:flex items-center gap-3 text-[11px] text-slate-400">
          <span>
            Cache:{' '}
            <strong className="text-emerald-300">
              {opfsInfo.opfsSupported ? 'OPFS Active' : 'IndexedDB'} ({opfsInfo.usageMb.toFixed(2)} MB)
            </strong>
          </span>
          <span className="font-mono-code text-cyan-300">
            {latestSample.drawCalls} Draw Calls • {(latestSample.triangles / 1000).toFixed(1)}K Tris
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: ASSET DRAWER & CLOUD ASSET STORE (DRAG & DROP TO VIEWPORT) */}
      {/* ================================================================= */}
      {activeTab === 'assets' && (
        <div className="flex-1 flex min-h-0">
          {/* Left Category Sidebar */}
          <div className="w-48 border-r border-slate-800/80 p-2.5 space-y-1 text-xs shrink-0 hidden sm:block">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1">
              Storage Source
            </div>
            {[
              { id: 'all', label: 'All Assets' },
              { id: 'local_opfs', label: 'Local OPFS Cache' },
              { id: 'cloud_r2', label: 'Cloud R2 Store' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setAssetSourceFilter(s.id as any)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                  assetSourceFilter === s.id
                    ? 'bg-cyan-500/15 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-800 px-2 text-[10px] text-slate-500 leading-relaxed">
              Tip: Drag & drop kartu aset langsung ke kanvas 3D Viewport, atau klik tombol Spawn/Apply!
            </div>
          </div>

          {/* Asset Cards Grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2.5 content-start">
            {/* Show AI Generated PBR Packs first */}
            {texturePacks.map((tp) => (
              <div
                key={tp.id}
                onClick={() => onApplyTextureToSelected(tp.id)}
                className="group bg-[#090d16] border border-purple-500/40 hover:border-purple-400 rounded-xl p-2 flex flex-col justify-between cursor-pointer transition shadow-md"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <img
                    src={tp.albedoDataUrl}
                    alt={tp.name}
                    className="w-10 h-10 rounded-lg border border-slate-700 object-cover"
                  />
                  <img
                    src={tp.normalDataUrl}
                    alt="Normal"
                    className="w-10 h-10 rounded-lg border border-slate-700 object-cover"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-purple-200 truncate">{tp.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                    <span>AI PBR 4-Map</span>
                    <span className="text-cyan-300 group-hover:underline">Apply</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Standard Local & Cloud Asset Store Items */}
            {assets
              .filter((a) => assetSourceFilter === 'all' || a.source === assetSourceFilter)
              .map((asset) => (
                <div
                  key={asset.id}
                  draggable={asset.downloaded}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/aether-asset', JSON.stringify(asset));
                  }}
                  className="group bg-[#090d16] border border-slate-800 hover:border-cyan-500/50 rounded-xl p-2.5 flex flex-col justify-between transition shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        style={{ color: asset.badgeColor }}
                        className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800"
                      >
                        {asset.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono-code">
                        {(asset.sizeKb / 1024).toFixed(1)}MB
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 truncate mb-0.5">
                      {asset.name}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">
                      {asset.description}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                    {!asset.downloaded ? (
                      <button
                        onClick={() => onDownloadCloudAsset(asset.id)}
                        className="w-full py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <CloudDownload className="w-3 h-3" /> Cache to OPFS
                      </button>
                    ) : (
                      <button
                        onClick={() => onUseAsset(asset)}
                        className="w-full py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />{' '}
                        {asset.category === 'material' ? 'Apply Material' : 'Spawn to Scene'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: VISUAL SCRIPTING (BLUEPRINT HOT-RELOAD) & MONACO CODE      */}
      {/* ================================================================= */}
      {activeTab === 'scripting' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="px-3 py-1.5 bg-[#090d16] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setScriptMode('blueprint')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition ${
                  scriptMode === 'blueprint'
                    ? 'bg-purple-500/25 text-purple-200 ring-1 ring-purple-400/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" /> Node Blueprint (Live Hot-Reload)
              </button>
              <button
                onClick={() => setScriptMode('code')}
                className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 transition ${
                  scriptMode === 'code'
                    ? 'bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" /> Code Editor (TS / Rust Wasm / C#)
              </button>
            </div>

            {scriptMode === 'blueprint' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 mr-2">
                  <Zap className="w-3 h-3" /> Hot-Reload Active
                </span>
                {(
                  [
                    { t: 'action_rotate', label: '+ Rotate' },
                    { t: 'action_hover_sin', label: '+ Hover' },
                    { t: 'action_pulse_emissive', label: '+ Glow' },
                    { t: 'action_chase_player', label: '+ Chase AI' },
                  ] as { t: BlueprintNodeType; label: string }[]
                ).map((b) => (
                  <button
                    key={b.t}
                    onClick={() => handleAddBlueprintNode(b.t)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 border border-slate-700"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={scriptLang}
                  onChange={(e) => {
                    const lang = e.target.value as ScriptLanguage;
                    setScriptLang(lang);
                    if (lang === 'rust_wasm') {
                      setCodeDraft(`// Rust -> WebAssembly (wasm32-unknown-unknown)
use aether_sdk::prelude::*;

#[wasm_bindgen]
pub fn on_update(entity: &mut Entity, dt: f32, time: f32) {
    entity.position.y = entity.base_y + (time * 2.5).sin() * 0.45;
    entity.rotation.y = (entity.rotation.y + 65.0 * dt) % 360.0;
}`);
                    } else if (lang === 'csharp_wasm') {
                      setCodeDraft(`// C# WebAssembly AOT High-Performance Behaviour
using AetherEngine;

public class OrbitalMover : AetherBehaviour {
    public override void OnUpdate(float dt) {
        float a = Time.Elapsed * 0.95f;
        Transform.Position = new Vector3(Mathf.Cos(a) * 4.4f, 1.6f, Mathf.Sin(a) * 4.4f);
    }
}`);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-cyan-300"
                >
                  <option value="typescript">TypeScript / JS (V8 JIT)</option>
                  <option value="rust_wasm">Rust (via WebAssembly)</option>
                  <option value="csharp_wasm">C# (via WebAssembly AOT)</option>
                </select>

                <button
                  onClick={() => {
                    const res = aetherWasm.runBenchmark(300_000);
                    setWasmBenchResult(`${res.opsPerSecMillion} MFLOPS (${res.elapsedMs}ms)`);
                  }}
                  className="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[11px] flex items-center gap-1 hover:bg-purple-500/30"
                >
                  <Cpu className="w-3 h-3" /> Wasm Bench {wasmBenchResult ? `• ${wasmBenchResult}` : ''}
                </button>

                <button
                  disabled={!selectedEntity}
                  onClick={handleCompileCode}
                  className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Compile & Attach
                </button>
              </div>
            )}
          </div>

          {/* Blueprint Node Canvas OR Monaco-grade Code Editor */}
          {scriptMode === 'blueprint' ? (
            <div
              onPointerMove={(e) => {
                if (!draggingNodeId) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const nx = Math.max(10, e.clientX - rect.left - dragOffset.dx);
                const ny = Math.max(10, e.clientY - rect.top - dragOffset.dy);
                onUpdateVisualGraph({
                  ...visualGraph,
                  nodes: visualGraph.nodes.map((n) =>
                    n.id === draggingNodeId ? { ...n, x: nx, y: ny } : n
                  ),
                });
              }}
              onPointerUp={() => setDraggingNodeId(null)}
              onPointerLeave={() => setDraggingNodeId(null)}
              className="relative flex-1 blueprint-grid overflow-auto"
            >
              {/* Bezier Connection Wires SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {visualGraph.edges.map((edge) => {
                  const from = visualGraph.nodes.find((n) => n.id === edge.fromNodeId);
                  const to = visualGraph.nodes.find((n) => n.id === edge.toNodeId);
                  if (!from || !to) return null;
                  const x1 = from.x + 210;
                  const y1 = from.y + 34;
                  const x2 = to.x;
                  const y2 = to.y + 34;
                  const cx1 = x1 + 65;
                  const cx2 = x2 - 65;
                  return (
                    <path
                      key={edge.id}
                      d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth={2.4}
                      strokeOpacity={0.8}
                    />
                  );
                })}
              </svg>

              {/* Draggable Blueprint Nodes with Live Hot-Reload Sliders */}
              {visualGraph.nodes.map((node) => (
                <div
                  key={node.id}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className="absolute w-52 rounded-xl bg-[#0f1626]/95 border border-slate-700/90 shadow-xl text-xs overflow-hidden"
                >
                  <div
                    onPointerDown={(e) => {
                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                      setDraggingNodeId(node.id);
                      setDragOffset({
                        dx: e.clientX - rect.left,
                        dy: e.clientY - rect.top,
                      });
                    }}
                    className={`px-2.5 py-1.5 font-bold text-[11px] cursor-grab active:cursor-grabbing flex items-center justify-between ${
                      node.category === 'event'
                        ? 'bg-gradient-to-r from-rose-600/80 to-orange-600/60 text-white'
                        : 'bg-gradient-to-r from-cyan-600/75 to-purple-600/75 text-white'
                    }`}
                  >
                    <span className="truncate">{node.title}</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 shadow" />
                  </div>

                  <div className="p-2.5 space-y-1.5">
                    {Object.entries(node.params).map(([k, v]) => (
                      <div key={k} className="text-[10px]">
                        {typeof v === 'number' ? (
                          <>
                            <div className="flex justify-between text-slate-400 mb-0.5">
                              <span>{k}</span>
                              <span className="font-mono-code text-cyan-300">{v}</span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={k === 'speedDeg' ? 360 : 12}
                              step={k === 'speedDeg' ? 5 : 0.1}
                              value={v}
                              onChange={(e) =>
                                updateBlueprintParam(node.id, k, parseFloat(e.target.value))
                              }
                              className="w-full accent-cyan-400 h-1"
                            />
                          </>
                        ) : (
                          <div className="flex justify-between text-slate-300">
                            <span className="text-slate-500">{k}:</span>
                            <span className="font-mono-code text-purple-300">{String(v)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex min-h-0 bg-[#080c14] font-mono-code text-xs">
              {/* Line Numbers Gutter */}
              <div className="w-11 py-2.5 px-2 text-right text-slate-600 bg-[#060910] border-r border-slate-800/80 select-none overflow-hidden">
                {codeDraft.split('\n').map((_, i) => (
                  <div key={i} className="leading-5 text-[11px]">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Monaco-style Code Surface */}
              <textarea
                value={codeDraft}
                onChange={(e) => setCodeDraft(e.target.value)}
                spellCheck={false}
                className="flex-1 bg-transparent p-2.5 text-[12px] leading-5 text-cyan-100 focus:outline-none resize-none overflow-y-auto"
              />

              {/* API Quick Reference Sidebar */}
              <div className="w-60 border-l border-slate-800/80 p-2.5 bg-[#0a0f1a] hidden md:block overflow-y-auto font-sans">
                <div className="text-[10px] font-bold uppercase text-purple-300 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Aether Engine SDK API
                </div>
                <div className="space-y-1.5 text-[10px] text-slate-400">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <code className="text-cyan-300">entity.position.x / y / z</code>
                    <div>Koordinat dunia objek real-time</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <code className="text-cyan-300">entity.velocity.y = 8.5</code>
                    <div>Impuls vertikal RigidBody Wasm</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <code className="text-cyan-300">input.keys[&apos;Space&apos;]</code>
                    <div>Deteksi tombol keyboard / touch</div>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    <code className="text-cyan-300">world.getPlayer()</code>
                    <div>Referensi ke karakter pemain</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: ANIMATION TIMELINE, STATE MACHINE & 3D SPATIAL AUDIO MIXER */}
      {/* ================================================================= */}
      {activeTab === 'anim_audio' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* LEFT: Keyframe Timeline + Character State Machine Animator */}
          <div className="p-3 flex flex-col justify-between overflow-y-auto space-y-2.5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleTimelinePlay}
                    className="px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center gap-1"
                  >
                    {isTimelinePlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isTimelinePlaying ? 'Pause Clip' : 'Preview Clip'}
                  </button>
                  <span className="font-mono-code text-slate-300">
                    {timelineTime.toFixed(2)}s / 5.00s
                  </span>
                </div>
                <button
                  onClick={onAddKeyframe}
                  className="px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[11px] flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Keyframe
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={5}
                step={0.05}
                value={timelineTime}
                onChange={(e) => onChangeTimelineTime(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 mb-2"
              />

              {/* Tracks */}
              <div className="space-y-1.5">
                {animationTracks.map((trk) => (
                  <div
                    key={trk.id}
                    className="bg-[#090d16] border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-3"
                  >
                    <span className="w-36 truncate text-[11px] text-slate-300 font-mono-code">
                      {trk.property}
                    </span>
                    <div className="relative flex-1 h-4 bg-slate-900 rounded">
                      {trk.keyframes.map((kf, idx) => (
                        <div
                          key={idx}
                          title={`${kf.time}s -> ${kf.value}`}
                          style={{ left: `${(kf.time / 5) * 100}%` }}
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-cyan-400 border border-slate-950"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* State Machine Animator Graph: Idle -> Walk -> Run -> Jump */}
            <div className="bg-[#090d16] border border-slate-800 rounded-xl p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-purple-300 mb-2">
                State Machine Animator (Cross-Fade Blending + Foot/Head IK)
              </div>
              <div className="flex items-center justify-between gap-1 text-[11px]">
                {(['Idle', 'Walk', 'Run', 'Jump'] as const).map((st, idx) => (
                  <React.Fragment key={st}>
                    <div className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-cyan-500/30 text-center font-semibold text-cyan-200">
                      {st}
                    </div>
                    {idx < 3 && <span className="text-slate-500">➔</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Web Audio API 3D Spatial Sound Mixer */}
          <div className="p-3 flex flex-col justify-between overflow-y-auto space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" /> Web Audio 3D Spatial Mixer (HRTF + Doppler)
              </span>
              <select
                value={reverb}
                onChange={(e) => {
                  const r = e.target.value as ReverbPreset;
                  setReverb(r);
                  spatialAudio.applyReverbPreset(r);
                }}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-purple-200"
              >
                <option value="cyber_alley">Reverb: Cyber Alley</option>
                <option value="cathedral">Reverb: Ancient Cathedral</option>
                <option value="small_room">Reverb: Small Room</option>
                <option value="open_field">Reverb: Open Field</option>
                <option value="none">Dry (No Reverb)</option>
              </select>
            </div>

            {/* Channel Faders + Live Spectrum VU */}
            <div className="grid grid-cols-4 gap-2 items-center bg-[#090d16] border border-slate-800 rounded-xl p-2.5">
              {[
                { label: 'Master', val: masterVol, set: (v: number) => { setMasterVol(v); spatialAudio.setVolumes({ master: v }); } },
                { label: '3D SFX', val: sfxVol, set: (v: number) => { setSfxVol(v); spatialAudio.setVolumes({ sfx: v }); } },
                { label: 'Ambience', val: ambVol, set: (v: number) => { setAmbVol(v); spatialAudio.setVolumes({ ambience: v }); } },
              ].map((ch) => (
                <div key={ch.label} className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{ch.label}</span>
                    <span>{Math.round(ch.val * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={ch.val}
                    onChange={(e) => ch.set(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              ))}

              {/* Live Spectrum Analyzer Bars */}
              <div className="h-10 flex items-end gap-1 px-2 bg-slate-950 rounded-lg border border-slate-800 py-1">
                {vuBars.map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${Math.max(12, h)}%` }}
                    className="flex-1 rounded-t bg-gradient-to-t from-emerald-400 via-cyan-400 to-purple-500 transition-all duration-100"
                  />
                ))}
              </div>
            </div>

            {/* Spatial Sound Test Pads */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => {
                  const next = spatialAudio.toggleSpatialBeacon(!beaconOn, [0, 2, 0]);
                  setBeaconOn(next);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                  beaconOn
                    ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {beaconOn ? '🔊 3D Shrine Drone: ON' : '🔈 Start 3D Spatial Drone'}
              </button>
              <button
                onClick={() => spatialAudio.playSpatialSfx('crystal', [-3, 1, 0], 4)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-cyan-300"
              >
                Test Left (-3m)
              </button>
              <button
                onClick={() => spatialAudio.playSpatialSfx('laser', [3, 1, 0], -4)}
                className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-purple-300"
              >
                Test Right (+3m Doppler)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: CONSOLE & REAL-TIME PERFORMANCE PROFILER                   */}
      {/* ================================================================= */}
      {activeTab === 'console_profiler' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Console Output (7 cols) */}
          <div className="lg:col-span-7 flex flex-col min-h-0 text-xs">
            <div className="px-3 py-1 bg-[#090d16] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-cyan-400 mr-1" />
                {(['all', 'ai', 'wasm', 'collab', 'error'] as const).map((lf) => (
                  <button
                    key={lf}
                    onClick={() => setLogFilter(lf)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                      logFilter === lf
                        ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lf}
                  </button>
                ))}
              </div>
              <button
                onClick={onClearLogs}
                className="text-slate-500 hover:text-slate-300 p-1"
                title="Clear Console"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono-code text-[11px] bg-[#060911]">
              {logs
                .filter((l) => logFilter === 'all' || l.level === logFilter)
                .map((l) => (
                  <div key={l.id} className="flex items-start gap-2 leading-snug">
                    <span className="text-slate-600 shrink-0">{l.timestamp}</span>
                    <span
                      className={`px-1.5 rounded text-[9px] uppercase font-bold shrink-0 ${
                        l.level === 'error'
                          ? 'bg-rose-500/20 text-rose-300'
                          : l.level === 'ai'
                          ? 'bg-purple-500/20 text-purple-300'
                          : l.level === 'wasm'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : l.level === 'collab'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyan-500/15 text-cyan-300'
                      }`}
                    >
                      {l.source}
                    </span>
                    <span className="text-slate-200 break-all">{l.message}</span>
                  </div>
                ))}
            </div>

            <div className="px-2 py-1 bg-[#090d16] border-t border-slate-800 flex items-center gap-2">
              <span className="text-cyan-400 font-mono-code text-xs">&gt;</span>
              <input
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cmdInput.trim()) {
                    onConsoleCommand(cmdInput.trim());
                    setCmdInput('');
                  }
                }}
                placeholder="Ketik perintah engine (/bench, /spawn cube, /status)..."
                className="flex-1 bg-transparent text-xs font-mono-code text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Performance Profiler Gauges & Sparkline (5 cols) */}
          <div className="lg:col-span-5 p-3 overflow-y-auto space-y-2.5 bg-[#090d16]">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">Frame Rate</div>
                <div className="text-base font-bold font-mono-code text-emerald-400">
                  {latestSample.fps} FPS
                </div>
                <div className="text-[10px] text-slate-500">{latestSample.frameTimeMs} ms</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">Heap / OPFS</div>
                <div className="text-base font-bold font-mono-code text-cyan-300">
                  {latestSample.memoryMb} MB
                </div>
                <div className="text-[10px] text-slate-500">{latestSample.physicsBodies} Bodies</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="text-[10px] text-slate-400">Wasm Solver</div>
                <div className="text-base font-bold font-mono-code text-purple-300">
                  {latestSample.wasmStepUs} µs
                </div>
                <div className="text-[10px] text-slate-500">{latestSample.drawCalls} Draws</div>
              </div>
            </div>

            {/* Live FPS History Bars */}
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1.5">
                <span>Real-Time Frame Telemetry (60Hz Target)</span>
                <span className="text-emerald-400">WebGPU / PBR Pipeline</span>
              </div>
              <div className="h-14 flex items-end gap-1">
                {(profilerHistory.length > 0 ? profilerHistory.slice(-28) : [latestSample]).map(
                  (s, idx) => (
                    <div
                      key={idx}
                      style={{ height: `${Math.min(100, Math.max(15, (s.fps / 75) * 100))}%` }}
                      className="flex-1 rounded-t bg-gradient-to-t from-cyan-500/50 to-emerald-400"
                    />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
