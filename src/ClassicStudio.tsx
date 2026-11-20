import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Cloud,
  Cpu,
  GitBranch,
  Redo2,
  Undo2,
  Users,
  Wifi,
  Zap,
  Bot,
  Box,
  Code2,
  Command,
  Film,
  FolderOpen,
  LayoutDashboard,
  Pause,
  Play,
  Plus,
  QrCode,
  Rocket,
  RotateCcw,
  Save,
  Share2,
  SkipForward,
  Sparkles,
  Square,
  Terminal,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { TopBar } from './components/TopBar';
import { SceneHierarchy } from './components/SceneHierarchy';
import { Viewport3D } from './components/Viewport3D';
import { RightPanel } from './components/RightPanel';
import { BottomPanel, type BottomTabId } from './components/BottomPanel';
import { MobileLiveModal } from './components/MobileLiveModal';
import { MobileStandaloneView } from './components/MobileStandaloneView';
import { VisualGitModal } from './components/VisualGitModal';
import { PublishExportModal } from './components/PublishExportModal';
import { ShareWorkspaceModal } from './components/ShareWorkspaceModal';
import { CommandPalette, type CommandAction } from './components/CommandPalette';
import { CLOUD_ASSET_STORE_ITEMS, GAME_TEMPLATES } from './engine/templates';
import { AetherCollabClient, INITIAL_SIMULATED_TEAMMATES } from './engine/collabClient';
import { opfsStorage, type SavedProjectPayload } from './engine/opfsStorage';
import { generateProceduralPBRPack } from './engine/pbrTextureGenerator';
import { aetherWasm } from './engine/wasmCore';
import type {
  AnimationTrack,
  AssetItem,
  CollaboratorPresence,
  ConsoleLogEntry,
  GeneratedPBRTexturePack,
  GizmoMode,
  PinComment3D,
  PostProcessingConfig,
  ProfilerSample,
  ProjectMeta,
  SceneEntity,
  SceneSnapshot,
  SimState,
  TargetPlatform,
  Vec3,
  VisualScriptGraph,
} from './types/engine';

type QuickSpawnKind = 'box' | 'sphere' | 'crystal' | 'cyber_drone' | 'light' | 'particle' | 'sprite2d';

interface EditorDocument {
  entities: SceneEntity[];
  visualGraph: VisualScriptGraph;
  animationTracks: AnimationTrack[];
  postProcessing: PostProcessingConfig;
  comments: PinComment3D[];
}

const clone = <T,>(value: T): T => structuredClone(value);
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const nowLabel = () => new Date().toLocaleTimeString('id-ID', { hour12: false });

const baseMaterial = (albedo = '#00f0ff', emissive = '#00f0ff') => ({
  albedo,
  metallic: 0.65,
  roughness: 0.28,
  normalScale: 1,
  emissive,
  emissiveIntensity: 0.5,
  wireframe: false,
  opacity: 1,
  transparent: false,
});

function createQuickEntity(kind: QuickSpawnKind, position?: Vec3): SceneEntity {
  const id = uid(`node-${kind}`);
  const spawnPosition = position || [Number((Math.random() * 3 - 1.5).toFixed(2)), 1.4, Number((Math.random() * 3 - 1.5).toFixed(2))];
  const entity: SceneEntity = {
    id,
    parentId: null,
    name: `New ${kind.replace('_', ' ')}`,
    tag: 'Gameplay',
    layer: 'Scene',
    type: 'mesh',
    visible: true,
    locked: false,
    position: spawnPosition,
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    meshPrimitive: 'box',
    material: baseMaterial(),
  };

  if (kind === 'box') {
    entity.name = 'PBR Physics Cube';
    entity.material = baseMaterial('#38bdf8', '#00f0ff');
    entity.physics = { enabled: true, bodyType: 'dynamic', collider: 'box', mass: 16, restitution: 0.55, friction: 0.65, gravityScale: 1 };
  } else if (kind === 'sphere') {
    entity.name = 'Metallic Physics Sphere';
    entity.meshPrimitive = 'sphere';
    entity.material = { ...baseMaterial('#c084fc', '#a855f7'), metallic: 0.92, roughness: 0.12 };
    entity.physics = { enabled: true, bodyType: 'dynamic', collider: 'sphere', mass: 10, restitution: 0.72, friction: 0.45, gravityScale: 1 };
  } else if (kind === 'crystal') {
    entity.name = 'Aether Mana Crystal';
    entity.meshPrimitive = 'crystal';
    entity.scale = [1.1, 1.65, 1.1];
    entity.material = { ...baseMaterial('#d8b4fe', '#a855f7'), metallic: 0.25, roughness: 0.08, emissiveIntensity: 1.35, transparent: true, opacity: 0.92 };
    entity.script = { enabled: true, name: 'CrystalHover.rs', language: 'rust_wasm', wasmKernel: 'hover_wave', code: '// Rust Wasm hover kernel\npub fn on_update(entity: &mut Entity, dt: f32, time: f32) {\n    entity.rotation.y += 52.0 * dt;\n}' };
  } else if (kind === 'cyber_drone') {
    entity.name = 'Valkyrie Cyber Drone';
    entity.meshPrimitive = 'cyber_drone';
    entity.position = [spawnPosition[0], 2, spawnPosition[2]];
    entity.material = { ...baseMaterial('#22d3ee', '#00f0ff'), metallic: 0.88, roughness: 0.18, emissiveIntensity: 0.95 };
    entity.physics = { enabled: true, bodyType: 'kinematic', collider: 'sphere', mass: 15, restitution: 0.3, friction: 0.4, gravityScale: 0 };
    entity.script = { enabled: true, name: 'DroneOrbit.cs', language: 'csharp_wasm', wasmKernel: 'orbital', code: '// C# Wasm orbital companion\nTransform.Orbit(Vector3.Zero, 4.4f, Time.Elapsed);' };
  } else if (kind === 'light') {
    entity.name = 'Dynamic Cyan Point Light';
    entity.type = 'light';
    entity.meshPrimitive = undefined;
    entity.position = [spawnPosition[0], 4, spawnPosition[2]];
    entity.light = { subType: 'point', color: '#00f0ff', intensity: 5, range: 18, castShadow: true };
  } else if (kind === 'particle') {
    entity.name = 'GPU Portal Particle Emitter';
    entity.type = 'particle';
    entity.meshPrimitive = undefined;
    entity.position = [spawnPosition[0], 1, spawnPosition[2]];
    entity.material = { ...baseMaterial(), transparent: true, opacity: 0.85, emissiveIntensity: 1.5 };
    entity.particle = { count: 20000, colorStart: '#00f0ff', colorEnd: '#a855f7', size: 0.08, speed: 1.5, spread: 4.5, lifetime: 3.2, mode: 'portal' };
  } else if (kind === 'sprite2d') {
    entity.name = 'Neon Hybrid Sprite';
    entity.type = 'sprite2d';
    entity.meshPrimitive = 'hero_knight';
    entity.scale = [1, 1, 0.5];
    entity.material = baseMaterial('#34d399', '#10b981');
    entity.sprite2d = { glyph: 'runner', tint: '#34d399', flipX: false, frameSpeed: 8, sortingLayer: 4 };
  }
  return entity;
}

