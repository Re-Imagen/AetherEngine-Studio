import type { CollaboratorPresence, PinComment3D, SceneEntity, Vec3 } from '../types/engine';

export type CollabEventMessage =
  | { type: 'scene_sync'; scene: SceneEntity[]; lamport: number }
  | { type: 'entity_patch'; entityId: string; patch: Partial<SceneEntity>; lamport: number }
  | { type: 'cursor_move'; peerId: string; name: string; role: string; color: string; cursor3D: Vec3; selectedEntityId: string | null }
  | { type: 'comment_add'; comment: PinComment3D }
  | { type: 'presence'; peers: { peerId: string; name: string; color: string; role: string }[] }
  | { type: 'welcome'; sceneSnapshot?: SceneEntity[] | null; peers?: { peerId: string; name: string; color: string; role: string }[] };

export class AetherCollabClient {
  private ws: WebSocket | null = null;
  private bc: BroadcastChannel | null = null;
  private lamport = 1;
  private listeners = new Set<(msg: CollabEventMessage) => void>();
  public readonly peerId: string;
  public connected = false;
  public room: string;
  public userName: string;
  public userColor: string;
  public role: string;

  constructor(room = 'eldoria-main', userName = 'You (Lead Dev)', userColor = '#00f0ff', role = 'editor') {
    this.peerId = `peer-${Math.random().toString(36).slice(2, 9)}`;
    this.room = room;
    this.userName = userName;
    this.userColor = userColor;
    this.role = role;
  }

  public connect(): void {
    if (typeof window === 'undefined') return;

    // 1. Local BroadcastChannel for zero-latency multi-tab & embedded mobile sync
    try {
      this.bc = new BroadcastChannel(`aether-crdt-${this.room}`);
      this.bc.onmessage = (ev) => {
        const data = ev.data as CollabEventMessage & { fromPeerId?: string };
        if (data && data.fromPeerId !== this.peerId) {
          this.emit(data);
        }
      };
    } catch {
      // BroadcastChannel optional
    }

    // 2. Relative WebSocket to Vite / Server Hub (works across devices via QR scan!)
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({
        room: this.room,
        peerId: this.peerId,
        name: this.userName,
        color: this.userColor,
        role: this.role,
      });
      const wsUrl = `${proto}//${window.location.host}/aether-ws?${params.toString()}`;
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        this.connected = true;
      };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as CollabEventMessage & { lamport?: number };
          if (typeof msg.lamport === 'number') {
            this.lamport = Math.max(this.lamport, msg.lamport) + 1;
          }
          this.emit(msg);
        } catch {}
      };
      this.ws.onclose = () => {
        this.connected = false;
      };
      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch {
      this.connected = false;
    }
  }

  public disconnect(): void {
    try { this.ws?.close(); } catch {}
    try { this.bc?.close(); } catch {}
    this.ws = null;
    this.bc = null;
    this.connected = false;
  }

  public onMessage(cb: (msg: CollabEventMessage) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(msg: CollabEventMessage): void {
    for (const cb of this.listeners) cb(msg);
  }

  private sendRaw(payload: Record<string, unknown>): void {
    const withMeta = { ...payload, fromPeerId: this.peerId };
    try {
      this.bc?.postMessage(withMeta);
    } catch {}
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(withMeta));
      } catch {}
    }
  }

  public broadcastSceneSync(scene: SceneEntity[]): void {
    this.lamport += 1;
    this.sendRaw({ type: 'scene_sync', scene, lamport: this.lamport });
  }

  public broadcastEntityPatch(entityId: string, patch: Partial<SceneEntity>): void {
    this.lamport += 1;
    this.sendRaw({ type: 'entity_patch', entityId, patch, lamport: this.lamport });
  }

  public broadcastCursor(cursor3D: Vec3, selectedEntityId: string | null): void {
    this.sendRaw({
      type: 'cursor_move',
      peerId: this.peerId,
      name: this.userName,
      role: this.role,
      color: this.userColor,
      cursor3D,
      selectedEntityId,
    });
  }

  public broadcastComment(comment: PinComment3D): void {
    this.sendRaw({ type: 'comment_add', comment });
  }
}

export const INITIAL_SIMULATED_TEAMMATES: CollaboratorPresence[] = [
  {
    peerId: 'sim-rizky',
    name: 'Rizky Pratama',
    role: 'Gameplay Programmer',
    color: '#34d399',
    cursor3D: [3.2, 1.5, -1.2],
    selectedEntityId: 'aether-crystal',
    isSimulated: true,
  },
  {
    peerId: 'sim-nadia',
    name: 'Nadia Kusuma',
    role: '3D Environment Artist',
    color: '#f472b6',
    cursor3D: [-5.8, 1.4, 2.5],
    selectedEntityId: 'pine-west',
    isSimulated: true,
  },
];
