import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  Square,
  Globe,
  Smartphone,
  Glasses,
  GitBranch,
  Cloud,
  QrCode,
  Rocket,
  Settings,
  LayoutGrid,
  ChevronDown,
  Users,
  Plus,
  Download,
  Save,
  RotateCcw,
  Share2,
  Command,
} from 'lucide-react';
import type {
  CollaboratorPresence,
  PostProcessingConfig,
  SimState,
  TargetPlatform,
} from '../types/engine';

interface TopBarProps {
  projectName: string;
  onRenameProject: (name: string) => void;
  onGoDashboard: () => void;
  currentBranch: string;
  onOpenVisualGit: () => void;
  cloudStatusText: string;
  onManualSave: () => void;
  simState: SimState;
  onPlayToggle: () => void;
  onPauseToggle: () => void;
  onStepFrame: () => void;
  targetPlatform: TargetPlatform;
  onChangeTargetPlatform: (p: TargetPlatform) => void;
  collaborators: CollaboratorPresence[];
  simulatedCollabActive: boolean;
  onToggleSimulatedCollab: () => void;
  followPeerId: string | null;
  onFollowPeer: (peerId: string | null) => void;
  onOpenMobileQR: () => void;
  onOpenShare: () => void;
  onOpenCommandPalette: () => void;
  onOpenPublishExport: () => void;
  onQuickSpawn: (kind: 'box' | 'sphere' | 'crystal' | 'cyber_drone' | 'light' | 'particle' | 'sprite2d') => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onResetDockLayout: () => void;
  postProcessing: PostProcessingConfig;
  onUpdatePostProcessing: (patch: Partial<PostProcessingConfig>) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  projectName,
  onRenameProject,
  onGoDashboard,
  currentBranch,
  onOpenVisualGit,
  cloudStatusText,
  onManualSave,
  simState,
  onPlayToggle,
  onPauseToggle,
  onStepFrame,
  targetPlatform,
  onChangeTargetPlatform,
  collaborators,
  simulatedCollabActive,
  onToggleSimulatedCollab,
  followPeerId,
  onFollowPeer,
  onOpenMobileQR,
  onOpenShare,
  onOpenCommandPalette,
  onOpenPublishExport,
  onQuickSpawn,
  onDuplicateSelected,
  onDeleteSelected,
  onResetDockLayout,
  postProcessing,
  onUpdatePostProcessing,
}) => {
  const [openMenu, setOpenMenu] = useState<'file' | 'edit' | 'assets' | 'settings' | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);

  const closeMenus = () => setOpenMenu(null);

  return (
    <header className="h-12 bg-[#0b101b] border-b border-slate-800/90 px-3 flex items-center justify-between gap-2 z-40 shrink-0">
      {/* LEFT SECTION: Logo, Menus, Cloud OPFS Status, Git Branch */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onGoDashboard}
          title="Kembali ke Dashboard Proyek & Template"
          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-800/80 transition group"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <span className="font-black text-xs text-slate-950">AE</span>
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold tracking-tight bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent leading-none">
              AetherEngine
            </div>
            <div className="text-[9px] text-slate-400 tracking-wider uppercase mt-0.5">
              Studio v1.0
            </div>
          </div>
        </button>

        {/* Project Name inline editable */}
        {editingTitle ? (
          <input
            autoFocus
            value={projectName}
            onChange={(e) => onRenameProject(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
            className="bg-slate-900 border border-cyan-500/60 rounded px-2 py-0.5 text-xs text-white w-36 focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setEditingTitle(true)}
            title="Klik untuk mengubah nama proyek"
            className="text-xs font-semibold text-slate-200 hover:text-cyan-300 truncate max-w-[140px] px-1.5 py-0.5 rounded hover:bg-slate-800/60"
          >
            {projectName}
          </button>
        )}

        {/* Dropdown Menus: File / Edit / Assets */}
        <div className="relative hidden lg:flex items-center gap-0.5 text-xs text-slate-300">
          {/* FILE */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'file' ? null : 'file')}
              className="px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1"
            >
              File <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {openMenu === 'file' && (
              <div
                onMouseLeave={closeMenus}
                className="absolute left-0 top-full mt-1 w-52 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs"
              >
                <button
                  onClick={() => { onGoDashboard(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" /> Dashboard & Templates
                </button>
                <button
                  onClick={() => { onManualSave(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" /> Save to OPFS & Cloud
                </button>
                <button
                  onClick={() => { onOpenPublishExport(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" /> Multi-Platform Export...
                </button>
              </div>
            )}
          </div>

          {/* EDIT */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'edit' ? null : 'edit')}
              className="px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1"
            >
              Edit <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {openMenu === 'edit' && (
              <div
                onMouseLeave={closeMenus}
                className="absolute left-0 top-full mt-1 w-52 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs"
              >
                <button
                  onClick={() => { onOpenCommandPalette(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center justify-between text-cyan-300"
                >
                  <span className="flex items-center gap-2"><Command className="w-3.5 h-3.5" /> Command Palette</span>
                  <span className="text-slate-500">Ctrl+K</span>
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => { onDuplicateSelected(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex justify-between"
                >
                  <span>Duplicate Selected</span>
                  <span className="text-slate-500">Ctrl+D</span>
                </button>
                <button
                  onClick={() => { onDeleteSelected(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 text-rose-400 flex justify-between"
                >
                  <span>Delete Selected</span>
                  <span className="text-slate-500">Del</span>
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={() => { onResetDockLayout(); closeMenus(); }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-cyan-400" /> Reset Docking Layout
                </button>
              </div>
            )}
          </div>

          {/* ASSETS / SPAWN */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'assets' ? null : 'assets')}
              className="px-2 py-1 rounded hover:bg-slate-800 flex items-center gap-1"
            >
              Assets <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {openMenu === 'assets' && (
              <div
                onMouseLeave={closeMenus}
                className="absolute left-0 top-full mt-1 w-56 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs"
              >
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">
                  Quick Spawn Node
                </div>
                {[
                  { k: 'box', label: '3D PBR Physics Cube' },
                  { k: 'sphere', label: '3D Metallic Sphere' },
                  { k: 'crystal', label: 'Arcane Crystal Mesh' },
                  { k: 'cyber_drone', label: 'Cyber Companion Drone' },
                  { k: 'light', label: 'Point Light (Dynamic GI)' },
                  { k: 'particle', label: 'GPU Particle Emitter (20K)' },
                  { k: 'sprite2d', label: '2D Hybrid Neon Sprite' },
                ].map((item) => (
                  <button
                    key={item.k}
                    onClick={() => {
                      onQuickSpawn(item.k as any);
                      closeMenus();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" /> {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cloud + OPFS Status */}
        <button
          onClick={onManualSave}
          title="Klik untuk memaksa sinkronisasi OPFS & Cloud R2"
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 hover:border-emerald-500/40 transition"
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span>{cloudStatusText}</span>
        </button>

        {/* Visual Git Branch Badge */}
        <button
          onClick={onOpenVisualGit}
          title="Built-in Visual Version Control (Snapshot, Branch & Visual Scene Diff)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/40 hover:bg-purple-500/25 text-purple-200 text-[11px] font-medium transition"
        >
          <GitBranch className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-mono-code">{currentBranch}</span>
        </button>
      </div>

      {/* CENTER SECTION: Simulation Controls (Play, Pause, Step Frame) + Target Preview */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-[#070a12] border border-slate-800 rounded-xl p-1 gap-1 shadow-inner">
          <button
            onClick={onPlayToggle}
            title={simState === 'stopped' ? 'Play Simulation in Browser' : 'Stop & Restore Scene'}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              simState !== 'stopped'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 hover:bg-rose-500/30'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-500/30 neon-cyan-glow'
            }`}
          >
            {simState !== 'stopped' ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" /> Stop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Play
              </>
            )}
          </button>

          <button
            onClick={onPauseToggle}
            disabled={simState === 'stopped'}
            title="Pause / Resume Simulation"
            className={`p-1.5 rounded-lg transition ${
              simState === 'paused'
                ? 'bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/50'
                : simState === 'playing'
                ? 'text-slate-300 hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onStepFrame}
            disabled={simState === 'stopped'}
            title="Step Single Physics/Logic Frame (1/60s)"
            className={`p-1.5 rounded-lg transition ${
              simState !== 'stopped'
                ? 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Target Preview Selector (Web, Mobile, VR) */}
        <div className="hidden md:flex items-center bg-[#070a12] border border-slate-800 rounded-xl p-1 gap-0.5 text-[11px]">
          {[
            { id: 'web', label: 'Web', icon: Globe },
            { id: 'mobile', label: 'Mobile', icon: Smartphone },
            { id: 'vr', label: 'VR', icon: Glasses },
          ].map((t) => {
            const Icon = t.icon;
            const active = targetPlatform === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChangeTargetPlatform(t.id as TargetPlatform)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                  active
                    ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-500/40 font-medium'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT SECTION: Collaborator Avatars, Test on Mobile QR, Publish/Export, Editor Settings */}
      <div className="flex items-center gap-2">
        {/* Active Collaborators */}
        <div className="hidden sm:flex items-center -space-x-1.5 mr-1">
          <div
            title="You (Lead Developer) — Online via CRDT"
            className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold text-[11px] flex items-center justify-center ring-2 ring-[#0b101b] z-10"
          >
            YOU
          </div>
          {collaborators.map((c) => {
            const following = followPeerId === c.peerId;
            return (
              <button
                key={c.peerId}
                onClick={() => onFollowPeer(following ? null : c.peerId)}
                title={`${c.name} (${c.role}) — Klik untuk ${following ? 'Berhenti Follow' : 'Follow Kursor 3D'}`}
                style={{ backgroundColor: c.color }}
                className={`w-7 h-7 rounded-full text-slate-950 font-bold text-[10px] flex items-center justify-center ring-2 transition transform hover:scale-110 hover:z-20 ${
                  following ? 'ring-white scale-110 z-20' : 'ring-[#0b101b]'
                }`}
              >
                {c.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </button>
            );
          })}
          <button
            onClick={onToggleSimulatedCollab}
            title={
              simulatedCollabActive
                ? 'Matikan Simulasi Rekan Kolaborator 3D'
                : 'Aktifkan Simulasi Rekan Kolaborator 3D'
            }
            className={`w-7 h-7 rounded-full border border-slate-700 flex items-center justify-center text-[10px] ml-2 transition ${
              simulatedCollabActive
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Instant Live-Testing on Mobile (QR Code) */}
        <button
          onClick={onOpenMobileQR}
          title="Instant Live-Testing di HP lewat QR Code (Real-time CRDT Sync)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-cyan-300 font-medium transition"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Test on Mobile</span>
        </button>

        {/* Real-time collaboration invite */}
        <button
          onClick={onOpenShare}
          title="Share Workspace — undang editor atau playtester lewat live link"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/35 text-xs text-purple-200 font-medium transition"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">Share</span>
        </button>

        {/* Publish & Multi-Platform Export */}
        <button
          onClick={onOpenPublishExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition"
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>Publish</span>
        </button>

        {/* Editor & Renderer Settings Popover */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}
            title="Pengaturan Editor, WebGPU & Post-Processing"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <Settings className="w-4 h-4" />
          </button>

          {openMenu === 'settings' && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-100">Engine & Post-Processing</span>
                <button onClick={closeMenus} className="text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Graphics Backend</span>
                <select
                  value={postProcessing.renderBackend}
                  onChange={(e) =>
                    onUpdatePostProcessing({ renderBackend: e.target.value as 'webgpu' | 'webgl2' })
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-cyan-300"
                >
                  <option value="webgpu">WebGPU (Auto Fallback)</option>
                  <option value="webgl2">WebGL2 Compatibility</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sky & GI Environment</span>
                <select
                  value={postProcessing.skyPreset}
                  onChange={(e) =>
                    onUpdatePostProcessing({ skyPreset: e.target.value as PostProcessingConfig['skyPreset'] })
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="cyber_night">Cyber Night</option>
                  <option value="sunset_horizon">Sunset Horizon</option>
                  <option value="daylight_clear">Daylight Clear</option>
                  <option value="studio_dark">Studio Dark</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">Color Grading LUT</span>
                <select
                  value={postProcessing.colorGrading}
                  onChange={(e) =>
                    onUpdatePostProcessing({
                      colorGrading: e.target.value as PostProcessingConfig['colorGrading'],
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-purple-300"
                >
                  <option value="cyberpunk">Cyberpunk Neon</option>
                  <option value="aces_filmic">ACES Filmic</option>
                  <option value="warm_fantasy">Warm Fantasy</option>
                  <option value="noir_contrast">Noir Contrast</option>
                </select>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-800">
                {[
                  { key: 'bloomEnabled', label: 'Unreal Bloom HDR' },
                  { key: 'ssaoEnabled', label: 'Ambient Occlusion (SSAO)' },
                  { key: 'motionBlurEnabled', label: 'Velocity Motion Blur' },
                  { key: 'dofEnabled', label: 'Bokeh Depth of Field' },
                ].map((fx) => (
                  <label key={fx.key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">{fx.label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(postProcessing[fx.key as keyof PostProcessingConfig])}
                      onChange={(e) =>
                        onUpdatePostProcessing({ [fx.key]: e.target.checked } as Partial<PostProcessingConfig>)
                      }
                      className="accent-cyan-400"
                    />
                  </label>
                ))}
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Bloom Intensity</span>
                  <span>{postProcessing.bloomStrength.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={postProcessing.bloomStrength}
                  onChange={(e) => onUpdatePostProcessing({ bloomStrength: Number(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