function entityFromAsset(asset: AssetItem, position?: Vec3): SceneEntity {
  const fallback = createQuickEntity(asset.spawnConfig?.type === 'particle' ? 'particle' : 'box', position);
  const config = clone(asset.spawnConfig || {});
  return {
    ...fallback,
    ...config,
    id: uid('asset'),
    parentId: null,
    name: config.name || asset.name,
    tag: config.tag || 'CloudAsset',
    layer: config.layer || 'Assets',
    position: position || config.position || fallback.position,
    material: { ...fallback.material, ...(config.material || {}) },
  } as SceneEntity;
}

const projectMetaFromTemplate = (templateIndex: number, customName?: string): ProjectMeta => {
  const template = GAME_TEMPLATES[templateIndex];
  return {
    id: uid('project'),
    name: customName || template.name,
    templateId: template.id,
    genre: template.genre,
    updatedAt: Date.now(),
    branch: 'main',
    entityCount: template.entities.length,
    is2DMode: template.is2DDefault,
    accentFrom: template.accentFrom,
    accentTo: template.accentTo,
  };
};

const StudioApplication: React.FC = () => {
  const sharedParams = new URLSearchParams(window.location.search);
  const requestedTemplateId = sharedParams.get('template');
  const requestedTemplateIndex = GAME_TEMPLATES.findIndex((template) => template.id === requestedTemplateId);
  const initialTemplateIndex = requestedTemplateIndex >= 0 ? requestedTemplateIndex : 0;
  const initialTemplate = GAME_TEMPLATES[initialTemplateIndex];
  const initialMeta: ProjectMeta = {
    ...projectMetaFromTemplate(initialTemplateIndex, sharedParams.get('project') || undefined),
    id: initialTemplateIndex === 0 ? 'project-eldoria-main' : `project-${initialTemplate.id}`,
  };

  const [view, setView] = useState<'dashboard' | 'editor'>(() =>
    sharedParams.get('mode') === 'editor' ? 'editor' : 'dashboard',
  );
  const [projectMeta, setProjectMeta] = useState<ProjectMeta>(initialMeta);
  const [entities, setEntities] = useState<SceneEntity[]>(() => clone(initialTemplate.entities));
  const [postProcessing, setPostProcessing] = useState<PostProcessingConfig>(() => clone(initialTemplate.postProcessing));
  const [visualGraph, setVisualGraph] = useState<VisualScriptGraph>(() => clone(initialTemplate.visualGraph));
  const [animationTracks, setAnimationTracks] = useState<AnimationTrack[]>(() => clone(initialTemplate.animationTracks));
  const [comments, setComments] = useState<PinComment3D[]>(() => clone(initialTemplate.initialComments));
  const [texturePacks, setTexturePacks] = useState<GeneratedPBRTexturePack[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>(() => clone(CLOUD_ASSET_STORE_ITEMS));
  const [selectedId, setSelectedId] = useState<string | null>('aether-crystal');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [snapshots, setSnapshots] = useState<SceneSnapshot[]>(() => [{
    id: 'snap-initial', branch: 'main', message: 'Initial playable template', author: 'AetherEngine', timestamp: Date.now(), entities: clone(initialTemplate.entities), postProcessing: clone(initialTemplate.postProcessing),
  }]);

  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [is2DMode, setIs2DMode] = useState(initialTemplate.is2DDefault);
  const [simState, setSimState] = useState<SimState>('stopped');
  const [stepTrigger, setStepTrigger] = useState(0);
  const [targetPlatform, setTargetPlatform] = useState<TargetPlatform>('web');
  const [bottomTab, setBottomTab] = useState<BottomTabId>('assets');
  const [timelineTime, setTimelineTime] = useState(0);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([
    { id: 'boot-1', timestamp: nowLabel(), level: 'info', source: 'AetherRuntime', message: 'Studio initialized • WebGPU detection with WebGL2 PBR fallback.' },
    { id: 'boot-2', timestamp: nowLabel(), level: 'wasm', source: 'WasmKernel', message: 'Native WebAssembly physics & math kernel ready (near-native FPU).' },
    { id: 'boot-3', timestamp: nowLabel(), level: 'collab', source: 'CRDTHub', message: 'Lamport LWW sync ready • BroadcastChannel + WebSocket relay.' },
  ]);
  const [profilerHistory, setProfilerHistory] = useState<ProfilerSample[]>([]);
  const [opfsInfo, setOpfsInfo] = useState({ opfsSupported: false, usageMb: 0, quotaMb: 4096 });
  const [savedProjects, setSavedProjects] = useState<SavedProjectPayload[]>([]);
  const [cloudStatusText, setCloudStatusText] = useState('OPFS + Cloud Ready');

  const [showMobileModal, setShowMobileModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'inspector' | 'ai'>('inspector');
  const [rightPanelRequestId, setRightPanelRequestId] = useState(0);
  const [simulatedCollabActive, setSimulatedCollabActive] = useState(true);
  const [simulatedPeers, setSimulatedPeers] = useState<CollaboratorPresence[]>(() => clone(INITIAL_SIMULATED_TEAMMATES));
  const [realPeers, setRealPeers] = useState<CollaboratorPresence[]>([]);
  const [followPeerId, setFollowPeerId] = useState<string | null>(null);

  const [leftWidth, setLeftWidth] = useState(224);
  const [rightWidth, setRightWidth] = useState(318);
  const [bottomHeight, setBottomHeight] = useState(238);
  const [historySizes, setHistorySizes] = useState({ past: 0, future: 0 });

  const collabRef = useRef<AetherCollabClient | null>(null);
  const sceneSyncTimerRef = useRef<number | null>(null);
  const cursorThrottleRef = useRef(0);
  const pastRef = useRef<EditorDocument[]>([]);
  const futureRef = useRef<EditorDocument[]>([]);
  const documentRef = useRef<EditorDocument>({ entities, visualGraph, animationTracks, postProcessing, comments });
  documentRef.current = { entities, visualGraph, animationTracks, postProcessing, comments };

  const roomName = useMemo(() => {
    const sharedRoom = new URLSearchParams(window.location.search).get('room');
    if (sharedRoom) return sharedRoom;
    return projectMeta.id === 'project-eldoria-main' ? 'eldoria-main' : `studio-${projectMeta.id}`;
  }, [projectMeta.id]);

  const collaborators = useMemo(
    () => [...realPeers, ...(simulatedCollabActive ? simulatedPeers : [])],
    [realPeers, simulatedPeers, simulatedCollabActive],
  );
  const selectedEntity = entities.find((e) => e.id === selectedId) || null;

  const log = useCallback((level: ConsoleLogEntry['level'], source: string, message: string) => {
    setLogs((prev) => [...prev.slice(-159), { id: uid('log'), timestamp: nowLabel(), level, source, message }]);
  }, []);

  const scheduleSceneSync = useCallback(() => {
    if (sceneSyncTimerRef.current) window.clearTimeout(sceneSyncTimerRef.current);
    sceneSyncTimerRef.current = window.setTimeout(() => {
      collabRef.current?.broadcastSceneSync(clone(documentRef.current.entities));
    }, 320);
  }, []);

  const updateHistorySizes = () => setHistorySizes({ past: pastRef.current.length, future: futureRef.current.length });
  const pushHistory = useCallback(() => {
    pastRef.current.push(clone(documentRef.current));
    if (pastRef.current.length > 60) pastRef.current.shift();
    futureRef.current = [];
    updateHistorySizes();
  }, []);

  const applyDocument = useCallback((document: EditorDocument) => {
    setEntities(clone(document.entities));
    setVisualGraph(clone(document.visualGraph));
    setAnimationTracks(clone(document.animationTracks));
    setPostProcessing(clone(document.postProcessing));
    setComments(clone(document.comments));
    setSelectedId(null);
    setSimState('stopped');
    scheduleSceneSync();
  }, [scheduleSceneSync]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) return;
    futureRef.current.push(clone(documentRef.current));
    applyDocument(previous);
    updateHistorySizes();
    log('info', 'History', 'Undo scene operation berhasil.');
  }, [applyDocument, log]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(clone(documentRef.current));
    applyDocument(next);
    updateHistorySizes();
    log('info', 'History', 'Redo scene operation berhasil.');
  }, [applyDocument, log]);

  const updateEntity = useCallback((id: string, patch: Partial<SceneEntity>) => {
    pushHistory();
    setEntities((prev) => prev.map((entity) => entity.id === id ? { ...entity, ...patch } : entity));
    collabRef.current?.broadcastEntityPatch(id, patch);
    scheduleSceneSync();
  }, [pushHistory, scheduleSceneSync]);

  const quickSpawn = useCallback((kind: QuickSpawnKind) => {
    const entity = createQuickEntity(kind);
    pushHistory();
    setEntities((prev) => [...prev, entity]);
    setSelectedId(entity.id);
    scheduleSceneSync();
    log('info', 'SceneGraph', `${entity.name} ditambahkan ke scene.`);
  }, [pushHistory, scheduleSceneSync, log]);

  const deleteEntity = useCallback((id: string) => {
    const all = documentRef.current.entities;
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const entity of all) {
        if (entity.parentId && toDelete.has(entity.parentId) && !toDelete.has(entity.id)) {
          toDelete.add(entity.id);
          changed = true;
        }
      }
    }
    const name = all.find((e) => e.id === id)?.name || id;
    pushHistory();
    setEntities((prev) => prev.filter((entity) => !toDelete.has(entity.id)));
    setSelectedId(null);
    scheduleSceneSync();
    log('warn', 'SceneGraph', `${name} dan ${Math.max(0, toDelete.size - 1)} child node dihapus.`);
  }, [pushHistory, scheduleSceneSync, log]);

  const duplicateEntity = useCallback((id: string) => {
    const source = documentRef.current.entities.find((e) => e.id === id);
    if (!source) return;
    const duplicated = clone(source);
    duplicated.id = uid('node');
    duplicated.name = `${source.name} Copy`;
    duplicated.parentId = source.parentId;
    duplicated.position = [source.position[0] + 0.75, source.position[1] + 0.2, source.position[2] + 0.75];
    pushHistory();
    setEntities((prev) => [...prev, duplicated]);
    setSelectedId(duplicated.id);
    scheduleSceneSync();
    log('info', 'SceneGraph', `${source.name} diduplikasi dengan unique entity ID.`);
  }, [pushHistory, scheduleSceneSync, log]);

  const registerTexturePack = useCallback((pack: GeneratedPBRTexturePack, applyToEntityId?: string | null) => {
    setTexturePacks((prev) => [pack, ...prev.filter((p) => p.id !== pack.id)]);
    opfsStorage.cacheAssetBlob(pack.id, pack.name, pack);
    if (applyToEntityId) {
      const target = documentRef.current.entities.find((e) => e.id === applyToEntityId);
      if (target) updateEntity(applyToEntityId, { material: { ...target.material, texturePackId: pack.id } });
    }
  }, [updateEntity]);

  const applyTextureToSelected = useCallback((packId: string) => {
    if (!selectedId) {
      log('warn', 'PBRMaterial', 'Pilih sebuah objek 3D terlebih dahulu.');
      return;
    }
    const target = documentRef.current.entities.find((e) => e.id === selectedId);
    if (target) {
      updateEntity(selectedId, { material: { ...target.material, texturePackId: packId } });
      log('info', 'PBRMaterial', `4-Map PBR ${packId} diterapkan ke ${target.name}.`);
    }
  }, [selectedId, updateEntity, log]);

  const useAsset = useCallback((asset: AssetItem, hitPos?: Vec3, targetEntityId?: string | null) => {
    if (asset.texturePrompt) {
      const pack = generateProceduralPBRPack(asset.texturePrompt);
      registerTexturePack(pack, targetEntityId || selectedId);
      log('ai', 'Aether TextureGen', `${asset.name}: seamless Albedo, Normal, Roughness & Metallic dibuat.`);
      return;
    }
    if (!asset.spawnConfig) {
      log('info', 'AssetDrawer', `${asset.name} siap digunakan dari OPFS cache.`);
      return;
    }
    const entity = entityFromAsset(asset, hitPos);
    pushHistory();
    setEntities((prev) => [...prev, entity]);
    setSelectedId(entity.id);
    scheduleSceneSync();
    log('info', asset.source === 'cloud_r2' ? 'CloudR2' : 'OPFS', `${asset.name} di-instantiate sebagai ${entity.name}.`);
  }, [registerTexturePack, selectedId, pushHistory, scheduleSceneSync, log]);

  const downloadCloudAsset = useCallback((assetId: string) => {
    setAssets((prev) => prev.map((asset) => asset.id === assetId ? { ...asset, downloaded: true } : asset));
    const asset = assets.find((a) => a.id === assetId);
    if (asset) {
      opfsStorage.cacheAssetBlob(asset.id, asset.name, asset);
      log('info', 'CloudR2CDN', `${asset.name} (${asset.sizeKb} KB) cached ke OPFS • 18ms edge latency.`);
    }
  }, [assets, log]);

  const saveProjectNow = useCallback(async (manual = false) => {
    const meta: ProjectMeta = {
      ...projectMeta,
      updatedAt: Date.now(),
      branch: currentBranch,
      entityCount: entities.length,
      is2DMode,
    };
    if (manual) setCloudStatusText('Syncing OPFS + R2…');
    try {
      const result = await opfsStorage.saveProject({
        meta,
        entities: clone(entities),
        postProcessing: clone(postProcessing),
        textures: clone(texturePacks),
        visualGraph: clone(visualGraph),
        animationTracks: clone(animationTracks),
        comments: clone(comments),
        snapshots: clone(snapshots),
      });
      setCloudStatusText(`${result.via} • ${result.latencyMs}ms`);
      setOpfsInfo((prev) => ({ ...prev, usageMb: Math.max(prev.usageMb, opfsStorage.cachedBytes / 1048576) }));
      if (manual) log('info', 'Storage', `Project tersimpan via ${result.via} dalam ${result.latencyMs}ms.`);
      const projects = await opfsStorage.listProjects();
      setSavedProjects(projects.sort((a, b) => b.meta.updatedAt - a.meta.updatedAt));
    } catch {
      setCloudStatusText('Local cache • Offline');
      if (manual) log('warn', 'Storage', 'Cloud tidak tersedia; perubahan tetap aman di local cache.');
    }
  }, [projectMeta, currentBranch, entities, is2DMode, postProcessing, texturePacks, visualGraph, animationTracks, comments, snapshots, log]);

  const openTemplate = useCallback((templateId: string, customName?: string) => {
    const index = Math.max(0, GAME_TEMPLATES.findIndex((t) => t.id === templateId));
    const template = GAME_TEMPLATES[index];
    const meta = projectMetaFromTemplate(index, customName);
    setProjectMeta(meta);
    setEntities(clone(template.entities));
    setPostProcessing(clone(template.postProcessing));
    setVisualGraph(clone(template.visualGraph));
    setAnimationTracks(clone(template.animationTracks));
    setComments(clone(template.initialComments));
    setTexturePacks([]);
    setSelectedId(template.entities.find((e) => e.meshPrimitive === 'crystal')?.id || template.entities.find((e) => e.tag === 'Player')?.id || template.entities[0]?.id || null);
    setCurrentBranch('main');
    setSnapshots([{ id: uid('snap'), branch: 'main', message: `Initial ${template.genre} template`, author: 'AetherEngine', timestamp: Date.now(), entities: clone(template.entities), postProcessing: clone(template.postProcessing) }]);
    setIs2DMode(template.is2DDefault);
    setSimState('stopped');
    setIsTimelinePlaying(false);
    setTimelineTime(0);
    setBottomTab('assets');
    pastRef.current = [];
    futureRef.current = [];
    updateHistorySizes();
    setView('editor');
    log('info', 'ProjectLoader', `${meta.name} siap dalam ${template.initTimeLabel} • ${template.entities.length} scene nodes.`);
  }, [log]);

  const openSavedProject = useCallback((project: SavedProjectPayload) => {
    const template = GAME_TEMPLATES.find((t) => t.id === project.meta.templateId) || GAME_TEMPLATES[0];
    setProjectMeta(clone(project.meta));
    setEntities(clone(project.entities));
    setPostProcessing(clone(project.postProcessing));
    setTexturePacks(clone(project.textures || []));
    setVisualGraph(clone(project.visualGraph || template.visualGraph));
    setAnimationTracks(clone(project.animationTracks || template.animationTracks));
    setComments(clone(project.comments || template.initialComments));
    setSnapshots(clone(project.snapshots || [{ id: uid('snap'), branch: project.meta.branch, message: 'Restored local snapshot', author: 'You', timestamp: project.meta.updatedAt, entities: clone(project.entities), postProcessing: clone(project.postProcessing) }]));
    setCurrentBranch(project.meta.branch);
    setIs2DMode(project.meta.is2DMode);
    setSelectedId(project.entities[0]?.id || null);
    setSimState('stopped');
    pastRef.current = [];
    futureRef.current = [];
    updateHistorySizes();
    setView('editor');
    log('info', 'OPFSLoader', `${project.meta.name} dipulihkan dari local persistent cache.`);
  }, [log]);

  const createBlank = useCallback(() => {
    openTemplate('tpl-3d-rpg', 'Untitled Aether World');
    const starter = createQuickEntity('box', [0, 1, 0]);
    const environment = clone(GAME_TEMPLATES[0].entities).filter((e) => ['env-ground', 'sun-light', 'main-camera'].includes(e.id));
    setEntities([...environment, starter]);
    setSelectedId(starter.id);
    setComments([]);
    setAnimationTracks([]);
    setVisualGraph({ id: uid('graph'), targetEntityId: starter.id, nodes: [], edges: [] });
    setSnapshots([{ id: uid('snap'), branch: 'main', message: 'Blank 3D project', author: 'You', timestamp: Date.now(), entities: [...environment, starter], postProcessing: clone(GAME_TEMPLATES[0].postProcessing) }]);
  }, [openTemplate]);

  const addComment = useCallback((entityId: string, text: string, offset: Vec3) => {
    const comment: PinComment3D = { id: uid('comment'), entityId, author: 'You (Lead Dev)', authorColor: '#00f0ff', text, offset, createdAt: Date.now(), resolved: false, replies: [] };
    pushHistory();
    setComments((prev) => [...prev, comment]);
    collabRef.current?.broadcastComment(comment);
    log('collab', 'PinComment3D', `Komentar dipin ke ${entities.find((e) => e.id === entityId)?.name || entityId}.`);
  }, [pushHistory, entities, log]);

  const addKeyframe = useCallback(() => {
    if (!selectedEntity) {
      log('warn', 'Timeline', 'Pilih entity untuk menambahkan keyframe.');
      return;
    }
    pushHistory();
    setAnimationTracks((prev) => {
      const track = prev.find((t) => t.entityId === selectedEntity.id && t.property === 'position.y');
      if (track) {
        return prev.map((t) => t.id === track.id ? { ...t, keyframes: [...t.keyframes.filter((k) => Math.abs(k.time - timelineTime) > 0.03), { time: timelineTime, value: selectedEntity.position[1] }].sort((a, b) => a.time - b.time) } : t);
      }
      return [...prev, { id: uid('track'), entityId: selectedEntity.id, property: 'position.y', keyframes: [{ time: timelineTime, value: selectedEntity.position[1] }] }];
    });
    log('info', 'AnimationTimeline', `Keyframe position.y @ ${timelineTime.toFixed(2)}s ditambahkan ke ${selectedEntity.name}.`);
  }, [selectedEntity, timelineTime, pushHistory, log]);

  const createSnapshot = useCallback((message: string) => {
    const snapshot: SceneSnapshot = { id: uid('snap'), branch: currentBranch, message, author: 'You (Lead Dev)', timestamp: Date.now(), entities: clone(entities), postProcessing: clone(postProcessing) };
    setSnapshots((prev) => [snapshot, ...prev]);
    log('info', 'VisualGit', `Snapshot ${snapshot.id.slice(-6)} created on ${currentBranch}: ${message}`);
  }, [currentBranch, entities, postProcessing, log]);

  const createBranch = useCallback((name: string, fromSnapshotId: string) => {
    setCurrentBranch(name);
    setProjectMeta((prev) => ({ ...prev, branch: name }));
    log('info', 'VisualGit', `Branch ${name} created from ${fromSnapshotId.slice(-6)}.`);
  }, [log]);

  const checkoutSnapshot = useCallback((snapshotId: string) => {
    const snapshot = snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return;
    pushHistory();
    setEntities(clone(snapshot.entities));
    setPostProcessing(clone(snapshot.postProcessing));
    setSelectedId(null);
    setSimState('stopped');
    scheduleSceneSync();
    log('info', 'VisualGit', `Checked out snapshot ${snapshot.id.slice(-6)} • working scene restored.`);
  }, [snapshots, pushHistory, scheduleSceneSync, log]);

  const mergeSnapshot = useCallback((snapshotId: string, strategy: 'smart' | 'theirs') => {
    const snapshot = snapshots.find((s) => s.id === snapshotId);
    if (!snapshot) return;
    pushHistory();
    const merged = strategy === 'theirs'
      ? clone(snapshot.entities)
      : [...clone(snapshot.entities), ...clone(entities).filter((entity) => !snapshot.entities.some((incoming) => incoming.id === entity.id))];
    setEntities(merged);
    setPostProcessing(clone(snapshot.postProcessing));
    setSimState('stopped');
    scheduleSceneSync();
    log('info', 'VisualGit', `${strategy === 'smart' ? 'Smart scene merge' : 'Snapshot merge'} ${snapshot.id.slice(-6)} → ${currentBranch} selesai tanpa konflik.`);
  }, [snapshots, entities, currentBranch, pushHistory, scheduleSceneSync, log]);

  const handleConsoleCommand = useCallback((command: string) => {
    const [cmd, ...args] = command.trim().split(/\s+/);
    log('info', 'Console', `> ${command}`);
    if (cmd === '/clear') setLogs([]);
    else if (cmd === '/help') log('info', 'Console', 'Commands: /status /bench /spawn cube|sphere|crystal /play /pause /stop /snapshot <message> /clear');
    else if (cmd === '/status') log('info', 'EngineStatus', `${entities.length} nodes • ${simState} • ${currentBranch} • ${opfsInfo.opfsSupported ? 'OPFS active' : 'IndexedDB fallback'} • ${collaborators.length + 1} peers.`);
    else if (cmd === '/spawn') quickSpawn(args[0] === 'cube' ? 'box' : args[0] === 'sphere' ? 'sphere' : 'crystal');
    else if (cmd === '/play') setSimState('playing');
    else if (cmd === '/pause') setSimState('paused');
    else if (cmd === '/stop') setSimState('stopped');
    else if (cmd === '/snapshot') createSnapshot(args.join(' ') || `Console snapshot ${new Date().toLocaleTimeString('id-ID')}`);
    else if (cmd === '/bench') {
      aetherWasm.init().then(() => {
        const result = aetherWasm.runBenchmark(250000);
        log('wasm', 'Benchmark', `${result.opsPerSecMillion}M FP ops/sec • ${result.elapsedMs}ms • native Wasm binary.`);
      });
    } else log('warn', 'Console', `Unknown command: ${cmd}. Ketik /help.`);
  }, [log, entities.length, simState, currentBranch, opfsInfo.opfsSupported, collaborators.length, quickSpawn, createSnapshot]);

  // OPFS, IndexedDB and native Wasm boot sequence.
  useEffect(() => {
    opfsStorage.init().then((info) => setOpfsInfo(info));
    opfsStorage.listProjects().then((projects) => setSavedProjects(projects.sort((a, b) => b.meta.updatedAt - a.meta.updatedAt)));
    aetherWasm.init().then(() => log('wasm', 'WasmKernel', `Native binary compiled in ${aetherWasm.compileTimeMs}ms.`));
  }, [log]);

  // Refresh dashboard project cards whenever returning from the editor.
  useEffect(() => {
    if (view === 'dashboard') {
      opfsStorage.listProjects().then((projects) => setSavedProjects(projects.sort((a, b) => b.meta.updatedAt - a.meta.updatedAt)));
    }
  }, [view]);

  // Debounced persistent autosave (OPFS + IndexedDB).
  useEffect(() => {
    if (view !== 'editor') return;
    const timer = window.setTimeout(() => saveProjectNow(false), 1800);
    return () => window.clearTimeout(timer);
  }, [view, saveProjectNow]);

  // Real-time CRDT collaboration across browser tabs and physical mobile devices.
  useEffect(() => {
    if (view !== 'editor') return;
    const client = new AetherCollabClient(roomName, 'You (Lead Dev)', '#00f0ff', 'editor');
    collabRef.current = client;
    const unsubscribe = client.onMessage((msg) => {
      if (msg.type === 'welcome') {
        if (msg.sceneSnapshot && msg.sceneSnapshot.length) setEntities(clone(msg.sceneSnapshot));
        if (msg.peers) {
          setRealPeers(msg.peers.filter((p) => p.peerId !== client.peerId).map((p) => ({ ...p, cursor3D: [0, 1.5, 0], selectedEntityId: null, isMobileTester: p.role === 'mobile-tester' })));
        }
        window.setTimeout(() => client.broadcastSceneSync(clone(documentRef.current.entities)), 450);
      } else if (msg.type === 'scene_sync') {
        setEntities(clone(msg.scene));
      } else if (msg.type === 'entity_patch') {
        setEntities((prev) => prev.map((entity) => entity.id === msg.entityId ? { ...entity, ...msg.patch } : entity));
        scheduleSceneSync();
      } else if (msg.type === 'cursor_move') {
        setRealPeers((prev) => {
          const next: CollaboratorPresence = { peerId: msg.peerId, name: msg.name, role: msg.role, color: msg.color, cursor3D: msg.cursor3D, selectedEntityId: msg.selectedEntityId, isMobileTester: msg.role === 'mobile-tester' };
          return prev.some((p) => p.peerId === msg.peerId) ? prev.map((p) => p.peerId === msg.peerId ? next : p) : [...prev, next];
        });
      } else if (msg.type === 'presence') {
        setRealPeers((previous) => msg.peers.filter((p) => p.peerId !== client.peerId).map((p) => {
          const old = previous.find((peer) => peer.peerId === p.peerId);
          return { ...p, cursor3D: old?.cursor3D || [0, 1.5, 0], selectedEntityId: old?.selectedEntityId || null, isMobileTester: p.role === 'mobile-tester' };
        }));
      } else if (msg.type === 'comment_add') {
        setComments((prev) => prev.some((c) => c.id === msg.comment.id) ? prev : [...prev, msg.comment]);
      }
    });
    client.connect();
    return () => {
      unsubscribe();
      client.disconnect();
      collabRef.current = null;
      setRealPeers([]);
      if (sceneSyncTimerRef.current) window.clearTimeout(sceneSyncTimerRef.current);
    };
  }, [view, roomName, scheduleSceneSync]);

  // Simulated teammates make the collaboration tools testable with a single user.
  useEffect(() => {
    if (!simulatedCollabActive) return;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const t = (performance.now() - started) / 1000;
      setSimulatedPeers((prev) => prev.map((peer, index) => ({
        ...peer,
        cursor3D: [Math.cos(t * 0.35 + index * 2) * (3.8 + index), 1.3 + Math.sin(t + index) * 0.35, Math.sin(t * 0.35 + index * 2) * 3.2],
      })));
    }, 120);
    return () => window.clearInterval(timer);
  }, [simulatedCollabActive]);

  // Timeline clip playback, independent from scene simulation for animation authoring.
  useEffect(() => {
    if (!isTimelinePlaying) return;
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      setTimelineTime((time) => time >= 5 ? 0 : Math.min(5, time + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isTimelinePlaying]);

  // Editor keyboard shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (view !== 'editor') return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.code === 'KeyK') {
        if (!showCommandPalette) {
          event.preventDefault();
          setShowCommandPalette(true);
        }
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)) return;
      if (modifier && event.code === 'KeyS') {
        event.preventDefault();
        saveProjectNow(true);
      } else if (modifier && event.code === 'KeyZ' && !event.shiftKey) {
        event.preventDefault(); undo();
      } else if ((modifier && event.code === 'KeyY') || (modifier && event.shiftKey && event.code === 'KeyZ')) {
        event.preventDefault(); redo();
      } else if (modifier && event.code === 'KeyD') {
        event.preventDefault(); if (selectedId) duplicateEntity(selectedId);
      } else if ((event.code === 'Delete' || event.code === 'Backspace') && selectedId && simState !== 'playing') {
        event.preventDefault(); deleteEntity(selectedId);
      } else if (modifier && event.code === 'Enter') {
        event.preventDefault(); setSimState((state) => state === 'stopped' ? 'playing' : 'stopped');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, showCommandPalette, saveProjectNow, undo, redo, selectedId, duplicateEntity, deleteEntity, simState]);

  const resetDockLayout = useCallback(() => {
    setLeftWidth(224);
    setRightWidth(318);
    setBottomHeight(238);
  }, []);

  const requestRightPanelTab = useCallback((tab: 'inspector' | 'ai') => {
    setRightPanelTab(tab);
    setRightPanelRequestId((value) => value + 1);
  }, []);

  const commandActions = useMemo<CommandAction[]>(() => [
    { id: 'dashboard', title: 'Go to Dashboard', description: 'Projects, templates, dan community showcase', category: 'Workspace', icon: LayoutDashboard, keywords: 'home projects', action: () => { saveProjectNow(false); setView('dashboard'); setSimState('stopped'); } },
    { id: 'save', title: 'Save Project', description: 'Simpan scene dan assets ke OPFS + IndexedDB', category: 'Workspace', icon: Save, shortcut: 'Ctrl S', action: () => { saveProjectNow(true); } },
    { id: 'share', title: 'Share Collaborative Workspace', description: 'Copy live editor atau playtest invitation link', category: 'Workspace', icon: Share2, keywords: 'invite team collaboration', action: () => setShowShareModal(true) },
    { id: 'undo', title: 'Undo Scene Change', description: 'Kembalikan operasi scene sebelumnya', category: 'Workspace', icon: Undo2, shortcut: 'Ctrl Z', action: undo },
    { id: 'redo', title: 'Redo Scene Change', description: 'Terapkan kembali operasi yang di-undo', category: 'Workspace', icon: Redo2, shortcut: 'Ctrl Y', action: redo },
    { id: 'spawn-cube', title: 'Add PBR Physics Cube', description: 'Spawn dynamic rigid-body cube ke scene', category: 'Create', icon: Box, keywords: 'box mesh rigidbody', action: () => quickSpawn('box') },
    { id: 'spawn-crystal', title: 'Add Aether Crystal', description: 'Spawn emissive crystal dengan Rust Wasm hover script', category: 'Create', icon: Sparkles, keywords: 'mesh mana glow', action: () => quickSpawn('crystal') },
    { id: 'spawn-particles', title: 'Add GPU Particle Emitter', description: 'Spawn 20.000 partikel portal berbasis shader', category: 'Create', icon: Plus, keywords: 'vfx portal particles', action: () => quickSpawn('particle') },
    { id: 'open-ai', title: 'Open Aether AI Co-Pilot', description: 'Generate code, seamless PBR texture, atau NPC behavior', category: 'Create', icon: Bot, keywords: 'artificial intelligence texture npc code', action: () => requestRightPanelTab('ai') },
    { id: 'play-stop', title: simState === 'stopped' ? 'Play Simulation' : 'Stop Simulation', description: simState === 'stopped' ? 'Jalankan scripts, physics, animator, dan gameplay' : 'Stop dan kembalikan authored scene transforms', category: 'Simulation', icon: simState === 'stopped' ? Play : Square, shortcut: 'Ctrl Enter', action: () => setSimState((state) => state === 'stopped' ? 'playing' : 'stopped') },
    { id: 'pause', title: simState === 'paused' ? 'Resume Simulation' : 'Pause Simulation', description: 'Pause atau lanjutkan physics dan visual scripts', category: 'Simulation', icon: Pause, action: () => setSimState((state) => state === 'paused' ? 'playing' : 'paused') },
    { id: 'step', title: 'Step One Frame', description: 'Advance simulation sebesar 1/60 detik', category: 'Simulation', icon: SkipForward, action: () => { setSimState('paused'); setStepTrigger((value) => value + 1); } },
    { id: 'assets', title: 'Open Asset Drawer', description: 'Local OPFS assets, Cloud Store, dan generated materials', category: 'Tools', icon: FolderOpen, action: () => setBottomTab('assets') },
    { id: 'blueprint', title: 'Open Blueprint & Code Editor', description: 'Visual nodes dengan live hot-reload dan multi-language scripts', category: 'Tools', icon: Code2, keywords: 'typescript rust csharp monaco', action: () => setBottomTab('scripting') },
    { id: 'animation', title: 'Open Animation & Spatial Audio', description: 'Timeline, State Machine, IK, HRTF mixer, dan reverb', category: 'Tools', icon: Film, action: () => setBottomTab('anim_audio') },
    { id: 'console', title: 'Open Console & Profiler', description: 'Engine commands, FPS, memory, draw calls, dan Wasm telemetry', category: 'Tools', icon: Terminal, action: () => setBottomTab('console_profiler') },
    { id: 'mobile', title: 'Test on Mobile via QR', description: 'Buka QR live-testing dengan real-time PC ↔ HP sync', category: 'Tools', icon: QrCode, action: () => setShowMobileModal(true) },
    { id: 'git', title: 'Open Visual Version Control', description: 'Snapshot, branch, 3D scene diff, checkout, dan merge', category: 'Tools', icon: GitBranch, keywords: 'visual git history', action: () => setShowGitModal(true) },
    { id: 'snapshot', title: 'Create Scene Snapshot', description: 'Simpan working scene sebagai restore point baru', category: 'Tools', icon: Command, action: () => { createSnapshot(`Workspace snapshot ${new Date().toLocaleTimeString('id-ID')}`); setShowGitModal(true); } },
    { id: 'publish', title: 'Publish & Multi-Platform Export', description: 'Instant URL, HTML5, Desktop, Mobile, dan monetization', category: 'Tools', icon: Rocket, action: () => setShowPublishModal(true) },
    { id: 'reset-layout', title: 'Reset Docking Layout', description: 'Kembalikan ukuran semua panel ke default', category: 'Tools', icon: RotateCcw, action: resetDockLayout },
  ], [saveProjectNow, undo, redo, quickSpawn, requestRightPanelTab, simState, createSnapshot, resetDockLayout]);

  const beginResize = (kind: 'left' | 'right' | 'bottom', event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = leftWidth;
    const startRight = rightWidth;
    const startBottom = bottomHeight;
    document.body.style.cursor = kind === 'bottom' ? 'row-resize' : 'col-resize';
    const move = (ev: PointerEvent) => {
      if (kind === 'left') setLeftWidth(Math.min(360, Math.max(180, startLeft + ev.clientX - startX)));
      if (kind === 'right') setRightWidth(Math.min(440, Math.max(270, startRight - (ev.clientX - startX))));
      if (kind === 'bottom') setBottomHeight(Math.min(430, Math.max(150, startBottom - (ev.clientY - startY))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (view === 'dashboard') {
    return <DashboardView savedProjects={savedProjects} onOpenSavedProject={openSavedProject} onOpenTemplate={openTemplate} onCreateBlank={createBlank} opfsInfo={opfsInfo} />;
  }

  return (
    <div className="h-screen w-screen bg-[#090d16] flex flex-col overflow-hidden">
      <TopBar
        projectName={projectMeta.name}
        onRenameProject={(name) => setProjectMeta((prev) => ({ ...prev, name }))}
        onGoDashboard={() => { saveProjectNow(false); setView('dashboard'); setSimState('stopped'); }}
        currentBranch={currentBranch}
        onOpenVisualGit={() => setShowGitModal(true)}
        cloudStatusText={cloudStatusText}
        onManualSave={() => saveProjectNow(true)}
        simState={simState}
        onPlayToggle={() => {
          const next = simState === 'stopped' ? 'playing' : 'stopped';
          setSimState(next);
          log(next === 'playing' ? 'physics' : 'info', 'Simulation', next === 'playing' ? 'Play mode aktif • WASD + Space • scripts & Wasm hot-reload enabled.' : 'Simulation stopped • authored transforms restored.');
        }}
        onPauseToggle={() => setSimState((state) => state === 'paused' ? 'playing' : state === 'playing' ? 'paused' : state)}
        onStepFrame={() => { setSimState('paused'); setStepTrigger((v) => v + 1); }}
        targetPlatform={targetPlatform}
        onChangeTargetPlatform={setTargetPlatform}
        collaborators={collaborators}
        simulatedCollabActive={simulatedCollabActive}
        onToggleSimulatedCollab={() => setSimulatedCollabActive((v) => !v)}
        followPeerId={followPeerId}
        onFollowPeer={setFollowPeerId}
        onOpenMobileQR={() => setShowMobileModal(true)}
        onOpenShare={() => setShowShareModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenPublishExport={() => setShowPublishModal(true)}
        onQuickSpawn={quickSpawn}
        onDuplicateSelected={() => selectedId && duplicateEntity(selectedId)}
        onDeleteSelected={() => selectedId && deleteEntity(selectedId)}
        onResetDockLayout={resetDockLayout}
        postProcessing={postProcessing}
        onUpdatePostProcessing={(patch) => { pushHistory(); setPostProcessing((prev) => ({ ...prev, ...patch })); }}
      />

      <div className="flex-1 min-h-0 flex">
        <div className="hidden md:block shrink-0" style={{ width: leftWidth }}>
          <SceneHierarchy
            entities={entities}
            selectedId={selectedId}
            onSelectEntity={setSelectedId}
            onUpdateEntity={updateEntity}
            onDeleteEntity={deleteEntity}
            onDuplicateEntity={duplicateEntity}
            onQuickSpawn={quickSpawn}
            collaborators={collaborators}
            comments={comments}
          />
        </div>
        <div className="resizer-h hidden md:block" onPointerDown={(e) => beginResize('left', e)} />

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-[180px]">
            <Viewport3D
              entities={entities}
              selectedId={selectedId}
              onSelectEntity={setSelectedId}
              onTransformCommit={(id, position, rotation, scale) => updateEntity(id, { position, rotation, scale })}
              onDropAsset={(asset, hitPos, targetId) => useAsset(asset, hitPos, targetId)}
              gizmoMode={gizmoMode}
              onChangeGizmoMode={setGizmoMode}
              is2DMode={is2DMode}
              onToggle2DMode={setIs2DMode}
              postProcessing={postProcessing}
              onUpdatePostProcessing={(patch) => { pushHistory(); setPostProcessing((prev) => ({ ...prev, ...patch })); }}
              simState={simState}
              stepTrigger={stepTrigger}
              targetPlatform={targetPlatform}
              visualGraph={visualGraph}
              animationTracks={animationTracks}
              timelineTime={timelineTime}
              isTimelinePlaying={isTimelinePlaying}
              texturePacks={texturePacks}
              collaborators={collaborators}
              comments={comments}
              onAddComment={addComment}
              onResolveComment={(commentId) => { pushHistory(); setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, resolved: !c.resolved } : c)); }}
              onReplyComment={(commentId, text) => { pushHistory(); setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, replies: [...c.replies, { id: uid('reply'), author: 'You', text, createdAt: Date.now() }] } : c)); }}
              onProfilerSample={(sample) => setProfilerHistory((prev) => [...prev.slice(-79), sample])}
              onConsoleLog={log}
              onPlayerCursorMove={(position) => {
                const now = performance.now();
                if (now - cursorThrottleRef.current > 65) {
                  cursorThrottleRef.current = now;
                  collabRef.current?.broadcastCursor(position, selectedId);
                }
              }}
              followPeerId={followPeerId}
            />
          </div>
          <div className="resizer-v" onPointerDown={(e) => beginResize('bottom', e)} />
          <div className="shrink-0" style={{ height: bottomHeight }}>
            <BottomPanel
              activeTab={bottomTab}
              onChangeTab={setBottomTab}
              assets={assets}
              onDownloadCloudAsset={downloadCloudAsset}
              onUseAsset={(asset) => useAsset(asset)}
              texturePacks={texturePacks}
              onApplyTextureToSelected={applyTextureToSelected}
              selectedEntity={selectedEntity}
              onUpdateEntity={updateEntity}
              visualGraph={visualGraph}
              onUpdateVisualGraph={(graph) => { pushHistory(); setVisualGraph(graph); if (simState === 'playing') log('info', 'BlueprintHotReload', 'Graph changes applied to live simulation without restart.'); }}
              animationTracks={animationTracks}
              timelineTime={timelineTime}
              onChangeTimelineTime={setTimelineTime}
              isTimelinePlaying={isTimelinePlaying}
              onToggleTimelinePlay={() => setIsTimelinePlaying((v) => !v)}
              onAddKeyframe={addKeyframe}
              logs={logs}
              onClearLogs={() => setLogs([])}
              onConsoleCommand={handleConsoleCommand}
              profilerHistory={profilerHistory}
              opfsInfo={opfsInfo}
            />
          </div>
        </div>

        <div className="resizer-h hidden lg:block" onPointerDown={(e) => beginResize('right', e)} />
        <div className="hidden lg:block shrink-0" style={{ width: rightWidth }}>
          <RightPanel
            selectedEntity={selectedEntity}
            allEntities={entities}
            onUpdateEntity={updateEntity}
            texturePacks={texturePacks}
            onRegisterTexturePack={registerTexturePack}
            onConsoleLog={log}
            onOpenCodeTab={() => setBottomTab('scripting')}
            requestedTab={rightPanelTab}
            requestId={rightPanelRequestId}
          />
        </div>
      </div>

      {/* Editor status bar + accessible undo/redo controls */}
      <footer className="h-6 px-2 bg-[#080c14] border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button disabled={!historySizes.past} onClick={undo} className="flex items-center gap-1 hover:text-cyan-300 disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 className="w-3 h-3" />Undo</button>
          <button disabled={!historySizes.future} onClick={redo} className="flex items-center gap-1 hover:text-cyan-300 disabled:opacity-30" title="Redo (Ctrl+Y)"><Redo2 className="w-3 h-3" />Redo</button>
          <span className="text-slate-800">|</span>
          <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3 h-3" />Ready</span>
          <span className="hidden sm:flex items-center gap-1"><Cpu className="w-3 h-3 text-purple-400" />Wasm native</span>
          <span className="hidden md:flex items-center gap-1"><Cloud className="w-3 h-3 text-cyan-400" />{cloudStatusText}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:flex items-center gap-1"><Users className="w-3 h-3 text-purple-400" />{collaborators.length + 1} online</span>
          <span className="hidden md:flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-400" />CRDT synced</span>
          <span className="flex items-center gap-1"><GitBranch className="w-3 h-3 text-purple-400" />{currentBranch}</span>
          <ChevronRight className="w-3 h-3 text-slate-700" />
          <span className="text-cyan-400 flex items-center gap-1"><Zap className="w-3 h-3" />60 Hz</span>
        </div>
      </footer>

      <ShareWorkspaceModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        projectName={projectMeta.name}
        templateId={projectMeta.templateId}
        roomName={roomName}
        currentBranch={currentBranch}
        collaborators={collaborators}
        comments={comments}
        entities={entities}
        onSelectEntity={(entityId) => { setSelectedId(entityId); setShowShareModal(false); }}
        onOpenMobileTest={() => { setShowShareModal(false); setShowMobileModal(true); }}
      />
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commandActions}
      />
      <MobileLiveModal
        isOpen={showMobileModal}
        onClose={() => setShowMobileModal(false)}
        roomName={roomName}
        projectName={projectMeta.name}
        entities={entities}
        onQuickTweakColor={(entityId, hex) => {
          const entity = entities.find((e) => e.id === entityId);
          if (entity) updateEntity(entityId, { material: { ...entity.material, albedo: hex, emissive: hex } });
        }}
      />
      <VisualGitModal
        isOpen={showGitModal}
        onClose={() => setShowGitModal(false)}
        snapshots={snapshots}
        currentBranch={currentBranch}
        currentEntities={entities}
        onCreateSnapshot={createSnapshot}
        onCreateBranch={createBranch}
        onCheckoutSnapshot={checkoutSnapshot}
        onMergeSnapshot={mergeSnapshot}
      />
      <PublishExportModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        projectName={projectMeta.name}
        roomName={roomName}
        entities={entities}
        postProcessing={postProcessing}
        onConsoleLog={log}
      />
    </div>
  );
};

const App: React.FC = () => {
  const mode = new URLSearchParams(window.location.search).get('mode');
  if (mode === 'mobile') return <MobileStandaloneView />;
  if (mode === 'play') return <MobileStandaloneView desktopMode />;
  return <StudioApplication />;
};

export default App;
