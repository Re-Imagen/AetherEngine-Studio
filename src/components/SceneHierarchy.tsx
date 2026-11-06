import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Box,
  Sun,
  Camera,
  Code2,
  Sparkles,
  Volume2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  User,
  Car,
  Layers,
  MessageSquare,
} from 'lucide-react';
import type { CollaboratorPresence, PinComment3D, SceneEntity } from '../types/engine';

interface SceneHierarchyProps {
  entities: SceneEntity[];
  selectedId: string | null;
  onSelectEntity: (id: string | null) => void;
  onUpdateEntity: (id: string, patch: Partial<SceneEntity>) => void;
  onDeleteEntity: (id: string) => void;
  onDuplicateEntity: (id: string) => void;
  onQuickSpawn: (kind: 'box' | 'sphere' | 'crystal' | 'cyber_drone' | 'light' | 'particle' | 'sprite2d') => void;
  collaborators: CollaboratorPresence[];
  comments: PinComment3D[];
}

type FilterTab = 'all' | 'mesh' | 'light' | 'camera' | 'script' | '2d';

export const SceneHierarchy: React.FC<SceneHierarchyProps> = ({
  entities,
  selectedId,
  onSelectEntity,
  onUpdateEntity,
  onDeleteEntity,
  onDuplicateEntity,
  onQuickSpawn,
  collaborators,
  comments,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [showAddMenu, setShowAddMenu] = useState(false);

  const filtered = useMemo(() => {
    return entities.filter((e) => {
      if (search.trim() && !e.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filter === 'mesh') return e.type === 'mesh' || e.type === 'character' || e.type === 'vehicle';
      if (filter === 'light') return e.type === 'light';
      if (filter === 'camera') return e.type === 'camera';
      if (filter === 'script') return Boolean(e.script?.enabled || e.visualScriptEnabled);
      if (filter === '2d') return e.type === 'sprite2d' || e.type === 'tilemap2d';
      return true;
    });
  }, [entities, search, filter]);

  const getIcon = (ent: SceneEntity) => {
    if (ent.type === 'light') return <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    if (ent.type === 'camera') return <Camera className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    if (ent.type === 'particle') return <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
    if (ent.type === 'audio') return <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    if (ent.type === 'character') return <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    if (ent.type === 'vehicle') return <Car className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    if (ent.type === 'sprite2d' || ent.type === 'tilemap2d')
      return <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    return <Box className="w-3.5 h-3.5 text-cyan-300 shrink-0" />;
  };

  const renderNode = (ent: SceneEntity, depth: number) => {
    const children = filtered.filter((c) => c.parentId === ent.id);
    const isSelected = selectedId === ent.id;
    const isCollapsed = Boolean(collapsedIds[ent.id]);
    const peerSelecting = collaborators.find((p) => p.selectedEntityId === ent.id);
    const pinCount = comments.filter((c) => c.entityId === ent.id && !c.resolved).length;

    return (
      <div key={ent.id}>
        <div
          onClick={() => onSelectEntity(ent.id)}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className={`group flex items-center justify-between pr-2 py-1.5 text-xs cursor-pointer rounded-md mx-1 my-0.5 transition ${
            isSelected
              ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50'
              : 'text-slate-300 hover:bg-slate-800/70'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {children.length > 0 ? (
              <button
                onClick={(ev) => {
                  ev.stopPropagation();
                  setCollapsedIds((prev) => ({ ...prev, [ent.id]: !prev[ent.id] }));
                }}
                className="text-slate-400 hover:text-white"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="w-3 inline-block" />
            )}

            {getIcon(ent)}

            <span className={`truncate ${!ent.visible ? 'opacity-45 line-through' : ''}`}>
              {ent.name}
            </span>

            {ent.script?.enabled && (
              <span title={`Script: ${ent.script.name}`} className="text-[10px] text-purple-300">
                <Code2 className="w-3 h-3" />
              </span>
            )}

            {pinCount > 0 && (
              <span
                title={`${pinCount} komentar 3D aktif`}
                className="flex items-center gap-0.5 text-[10px] text-cyan-300"
              >
                <MessageSquare className="w-2.5 h-2.5" />
              </span>
            )}

            {peerSelecting && (
              <span
                title={`Sedang diedit oleh ${peerSelecting.name}`}
                style={{ backgroundColor: peerSelecting.color }}
                className="w-2 h-2 rounded-full shrink-0"
              />
            )}
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                onUpdateEntity(ent.id, { visible: !ent.visible });
              }}
              title="Toggle Visibility"
              className="text-slate-400 hover:text-cyan-300 p-0.5"
            >
              {ent.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-slate-500" />}
            </button>
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                onUpdateEntity(ent.id, { locked: !ent.locked });
              }}
              title="Toggle Lock"
              className="text-slate-400 hover:text-amber-300 p-0.5"
            >
              {ent.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {!isCollapsed && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  // Root nodes are those whose parentId is null or whose parent is filtered out
  const visibleSet = new Set(filtered.map((e) => e.id));
  const roots = filtered.filter((e) => !e.parentId || !visibleSet.has(e.parentId));

  return (
    <div className="h-full bg-[#0e1421] flex flex-col border-r border-slate-800/80 select-none">
      {/* Panel Header */}
      <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold tracking-wide text-slate-200 uppercase">
            Scene Hierarchy
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono-code">
            {entities.length}
          </span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowAddMenu((v) => !v)}
            title="Tambah Objek ke Scene"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold transition"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          {showAddMenu && (
            <div
              onMouseLeave={() => setShowAddMenu(false)}
              className="absolute right-0 top-full mt-1 w-48 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl py-1 z-40 text-xs"
            >
              {[
                { k: 'box', label: '3D Physics Cube' },
                { k: 'sphere', label: '3D PBR Sphere' },
                { k: 'crystal', label: 'Mana Crystal' },
                { k: 'cyber_drone', label: 'Cyber Drone' },
                { k: 'light', label: 'Point Light (GI)' },
                { k: 'particle', label: 'GPU Particle System' },
                { k: 'sprite2d', label: '2D Hybrid Sprite' },
              ].map((it) => (
                <button
                  key={it.k}
                  onClick={() => {
                    onQuickSpawn(it.k as any);
                    setShowAddMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-slate-800 text-slate-200"
                >
                  + {it.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Search & Filter Pills */}
      <div className="p-2 space-y-2 border-b border-slate-800/70">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari objek / node..."
            className="w-full bg-[#090d16] border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'mesh', label: 'Mesh' },
              { id: 'light', label: 'Light' },
              { id: 'camera', label: 'Cam' },
              { id: 'script', label: 'Script' },
              { id: '2d', label: '2D' },
            ] as { id: FilterTab; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition shrink-0 ${
                filter === f.id
                  ? 'bg-purple-500/25 text-purple-200 ring-1 ring-purple-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tree Node List */}
      <div className="flex-1 overflow-y-auto py-1">
        {roots.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            Tidak ada node yang cocok dengan filter.
          </div>
        ) : (
          roots.map((r) => renderNode(r, 0))
        )}
      </div>

      {/* Quick Selected Node Actions Footer */}
      {selectedId && (
        <div className="px-2.5 py-2 border-t border-slate-800/80 bg-[#0a0f1a] flex items-center justify-between text-[11px]">
          <span className="text-slate-400 truncate max-w-[120px]">
            {entities.find((e) => e.id === selectedId)?.name}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicateEntity(selectedId)}
              title="Duplicate Node"
              className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteEntity(selectedId)}
              title="Delete Node"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
