import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Box,
  Check,
  ChevronRight,
  Clock3,
  Cloud,
  Code2,
  Gamepad2,
  GitBranch,
  Globe,
  HardDrive,
  Heart,
  Layers3,
  LayoutDashboard,
  Library,
  Play,
  Plus,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { COMMUNITY_SHOWCASE, GAME_TEMPLATES, type GameTemplateBundle } from '../engine/templates';
import type { SavedProjectPayload } from '../engine/opfsStorage';

interface DashboardViewProps {
  savedProjects: SavedProjectPayload[];
  onOpenSavedProject: (project: SavedProjectPayload) => void;
  onOpenTemplate: (templateId: string, customName?: string) => void;
  onCreateBlank: () => void;
  opfsInfo: { opfsSupported: boolean; usageMb: number; quotaMb: number };
}

type DashboardSection = 'overview' | 'projects' | 'templates' | 'community';

const templateById = (id: string) => GAME_TEMPLATES.find((t) => t.id === id) || GAME_TEMPLATES[0];

const TemplateArtwork: React.FC<{ template: GameTemplateBundle; className?: string }> = ({
  template,
  className = '',
}) => {
  const gid = `g-${template.id}`;
  const glow = `glow-${template.id}`;
  return (
    <svg
      viewBox="0 0 480 260"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-label={`${template.name} scene preview`}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={template.accentFrom} />
          <stop offset="1" stopColor={template.accentTo} />
        </linearGradient>
        <radialGradient id={glow} cx="50%" cy="45%" r="65%">
          <stop offset="0" stopColor={template.accentFrom} stopOpacity=".24" />
          <stop offset="1" stopColor="#070b14" stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${template.id}`}>
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="480" height="260" fill="#080d18" />
      <rect width="480" height="260" fill={`url(#${glow})`} />
      <circle cx="240" cy="145" r="80" fill={template.accentTo} opacity=".08" filter={`url(#blur-${template.id})`} />

      {/* Perspective world grid */}
      <g stroke={template.accentFrom} strokeOpacity=".12" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={`h-${i}`} d={`M ${50 - i * 14} ${210 + i * 9} H ${430 + i * 14}`} />
        ))}
        {[-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={`v-${i}`} d={`M ${240 + i * 28} 160 L ${240 + i * 65} 280`} />
        ))}
      </g>

      {template.id === 'tpl-3d-rpg' && (
        <g>
          <path d="M70 192 L240 126 L410 192 L240 250 Z" fill="#111c30" stroke="#22d3ee" strokeOpacity=".24" />
          <path d="M115 190 L240 143 L365 190 L240 232 Z" fill="#15243a" stroke={template.accentFrom} strokeOpacity=".38" />
          <ellipse cx="240" cy="193" rx="65" ry="20" fill={template.accentTo} opacity=".18" />
          <path d="M240 63 L279 117 L256 187 L224 187 L201 117 Z" fill={`url(#${gid})`} opacity=".9" />
          <path d="M240 63 L240 187 L201 117 Z" fill="#d8b4fe" opacity=".35" />
          <path d="M240 63 L279 117 L240 133 Z" fill="#67e8f9" opacity=".52" />
          <path d="M201 117 L240 133 L224 187 Z" fill="#7c3aed" opacity=".72" />
          <g fill="#24334a" stroke="#64748b" strokeOpacity=".5">
            <path d="M116 103 h24 l7 83 h-38 z" />
            <path d="M340 103 h24 l7 83 h-38 z" />
          </g>
          <g fill={template.accentFrom}>
            <circle cx="128" cy="100" r="4" /><circle cx="352" cy="100" r="4" />
          </g>
          <g stroke={template.accentFrom} strokeOpacity=".4" fill="none">
            <ellipse cx="240" cy="131" rx="102" ry="35" strokeDasharray="4 8" />
            <ellipse cx="240" cy="131" rx="127" ry="45" strokeDasharray="2 12" />
          </g>
        </g>
      )}

      {template.id === 'tpl-cyber-fps' && (
        <g>
          <path d="M48 201 L240 133 L432 201 L240 258 Z" fill="#101a2d" stroke="#06b6d4" strokeOpacity=".32" />
          <g opacity=".8">
            <path d="M85 84 h62 l14 108 H73 Z" fill="#17243a" stroke="#164e63" />
            <path d="M333 69 h65 l16 126 H318 Z" fill="#1b1935" stroke="#701a75" />
            <path d="M96 103 h38 M91 125 h48 M345 94 h39 M341 119 h49" stroke={template.accentFrom} strokeOpacity=".7" strokeWidth="3" />
          </g>
          <path d="M186 182 h108 l-17 28 h-74 z" fill="#263449" />
          <path d="M216 133 h48 l13 58 h-74 z" fill={`url(#${gid})`} opacity=".82" />
          <rect x="230" y="93" width="20" height="57" rx="7" fill="#334155" stroke="#fb7185" />
          <path d="M240 102 L325 77" stroke="#fb7185" strokeWidth="13" strokeLinecap="round" />
          <path d="M240 102 L325 77" stroke="#fecdd3" strokeWidth="3" strokeLinecap="round" />
          <circle cx="240" cy="102" r="19" fill="#1e293b" stroke="#fb7185" strokeWidth="3" />
          <path d="M315 75 L430 44" stroke="#f43f5e" strokeOpacity=".35" strokeWidth="2" strokeDasharray="7 7" />
          <circle cx="326" cy="77" r="6" fill="#fff" /><circle cx="326" cy="77" r="18" fill="#f43f5e" opacity=".15" />
        </g>
      )}

      {template.id === 'tpl-2d-platformer' && (
        <g>
          <rect x="40" y="196" width="400" height="30" rx="4" fill="#134e4a" stroke={template.accentFrom} strokeOpacity=".7" />
          <rect x="76" y="139" width="118" height="14" rx="4" fill="#7c3aed" /><rect x="76" y="153" width="118" height="5" fill="#a855f7" opacity=".45" />
          <rect x="294" y="106" width="112" height="14" rx="4" fill="#0e7490" /><rect x="294" y="120" width="112" height="5" fill="#00f0ff" opacity=".5" />
          <g transform="translate(220 126)">
            <circle cx="20" cy="10" r="12" fill="#a7f3d0" />
            <path d="M10 24 h22 l8 43 H3 Z" fill={`url(#${gid})`} />
            <path d="M8 65 L0 91 M32 65 L43 91 M8 32 L-11 53 M32 32 L54 43" stroke="#34d399" strokeWidth="9" strokeLinecap="round" />
          </g>
          <g fill="#facc15" stroke="#fef08a" strokeWidth="2">
            <circle cx="135" cy="115" r="11" /><circle cx="350" cy="79" r="11" /><circle cx="385" cy="79" r="11" />
          </g>
          <path d="M52 66 H428" stroke="#34d399" strokeOpacity=".15" strokeDasharray="3 8" />
        </g>
      )}

      {template.id === 'tpl-drift-racing' && (
        <g>
          <circle cx="376" cy="62" r="36" fill="#fb923c" opacity=".75" /><circle cx="376" cy="62" r="58" fill="#f97316" opacity=".09" />
          <path d="M20 225 Q140 135 250 198 T480 164 V260 H0 Z" fill="#1e293b" />
          <path d="M-10 238 Q140 145 260 210 T500 177" fill="none" stroke="#64748b" strokeWidth="30" />
          <path d="M-10 238 Q140 145 260 210 T500 177" fill="none" stroke="#facc15" strokeOpacity=".55" strokeWidth="2" strokeDasharray="14 14" />
          <g transform="translate(154 120)">
            <path d="M19 44 L48 13 H129 L169 44 L186 52 V80 H0 V57 Z" fill={`url(#${gid})`} />
            <path d="M55 19 H122 L147 43 H34 Z" fill="#172554" stroke="#7dd3fc" strokeOpacity=".6" />
            <path d="M17 52 H168" stroke="#fed7aa" strokeOpacity=".55" strokeWidth="3" />
            <rect x="-4" y="72" width="194" height="11" rx="5" fill="#0f172a" />
            <circle cx="37" cy="79" r="22" fill="#090d16" stroke="#475569" strokeWidth="7" /><circle cx="150" cy="79" r="22" fill="#090d16" stroke="#475569" strokeWidth="7" />
            <path d="M10 88 H178" stroke="#00f0ff" strokeWidth="5" /><path d="M10 88 H178" stroke="#00f0ff" strokeWidth="18" opacity=".12" />
          </g>
        </g>
      )}
      <rect x="14" y="14" width="82" height="22" rx="11" fill="#020617" fillOpacity=".65" stroke={template.accentFrom} strokeOpacity=".3" />
      <circle cx="28" cy="25" r="3" fill={template.accentFrom} />
      <text x="38" y="29" fill="#cbd5e1" fontSize="10" fontFamily="system-ui" letterSpacing="1">LIVE SCENE</text>
    </svg>
  );
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  savedProjects,
  onOpenSavedProject,
  onOpenTemplate,
  onCreateBlank,
  opfsInfo,
}) => {
  const [section, setSection] = useState<DashboardSection>('overview');
  const [search, setSearch] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const filteredTemplates = useMemo(
    () =>
      GAME_TEMPLATES.filter(
        (t) =>
          !search.trim() ||
          `${t.name} ${t.genre} ${t.badges.join(' ')}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const filteredSaved = useMemo(
    () => savedProjects.filter((p) => p.meta.name.toLowerCase().includes(search.toLowerCase())),
    [savedProjects, search],
  );

  const showTemplates = section === 'overview' || section === 'templates';
  const showCommunity = section === 'overview' || section === 'community';
  const showProjects = section === 'overview' || section === 'projects';

  const navItems: { id: DashboardSection; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'My Projects', icon: Layers3 },
    { id: 'templates', label: 'Templates', icon: Library },
    { id: 'community', label: 'Community', icon: Globe },
  ];

  return (
    <div className="h-screen bg-[#080c15] text-slate-200 overflow-y-auto overflow-x-hidden">
      {/* Dashboard top navigation */}
      <header className="h-16 px-4 lg:px-8 border-b border-slate-800/70 bg-[#0b101b]/90 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between gap-5">
        <div className="flex items-center gap-8 min-w-0">
          <button onClick={() => setSection('overview')} className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/15">
              <span className="font-black text-sm text-slate-950">AE</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-bold tracking-tight text-white">AetherEngine <span className="text-cyan-300">Studio</span></div>
              <div className="text-[9px] uppercase tracking-[.2em] text-slate-500">Create without limits</div>
            </div>
          </button>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                  section === item.id ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <div className="relative hidden xl:block">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, templates..."
              className="w-60 bg-[#080d17] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-300">
            <Cloud className="w-3.5 h-3.5" /> Cloud synced
          </div>
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg relative" title="Notifications">
            <Bell className="w-4 h-4" /><span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </button>
          <button className="hidden sm:block p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg" title="Editor preferences">
            <Settings2 className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-300 to-purple-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-[#111827] flex items-center justify-center text-[10px] font-bold text-white">DP</div>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1800px] mx-auto">
        {/* Slim workspace rail */}
        <aside className="w-56 border-r border-slate-800/60 min-h-[calc(100vh-64px)] p-4 hidden lg:flex flex-col shrink-0">
          <div className="text-[10px] uppercase tracking-[.18em] text-slate-600 font-semibold px-3 mb-2">Workspace</div>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition ${
                    section === item.id ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {item.label}
                  {item.id === 'projects' && <span className="ml-auto text-[10px] text-slate-600">{savedProjects.length}</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={onCreateBlank}
            className="mt-5 mx-1 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-cyan-500/50 text-xs text-slate-400 hover:text-cyan-300 flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Blank project
          </button>

          <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-b from-[#111a2b] to-[#0b101b] border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <HardDrive className="w-4 h-4 text-purple-300" />
              <span className="text-[9px] uppercase tracking-wider text-emerald-300">{opfsInfo.opfsSupported ? 'OPFS active' : 'IndexedDB'}</span>
            </div>
            <div className="text-xs font-semibold text-slate-200">Local asset cache</div>
            <div className="text-[10px] text-slate-500 mt-1">{opfsInfo.usageMb.toFixed(1)} MB of {Math.round(opfsInfo.quotaMb / 1024)} GB</div>
            <div className="h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div className="h-full w-[8%] bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full" />
            </div>
            <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">Aset besar tetap tersimpan lokal. Tidak perlu unduh ulang.</p>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-10">
          {/* Search on smaller screens */}
          <div className="relative xl:hidden">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari proyek atau template..."
              className="w-full bg-[#0e1421] border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {section === 'overview' && (
            <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-[#0d1524] min-h-[290px] flex items-center shadow-2xl shadow-cyan-950/10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(168,85,247,.18),transparent_40%),radial-gradient(circle_at_35%_100%,rgba(0,240,255,.09),transparent_45%)]" />
              <div className="absolute inset-y-0 right-0 w-[55%] opacity-80 hidden md:block">
                <TemplateArtwork template={GAME_TEMPLATES[0]} className="w-full h-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0d1524] via-[#0d1524]/30 to-transparent" />
              </div>
              <div className="relative z-10 p-7 sm:p-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-[10px] font-semibold tracking-wider text-cyan-300 uppercase mb-5">
                  <Sparkles className="w-3.5 h-3.5" /> The browser-native game engine
                </div>
                <h1 className="text-3xl sm:text-4xl xl:text-5xl font-bold tracking-tight text-white leading-[1.08]">
                  Build your world.<br />
                  <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-purple-400 bg-clip-text text-transparent">Together, in real time.</span>
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed mt-4 max-w-lg">
                  Build, collaborate, and publish games directly from your browser. Tanpa instalasi, tanpa build time — dari ide pertama ke pemain pertama.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-7">
                  <button
                    onClick={() => onOpenTemplate('tpl-3d-rpg')}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4" /> Create new project <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSection('templates')}
                    className="px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
                  >
                    <Play className="w-4 h-4 text-purple-300" /> Explore templates
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-6 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> WebGPU + Wasm</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Real-time CRDT</span>
                  <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> One-click publish</span>
                </div>
              </div>
            </section>
          )}

          {section !== 'overview' && (
            <div className="pt-2">
              <div className="text-[10px] uppercase tracking-[.2em] text-cyan-400 font-semibold mb-2">Aether workspace</div>
              <h1 className="text-3xl font-bold text-white">{navItems.find((n) => n.id === section)?.label}</h1>
              <p className="text-sm text-slate-500 mt-2">Semua yang Anda butuhkan untuk membangun dunia berikutnya.</p>
            </div>
          )}

          {/* Recent projects */}
          {showProjects && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2"><Clock3 className="w-4 h-4 text-cyan-400" /> {savedProjects.length ? 'Recent projects' : 'Jump back in'}</h2>
                  <p className="text-[11px] text-slate-500 mt-1">Lanjutkan dunia Anda atau mulai dari starter scene.</p>
                </div>
                {section === 'overview' && <button onClick={() => setSection('projects')} className="text-[11px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1">View all <ChevronRight className="w-3.5 h-3.5" /></button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredSaved.map((project) => {
                  const template = templateById(project.meta.templateId);
                  return (
                    <button key={project.meta.id} onClick={() => onOpenSavedProject(project)} className="group text-left rounded-2xl overflow-hidden bg-[#0e1421] border border-slate-800 hover:border-cyan-500/40 transition hover:-translate-y-0.5 shadow-lg">
                      <div className="h-36 relative overflow-hidden"><TemplateArtwork template={template} className="w-full h-full transition duration-500 group-hover:scale-105" /></div>
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-sm text-slate-100 truncate">{project.meta.name}</h3><span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Saved</span></div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2"><span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{project.meta.branch}</span><span>{project.meta.entityCount} nodes</span><span className="ml-auto">{new Date(project.meta.updatedAt).toLocaleDateString('id-ID')}</span></div>
                      </div>
                    </button>
                  );
                })}

                {(section === 'overview' || filteredSaved.length === 0) && GAME_TEMPLATES.slice(0, savedProjects.length ? 1 : 2).filter((t) => filteredTemplates.includes(t)).map((template, i) => (
                  <button key={template.id} onClick={() => onOpenTemplate(template.id)} className="group text-left rounded-2xl overflow-hidden bg-[#0e1421] border border-slate-800 hover:border-purple-500/40 transition hover:-translate-y-0.5 shadow-lg">
                    <div className="h-36 relative overflow-hidden">
                      <TemplateArtwork template={template} className="w-full h-full transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1421]/70 to-transparent" />
                      <span className="absolute right-3 top-3 w-8 h-8 rounded-full bg-slate-950/70 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Play className="w-3.5 h-3.5 text-cyan-300 fill-current" /></span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between"><h3 className="font-semibold text-sm text-slate-100">{template.name}</h3><span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">Starter</span></div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2"><span>{template.genre}</span><span className="ml-auto flex items-center gap-1"><Zap className="w-3 h-3 text-amber-300" />{template.initTimeLabel}</span></div>
                    </div>
                  </button>
                ))}

                <button onClick={onCreateBlank} className="min-h-[230px] rounded-2xl border border-dashed border-slate-700/80 hover:border-cyan-500/50 bg-slate-900/20 hover:bg-cyan-500/5 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-cyan-300 transition">
                  <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center"><Plus className="w-5 h-5" /></div>
                  <span className="text-xs font-semibold">Create blank project</span><span className="text-[10px] text-slate-600">3D • 2D • Hybrid</span>
                </button>
              </div>
            </section>
          )}

          {/* Templates */}
          {showTemplates && (
            <section>
              <div className="flex items-end justify-between mb-4">
                <div><h2 className="text-base font-bold text-white flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-purple-400" /> Start with a template</h2><p className="text-[11px] text-slate-500 mt-1">Playable scenes, scripts, physics, dan PBR sudah siap.</p></div>
                {section === 'overview' && <button onClick={() => setSection('templates')} className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1">Browse all <ChevronRight className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4">
                {filteredTemplates.map((template) => (
                  <article key={template.id} className="group rounded-2xl overflow-hidden bg-[#0e1421] border border-slate-800 hover:border-cyan-500/40 transition shadow-lg flex flex-col">
                    <button onClick={() => onOpenTemplate(template.id)} className="h-40 relative overflow-hidden text-left">
                      <TemplateArtwork template={template} className="w-full h-full transition duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0e1421] via-transparent to-transparent" />
                      <span className="absolute bottom-3 left-3 text-[9px] font-semibold tracking-wider uppercase text-slate-300">{template.genre}</span>
                    </button>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-sm font-bold text-slate-100 group-hover:text-cyan-200 transition">{template.name}</h3>
                      <p className="text-[11px] leading-relaxed text-slate-500 mt-2 line-clamp-2">{template.tagline}</p>
                      <div className="flex flex-wrap gap-1.5 mt-3">{template.badges.slice(0, 2).map((badge) => <span key={badge} className="text-[9px] px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400">{badge}</span>)}</div>
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        <span className="text-[10px] text-emerald-300 flex items-center gap-1"><Zap className="w-3 h-3" />{template.initTimeLabel}</span>
                        <button onClick={() => onOpenTemplate(template.id)} className="px-3 py-1.5 rounded-lg bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 text-[10px] font-semibold text-slate-200 transition flex items-center gap-1.5">Use template <ArrowRight className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Community + engine value props */}
          {showCommunity && (
            <section className="grid grid-cols-1 2xl:grid-cols-[1fr_280px] gap-6">
              <div>
                <div className="flex items-center justify-between mb-4"><div><h2 className="text-base font-bold text-white flex items-center gap-2"><Globe className="w-4 h-4 text-cyan-400" /> Made with Aether</h2><p className="text-[11px] text-slate-500 mt-1">Jelajahi dan remix karya komunitas.</p></div>{section === 'overview' && <button onClick={() => setSection('community')} className="text-[11px] text-cyan-300">Explore community →</button>}</div>
                <div className="space-y-3">
                  {COMMUNITY_SHOWCASE.map((project, index) => {
                    const template = templateById(project.templateRef);
                    return (
                      <article key={project.id} className="group flex items-center gap-4 p-3 rounded-2xl bg-[#0e1421] border border-slate-800 hover:border-slate-700 transition">
                        <div className="w-32 h-20 rounded-xl overflow-hidden shrink-0 hidden sm:block"><TemplateArtwork template={template} className="w-full h-full" /></div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="text-[10px] text-slate-600 font-mono-code">0{index + 1}</span><h3 className="text-xs font-bold text-slate-100 truncate">{project.title}</h3><Star className="w-3 h-3 text-amber-400 fill-current shrink-0" /></div>
                          <div className="text-[10px] text-slate-500 mt-1">{project.creator}</div>
                          <div className="flex flex-wrap gap-1 mt-2">{project.tags.slice(0, 2).map((tag) => <span key={tag} className="text-[9px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">{tag}</span>)}</div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-[10px] text-slate-500"><span className="flex items-center gap-1"><Play className="w-3 h-3" />{project.plays}</span><span className="flex items-center gap-1"><Heart className="w-3 h-3" />{project.likes}</span></div>
                        <button onClick={() => onOpenTemplate(project.templateRef, project.title)} className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-purple-500/20 border border-slate-800 hover:border-purple-500/40 text-[10px] text-slate-300 hover:text-purple-200 font-semibold shrink-0">Remix</button>
                      </article>
                    );
                  })}
                </div>
              </div>

              {section === 'overview' && (
                <div className="rounded-2xl p-5 bg-gradient-to-b from-purple-500/10 to-[#0e1421] border border-purple-500/20 flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center mb-4"><Users className="w-5 h-5 text-purple-300" /></div>
                  <h3 className="text-sm font-bold text-white">Better, together.</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-2">Edit scene yang sama, lihat kursor 3D tim, dan diskusikan perubahan tanpa konflik.</p>
                  <div className="flex -space-x-2 my-5">{[['RP','#34d399'],['NK','#f472b6'],['DP','#00f0ff'],['+8','#334155']].map(([txt, color]) => <div key={txt} style={{ backgroundColor: color }} className="w-8 h-8 rounded-full border-2 border-[#111426] flex items-center justify-center text-[9px] font-bold text-slate-950">{txt}</div>)}</div>
                  <div className="space-y-2 text-[10px] text-slate-400"><div className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /> CRDT conflict-free editing</div><div className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /> 3D pin comments</div><div className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /> Visual Git snapshots</div></div>
                  <button onClick={() => onOpenTemplate('tpl-3d-rpg')} className="mt-auto pt-5 text-left text-[11px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1">Open collaborative demo <ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </section>
          )}

          <footer className="border-t border-slate-800/60 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-600">
            <span>AetherEngine Studio v1.0 • Browser-native by design</span>
            <div className="flex items-center gap-4"><span className="flex items-center gap-1.5"><Box className="w-3 h-3" /> WebGL2 / WebGPU</span><span className="flex items-center gap-1.5"><Code2 className="w-3 h-3" /> Wasm ready</span><span className="flex items-center gap-1.5"><Rocket className="w-3 h-3" /> Zero-install</span></div>
          </footer>
        </main>
      </div>
    </div>
  );
};
