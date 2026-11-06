import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';

interface RoomPeer {
  ws: WebSocket;
  peerId: string;
  name: string;
  color: string;
  role: string;
  room: string;
}

function aetherCollabPlugin(): Plugin {
  const rooms = new Map<string, Set<RoomPeer>>();
  const roomScenes = new Map<string, unknown>();

  const attachHub = (httpServer: { on: (event: string, cb: (...args: any[]) => void) => void } | null) => {
    if (!httpServer) return;
    const wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = req.url || '';
      if (!url.startsWith('/aether-ws')) return;

      wss.handleUpgrade(req, socket, head, (ws) => {
        const parsed = new URL(url, 'http://localhost');
        const room = parsed.searchParams.get('room') || 'default-studio';
        const peerId = parsed.searchParams.get('peerId') || `peer-${Math.random().toString(36).slice(2, 8)}`;
        const name = parsed.searchParams.get('name') || 'Developer';
        const color = parsed.searchParams.get('color') || '#00f0ff';
        const role = parsed.searchParams.get('role') || 'editor';

        const peer: RoomPeer = { ws, peerId, name, color, role, room };
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room)!.add(peer);

        // Send initial room presence and cached scene if available
        const peersList = Array.from(rooms.get(room)!).map((p) => ({
          peerId: p.peerId,
          name: p.name,
          color: p.color,
          role: p.role,
        }));

        ws.send(
          JSON.stringify({
            type: 'welcome',
            room,
            peers: peersList,
            sceneSnapshot: roomScenes.get(room) ?? null,
            serverTime: Date.now(),
          })
        );

        const broadcastPresence = () => {
          const current = Array.from(rooms.get(room) || []).map((p) => ({
            peerId: p.peerId,
            name: p.name,
            color: p.color,
            role: p.role,
          }));
          const payload = JSON.stringify({ type: 'presence', peers: current });
          for (const p of rooms.get(room) || []) {
            if (p.ws.readyState === WebSocket.OPEN) {
              p.ws.send(payload);
            }
          }
        };

        broadcastPresence();

        ws.on('message', (raw) => {
          try {
            const msg = JSON.parse(raw.toString());
            if (msg.type === 'scene_sync' && msg.scene) {
              roomScenes.set(room, msg.scene);
            }
            const out = JSON.stringify({ ...msg, fromPeerId: peerId, ts: Date.now() });
            for (const p of rooms.get(room) || []) {
              if (p.peerId !== peerId && p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(out);
              }
            }
          } catch {
            // ignore malformed frame
          }
        });

        ws.on('close', () => {
          const set = rooms.get(room);
          if (set) {
            set.delete(peer);
            if (set.size === 0) rooms.delete(room);
            else broadcastPresence();
          }
        });
      });
    });
  };

  return {
    name: 'aether-collab-hub',
    configureServer(server) {
      server.middlewares.use('/api/status', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            engine: 'AetherEngine Studio Runtime',
            version: '1.0.0',
            crdtProtocol: 'LWW-Element-Set v2',
            activeRooms: rooms.size,
            storage: 'OPFS + Cloud R2 Ready',
          })
        );
      });
      attachHub(server.httpServer);
    },
    configurePreviewServer(server) {
      attachHub(server.httpServer);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), aetherCollabPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  build: {
    // The 3D runtime is intentionally substantial; keep it cached separately from UI code.
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three-engine';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react-vendor';
          if (id.includes('node_modules/qrcode/')) return 'qr-vendor';
        },
      },
    },
  },
});
