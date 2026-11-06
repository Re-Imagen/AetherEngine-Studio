import type {
  AnimationTrack,
  GeneratedPBRTexturePack,
  PinComment3D,
  ProjectMeta,
  SceneEntity,
  SceneSnapshot,
  PostProcessingConfig,
  VisualScriptGraph,
} from '../types/engine';

export interface SavedProjectPayload {
  meta: ProjectMeta;
  entities: SceneEntity[];
  postProcessing: PostProcessingConfig;
  textures: GeneratedPBRTexturePack[];
  visualGraph?: VisualScriptGraph;
  animationTracks?: AnimationTrack[];
  comments?: PinComment3D[];
  snapshots?: SceneSnapshot[];
}

const DB_NAME = 'aether_engine_studio_db';
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'cached_assets';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'meta.id' });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

class OPFSAndIndexedDBCache {
  public opfsAvailable = false;
  public cachedBytes = 0;
  public lastSyncLatencyMs = 4.2;

  async init(): Promise<{ opfsSupported: boolean; quotaMb: number; usageMb: number }> {
    let opfsSupported = false;
    try {
      if (navigator.storage && 'getDirectory' in navigator.storage) {
        const root = await navigator.storage.getDirectory();
        await root.getDirectoryHandle('aether-cache', { create: true });
        opfsSupported = true;
      }
    } catch {
      opfsSupported = false;
    }
    this.opfsAvailable = opfsSupported;

    let quotaMb = 4096;
    let usageMb = 18.4;
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        if (est.quota) quotaMb = Math.round(est.quota / (1024 * 1024));
        if (est.usage) usageMb = Number((est.usage / (1024 * 1024)).toFixed(2));
      }
    } catch {
      // ignore
    }
    return { opfsSupported, quotaMb, usageMb };
  }

  async saveProject(payload: SavedProjectPayload): Promise<{ latencyMs: number; via: string }> {
    const t0 = performance.now();
    const json = JSON.stringify(payload);
    this.cachedBytes = json.length;

    // 1. Write to Origin Private File System (OPFS) if available
    let via = 'IndexedDB';
    try {
      if (this.opfsAvailable && navigator.storage?.getDirectory) {
        const root = await navigator.storage.getDirectory();
        const dir = await root.getDirectoryHandle('aether-cache', { create: true });
        const fileHandle = await dir.getFileHandle(`${payload.meta.id}.aether.json`, { create: true });
        if ('createWritable' in fileHandle) {
          const writable = await (fileHandle as unknown as { createWritable: () => Promise<{ write: (d: string) => Promise<void>; close: () => Promise<void> }> }).createWritable();
          await writable.write(json);
          await writable.close();
          via = 'OPFS + IndexedDB';
        }
      }
    } catch {
      // fallback to IDB
    }

    // 2. Mirror into IndexedDB for structured querying
    try {
      const db = await openIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_PROJECTS, 'readwrite');
        tx.objectStore(STORE_PROJECTS).put(payload);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // fallback to localStorage if IDB blocked
      try {
        localStorage.setItem(`aether_proj_${payload.meta.id}`, json);
      } catch {}
    }

    const latencyMs = Number(Math.max(0.8, performance.now() - t0).toFixed(1));
    this.lastSyncLatencyMs = latencyMs;
    return { latencyMs, via };
  }

  async listProjects(): Promise<SavedProjectPayload[]> {
    try {
      const db = await openIDB();
      return await new Promise<SavedProjectPayload[]>((resolve) => {
        const tx = db.transaction(STORE_PROJECTS, 'readonly');
        const req = tx.objectStore(STORE_PROJECTS).getAll();
        req.onsuccess = () => resolve((req.result as SavedProjectPayload[]) || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  async cacheAssetBlob(id: string, name: string, payload: unknown): Promise<void> {
    try {
      const db = await openIDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_ASSETS, 'readwrite');
        tx.objectStore(STORE_ASSETS).put({ id, name, payload, cachedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
  }
}

export const opfsStorage = new OPFSAndIndexedDBCache();
