import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  Expand,
  Gamepad2,
  Loader2,
  Radio,
  RotateCcw,
  Smartphone,
  Sparkles,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { AetherCollabClient } from '../engine/collabClient';
import { buildEntityObject3D } from '../engine/meshBuilder';
import { GAME_TEMPLATES } from '../engine/templates';
import type { SceneEntity } from '../types/engine';

interface MobileStandaloneViewProps {
  desktopMode?: boolean;
}

export const MobileStandaloneView: React.FC<MobileStandaloneViewProps> = ({ desktopMode = false }) => {
  const params = new URLSearchParams(window.location.search);
  const room = params.get('room') || 'eldoria-main';
  const projectName = params.get('project') || 'Eldoria: Crystal Ruins';

  const mountRef = useRef<HTMLDivElement>(null);
  const entitiesRef = useRef<SceneEntity[]>(structuredClone(GAME_TEMPLATES[0].entities));
  const objectsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const collabRef = useRef<AetherCollabClient | null>(null);
  const joystickRef = useRef({ x: 0, y: 0 });
  const joystickDraggingRef = useRef(false);
  const jumpRequestedRef = useRef(false);
  const verticalVelocityRef = useRef(0);
  const keysRef = useRef<Record<string, boolean>>({});
  const localPlayerIdRef = useRef<string | null>(null);
  const lastBroadcastRef = useRef(0);

  const [entities, setEntities] = useState<SceneEntity[]>(entitiesRef.current);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'local'>('connecting');
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [fps, setFps] = useState(60);
  const [peerCount, setPeerCount] = useState(1);
  const [rendererError, setRendererError] = useState(false);

  entitiesRef.current = entities;

  // Connect this phone to the exact same CRDT room as the desktop editor.
  useEffect(() => {
    const client = new AetherCollabClient(room, 'Mobile Tester', '#f59e0b', 'mobile-tester');
    collabRef.current = client;
    const unsubscribe = client.onMessage((msg) => {
      if (msg.type === 'welcome') {
        setSyncStatus('live');
        if (msg.sceneSnapshot && msg.sceneSnapshot.length) {
          const next = structuredClone(msg.sceneSnapshot);
          entitiesRef.current = next;
          setEntities(next);
        }
        if (msg.peers) setPeerCount(msg.peers.length);
      } else if (msg.type === 'scene_sync') {
        setSyncStatus('live');
        const next = structuredClone(msg.scene);
        // Preserve the locally controlled player's latest position between full snapshots.
        const localId = localPlayerIdRef.current;
        const previousPlayer = localId ? entitiesRef.current.find((e) => e.id === localId) : null;
        if (previousPlayer) {
          const incomingPlayer = next.find((e) => e.id === localId);
          if (incomingPlayer && Date.now() - lastBroadcastRef.current < 450) {
            incomingPlayer.position = [...previousPlayer.position];
          }
        }
        entitiesRef.current = next;
        setEntities(next);
      } else if (msg.type === 'entity_patch') {
        setSyncStatus('live');
        const next = entitiesRef.current.map((entity) =>
          entity.id === msg.entityId ? { ...entity, ...msg.patch } : entity,
        );
        entitiesRef.current = next;
        setEntities(next);
      } else if (msg.type === 'presence') {
        setSyncStatus('live');
        setPeerCount(msg.peers.length);
      }
    });
    client.connect();

    const fallbackTimer = window.setTimeout(() => {
      setSyncStatus((current) => (current === 'connecting' ? 'local' : current));
    }, 3500);
    const presenceTimer = window.setInterval(() => {
      const player = entitiesRef.current.find((e) => e.physics?.isPlayerControlled || e.tag === 'Player');
      client.broadcastCursor(player?.position || [0, 1, 0], player?.id || null);
    }, 1200);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearInterval(presenceTimer);
      unsubscribe();
      client.disconnect();
      collabRef.current = null;
    };
  }, [room]);

  // Lightweight, touch-optimized Three.js runtime. It uses the exact same mesh factory as the editor.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setRendererError(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07101d');
    scene.fog = new THREE.FogExp2('#07101d', 0.025);
    sceneRef.current = scene;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(54, mount.clientWidth / mount.clientHeight, 0.1, 180);
    camera.position.set(8, 7, 12);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    scene.add(new THREE.HemisphereLight('#67e8f9', '#171032', 1.6));
    const sun = new THREE.DirectionalLight('#dbeafe', 3.2);
    sun.position.set(7, 13, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const rim = new THREE.PointLight('#a855f7', 18, 24);
    rim.position.set(-4, 5, -3);
    scene.add(rim);
    const grid = new THREE.GridHelper(42, 42, '#155e75', '#1e293b');
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.32;
    scene.add(grid);

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
    let last = performance.now();
    let fpsStart = last;
    let frames = 0;
    const cameraTarget = new THREE.Vector3(0, 1, 0);

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(0.04, Math.max(0.001, (now - last) / 1000));
      last = now;
      frames += 1;
      if (now - fpsStart > 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsStart)));
        frames = 0;
        fpsStart = now;
      }

      const all = entitiesRef.current;
      const player = all.find((e) => e.physics?.isPlayerControlled || e.tag === 'Player');
      if (player) {
        localPlayerIdRef.current = player.id;
        let x = joystickRef.current.x;
        let z = joystickRef.current.y;
        if (keysRef.current.KeyA || keysRef.current.ArrowLeft) x -= 1;
        if (keysRef.current.KeyD || keysRef.current.ArrowRight) x += 1;
        if (keysRef.current.KeyW || keysRef.current.ArrowUp) z -= 1;
        if (keysRef.current.KeyS || keysRef.current.ArrowDown) z += 1;
        const length = Math.hypot(x, z);
        const moving = length > 0.06;
        if (moving) {
          x /= Math.max(1, length);
          z /= Math.max(1, length);
          const speed = (player.physics?.moveSpeed || 6) * 0.85;
          player.position = [
            player.position[0] + x * speed * dt,
            player.position[1],
            player.position[2] + z * speed * dt,
          ];
          player.rotation = [player.rotation[0], Math.atan2(x, z) * (180 / Math.PI), player.rotation[2]];
        }

        if ((jumpRequestedRef.current || keysRef.current.Space) && player.position[1] <= 0.12) {
          verticalVelocityRef.current = player.physics?.jumpForce || 8.5;
          jumpRequestedRef.current = false;
          keysRef.current.Space = false;
        }
        verticalVelocityRef.current -= 19 * dt;
        const nextY = Math.max(0, player.position[1] + verticalVelocityRef.current * dt);
        if (nextY === 0) verticalVelocityRef.current = 0;
        player.position = [player.position[0], nextY, player.position[2]];

        const object = objectsRef.current.get(player.id);
        if (object) {
          object.position.set(...player.position);
          object.rotation.y = THREE.MathUtils.degToRad(player.rotation[1]);
          if (moving) {
            object.position.y += Math.abs(Math.sin(now * 0.012)) * 0.035;
          }
        }

        if ((moving || Math.abs(nextY) > 0.01) && now - lastBroadcastRef.current > 70) {
          lastBroadcastRef.current = now;
          collabRef.current?.broadcastEntityPatch(player.id, {
            position: [...player.position],
            rotation: [...player.rotation],
          });
        }

        cameraTarget.lerp(new THREE.Vector3(player.position[0], player.position[1] + 1.1, player.position[2]), 0.06);
        const desired = new THREE.Vector3(player.position[0] + 7.2, player.position[1] + 6.2, player.position[2] + 10.5);
        camera.position.lerp(desired, 0.035);
        camera.lookAt(cameraTarget);
      }

      // Small runtime touches keep the mirrored world alive without running editor gizmos.
      for (const entity of all) {
        if (entity.meshPrimitive === 'crystal') {
          const obj = objectsRef.current.get(entity.id);
          if (obj) {
            obj.rotation.y += dt * 0.55;
            obj.position.y = entity.position[1] + Math.sin(now * 0.0022) * 0.16;
          }
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current[event.code] = true;
      if (event.code === 'Space') event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      objectsRef.current.clear();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, []);

  // Reconcile remote and local scene state into the mobile scene graph.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const validIds = new Set(entities.map((e) => e.id));
    for (const [id, object] of objectsRef.current) {
      if (!validIds.has(id)) {
        scene.remove(object);
        objectsRef.current.delete(id);
      }
    }

    for (const entity of entities) {
      const signature = JSON.stringify({
        type: entity.type,
        primitive: entity.meshPrimitive,
        material: entity.material,
        light: entity.light,
        particle: entity.particle,
      });
      let object = objectsRef.current.get(entity.id);
      if (!object || object.userData.mobileBuildSig !== signature) {
        if (object) scene.remove(object);
        object = buildEntityObject3D(entity, 'lit', []);
        // Mobile GPU budget: retain the effect while drawing a bounded particle subset.
        object.traverse((child) => {
          if (child instanceof THREE.Points) {
            const count = child.geometry.getAttribute('position')?.count || 0;
            child.geometry.setDrawRange(0, Math.min(5000, count));
          }
        });
        object.userData.mobileBuildSig = signature;
        scene.add(object);
        objectsRef.current.set(entity.id, object);
      }
      object.position.set(...entity.position);
      object.rotation.set(
        THREE.MathUtils.degToRad(entity.rotation[0]),
        THREE.MathUtils.degToRad(entity.rotation[1]),
        THREE.MathUtils.degToRad(entity.rotation[2]),
      );
      object.scale.set(...entity.scale);
      object.visible = entity.visible && entity.type !== 'camera';
      const helper = object.getObjectByName('editor_helper');
      if (helper) helper.visible = false;
    }
  }, [entities]);

  const updateJoystick = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!joystickDraggingRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const maxRadius = rect.width * 0.32;
    const distance = Math.hypot(dx, dy);
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }
    joystickRef.current = { x: dx / maxRadius, y: dy / maxRadius };
    setKnob({ x: dx, y: dy });
  };

  const resetJoystick = () => {
    joystickDraggingRef.current = false;
    joystickRef.current = { x: 0, y: 0 };
    setKnob({ x: 0, y: 0 });
  };

  return (
    <div className="fixed inset-0 bg-[#070b14] overflow-hidden touch-none select-none text-white">
      <div ref={mountRef} className="absolute inset-0" />

      {rendererError && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-[#070b14]">
          <div><WifiOff className="w-10 h-10 mx-auto text-rose-400 mb-3" /><h1 className="font-bold">WebGL tidak tersedia</h1><p className="text-sm text-slate-400 mt-2">Aktifkan hardware acceleration lalu muat ulang live test.</p></div>
        </div>
      )}

      {/* Mobile game HUD */}
      <div className="absolute top-0 inset-x-0 p-3 pt-[max(12px,env(safe-area-inset-top))] flex items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <a href={window.location.pathname} className="w-9 h-9 rounded-xl bg-slate-950/70 backdrop-blur border border-slate-700/70 flex items-center justify-center text-slate-300" title="Keluar Live Test">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="px-3 py-2 rounded-xl bg-slate-950/70 backdrop-blur border border-slate-700/60">
            <div className="text-[11px] font-bold max-w-[150px] truncate">{projectName}</div>
            <div className="text-[9px] text-cyan-300 flex items-center gap-1 mt-0.5"><Gamepad2 className="w-3 h-3" /> Aether Live Runtime</div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="px-2.5 py-2 rounded-xl bg-slate-950/70 backdrop-blur border border-slate-700/60 text-right">
            <div className={`text-[9px] font-semibold flex items-center gap-1 ${syncStatus === 'live' ? 'text-emerald-300' : syncStatus === 'local' ? 'text-amber-300' : 'text-cyan-300'}`}>
              {syncStatus === 'connecting' ? <Loader2 className="w-3 h-3 animate-spin" /> : syncStatus === 'live' ? <Wifi className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
              {syncStatus === 'live' ? `${peerCount} peers • CRDT LIVE` : syncStatus === 'local' ? 'LOCAL CACHE' : 'CONNECTING'}
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">{fps} FPS • {entities.length} nodes</div>
          </div>
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
            className="w-9 h-9 rounded-xl bg-slate-950/70 backdrop-blur border border-slate-700/70 hidden sm:flex items-center justify-center text-slate-300"
          ><Expand className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Mission / sync hint */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-slate-950/55 backdrop-blur border border-cyan-500/20 text-[9px] text-cyan-100 whitespace-nowrap flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-purple-300" /> Perubahan di PC muncul di sini secara real-time
        </div>
      </div>

      {/* Bottom touch controls */}
      <div className="absolute inset-x-0 bottom-0 pb-[max(24px,env(safe-area-inset-bottom))] px-6 flex items-end justify-between pointer-events-none">
        <div
          className="w-36 h-36 rounded-full bg-slate-950/35 border border-white/15 backdrop-blur-sm relative pointer-events-auto touch-none"
          onPointerDown={(event) => {
            joystickDraggingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            updateJoystick(event);
          }}
          onPointerMove={updateJoystick}
          onPointerUp={resetJoystick}
          onPointerCancel={resetJoystick}
        >
          <div className="absolute inset-5 rounded-full border border-cyan-300/10" />
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[9px] text-white/30">▲</div>
          <div className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[9px] text-white/30">▼</div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-white/30">◀</div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/30">▶</div>
          <div
            className="absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 rounded-full bg-gradient-to-br from-cyan-400/70 to-purple-500/70 border-2 border-white/35 shadow-lg shadow-cyan-500/20 flex items-center justify-center"
            style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
          >
            <Smartphone className="w-5 h-5 text-white/70" />
          </div>
        </div>

        <div className="flex items-end gap-3 pointer-events-auto">
          <button
            onClick={() => {
              const player = entitiesRef.current.find((e) => e.physics?.isPlayerControlled || e.tag === 'Player');
              if (player) {
                player.position = [0, 0, 4];
                collabRef.current?.broadcastEntityPatch(player.id, { position: [0, 0, 4] });
              }
            }}
            className="w-12 h-12 mb-2 rounded-full bg-slate-950/55 border border-white/20 backdrop-blur flex items-center justify-center text-slate-300 active:scale-95"
            title="Reset player"
          ><RotateCcw className="w-4 h-4" /></button>
          <button
            onPointerDown={() => { jumpRequestedRef.current = true; }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/80 to-purple-600/80 border-2 border-cyan-200/50 shadow-[0_0_30px_rgba(0,240,255,.18)] backdrop-blur flex flex-col items-center justify-center active:scale-95 transition"
          >
            <Zap className="w-6 h-6 fill-current" /><span className="text-[10px] font-bold tracking-widest mt-1">JUMP</span>
          </button>
        </div>
      </div>

      {desktopMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-700 text-[10px] text-slate-400 pointer-events-none">
          WASD / Arrow Keys untuk bergerak • Space untuk melompat
        </div>
      )}
    </div>
  );
};
