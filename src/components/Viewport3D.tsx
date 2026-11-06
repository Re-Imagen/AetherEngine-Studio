import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  MousePointer,
  Move,
  RotateCw,
  Maximize2,
  MessageSquarePlus,
  Grid3X3,
  Magnet,
  Eye,
  Sparkles,
  Smartphone,
  Glasses,
  Send,
  ShoppingBag,
  X,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import type {
  AnimStateName,
  AnimationTrack,
  AssetItem,
  CollaboratorPresence,
  GeneratedPBRTexturePack,
  GizmoMode,
  PinComment3D,
  PostProcessingConfig,
  ProfilerSample,
  SceneEntity,
  ShadingMode,
  SimState,
  TargetPlatform,
  Vec3,
  VisualScriptGraph,
} from '../types/engine';
import { buildEntityObject3D } from '../engine/meshBuilder';
import { aetherWasm } from '../engine/wasmCore';
import { transpileAetherTS, generateNPCDialogueReply } from '../engine/aiCopilot';
import { spatialAudio } from '../engine/spatialAudio';

interface Viewport3DProps {
  entities: SceneEntity[];
  selectedId: string | null;
  onSelectEntity: (id: string | null) => void;
  onTransformCommit: (id: string, pos: Vec3, rot: Vec3, scale: Vec3) => void;
  onDropAsset: (asset: AssetItem, hitPos: Vec3, targetEntityId: string | null) => void;
  gizmoMode: GizmoMode;
  onChangeGizmoMode: (mode: GizmoMode) => void;
  is2DMode: boolean;
  onToggle2DMode: (val: boolean) => void;
  postProcessing: PostProcessingConfig;
  onUpdatePostProcessing: (patch: Partial<PostProcessingConfig>) => void;
  simState: SimState;
  stepTrigger: number;
  targetPlatform: TargetPlatform;
  visualGraph: VisualScriptGraph;
  animationTracks: AnimationTrack[];
  timelineTime: number;
  isTimelinePlaying: boolean;
  texturePacks: GeneratedPBRTexturePack[];
  collaborators: CollaboratorPresence[];
  comments: PinComment3D[];
  onAddComment: (entityId: string, text: string, offset: Vec3) => void;
  onResolveComment: (commentId: string) => void;
  onReplyComment: (commentId: string, text: string) => void;
  onProfilerSample: (sample: ProfilerSample) => void;
  onConsoleLog: (level: 'info' | 'warn' | 'error' | 'physics' | 'wasm' | 'ai', source: string, msg: string) => void;
  onPlayerCursorMove?: (pos: Vec3) => void;
  followPeerId?: string | null;
}

const AetherColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uGradeMode: { value: 1 }, // 0=aces, 1=cyberpunk, 2=warm, 3=noir
    uSSAO: { value: 0.5 },
    uDOF: { value: 0.0 },
    uMotionBlur: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uGradeMode;
    uniform float uSSAO;
    uniform float uDOF;
    uniform float uMotionBlur;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      vec4 base = texture2D(tDiffuse, uv);

      // Subtle radial motion blur / DOF edge sampling when enabled
      if (uMotionBlur > 0.01 || uDOF > 0.01) {
        vec2 dir = (uv - 0.5) * (uMotionBlur * 0.018 + uDOF * 0.014);
        vec4 s1 = texture2D(tDiffuse, uv - dir);
        vec4 s2 = texture2D(tDiffuse, uv + dir);
        float edgeMask = smoothstep(0.15, 0.72, length(uv - 0.5));
        base = mix(base, (base + s1 + s2) / 3.0, clamp(edgeMask * (uDOF + uMotionBlur), 0.0, 0.85));
      }

      vec3 col = base.rgb;
      if (uGradeMode > 0.5 && uGradeMode < 1.5) {
        // Cyberpunk Cyan-Purple push
        col.r *= 1.03;
        col.b *= 1.12;
        col = pow(max(col, vec3(0.0)), vec3(0.95));
      } else if (uGradeMode > 1.5 && uGradeMode < 2.5) {
        // Warm Fantasy
        col.r *= 1.12;
        col.g *= 1.03;
        col.b *= 0.90;
      } else if (uGradeMode > 2.5) {
        // Noir High-Contrast
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(luma), col, 0.25);
        col = smoothstep(0.04, 0.96, col);
      }

      // Ambient Occlusion & Studio Vignette depth cue
      float vig = smoothstep(0.95, 0.28, length(uv - 0.5));
      col *= mix(1.0, vig, uSSAO * 0.42);

      gl_FragColor = vec4(col, base.a);
    }
  `,
};

interface RuntimeBodyState {
  vy: number;
  vx: number;
  vz: number;
  isGrounded: boolean;
  baseY: number;
  compiledFn?: ((entity: any, dt: number, input: any, world: any) => void) | null;
  compiledCodeSrc?: string;
  animState: AnimStateName;
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  entities,
  selectedId,
  onSelectEntity,
  onTransformCommit,
  onDropAsset,
  gizmoMode,
  onChangeGizmoMode,
  is2DMode,
  onToggle2DMode,
  postProcessing,
  onUpdatePostProcessing,
  simState,
  stepTrigger,
  targetPlatform,
  visualGraph,
  animationTracks,
  timelineTime,
  isTimelinePlaying,
  texturePacks,
  collaborators,
  comments,
  onAddComment,
  onResolveComment,
  onReplyComment,
  onProfilerSample,
  onConsoleLog,
  onPlayerCursorMove,
  followPeerId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [isOrtho, setIsOrtho] = useState(false);
  const [webgpuSupported, setWebgpuSupported] = useState(false);
  const [fpsBadge, setFpsBadge] = useState(60);
  const [activeAnimStateHud, setActiveAnimStateHud] = useState<AnimStateName>('Idle');

  // Projected 2D screen coords for 3D Collaborator Cursors & 3D Pinned Comments
  const [projectedPeers, setProjectedPeers] = useState<
    { peer: CollaboratorPresence; x: number; y: number; visible: boolean }[]
  >([]);
  const [projectedComments, setProjectedComments] = useState<
    { comment: PinComment3D; x: number; y: number; visible: boolean }[]
  >([]);

  // Comment creation / thread inspection UI
  const [pendingCommentTarget, setPendingCommentTarget] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Play-mode Interactive AI NPC Chat & In-Game Store (Monetization demo)
  const [activeNpcChatId, setActiveNpcChatId] = useState<string | null>(null);
  const [npcMessages, setNpcMessages] = useState<{ sender: 'npc' | 'player'; text: string }[]>([]);
  const [npcInput, setNpcInput] = useState('');
  const [showInGameShop, setShowInGameShop] = useState(false);
  const [shardsBalance, setShardsBalance] = useState(320);
  const [boostUnlocked, setBoostUnlocked] = useState(false);

  // Refs for Three.js objects so animation loop always accesses latest props without re-mounting WebGL context
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const perspCamRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCamRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCamRef = useRef<THREE.Camera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const renderPassRef = useRef<RenderPass | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const gradePassRef = useRef<ShaderPass | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const objectMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);

  const entitiesRef = useRef(entities);
  entitiesRef.current = entities;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const simStateRef = useRef(simState);
  simStateRef.current = simState;
  const gizmoModeRef = useRef(gizmoMode);
  gizmoModeRef.current = gizmoMode;
  const visualGraphRef = useRef(visualGraph);
  visualGraphRef.current = visualGraph;
  const animTracksRef = useRef(animationTracks);
  animTracksRef.current = animationTracks;
  const timelineTimeRef = useRef(timelineTime);
  timelineTimeRef.current = timelineTime;
  const isTimelinePlayingRef = useRef(isTimelinePlaying);
  isTimelinePlayingRef.current = isTimelinePlaying;
  const postProcRef = useRef(postProcessing);
  postProcRef.current = postProcessing;
  const targetPlatformRef = useRef(targetPlatform);
  targetPlatformRef.current = targetPlatform;
  const collaboratorsRef = useRef(collaborators);
  collaboratorsRef.current = collaborators;
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const followPeerRef = useRef(followPeerId);
  followPeerRef.current = followPeerId;
  const boostUnlockedRef = useRef(boostUnlocked);
  boostUnlockedRef.current = boostUnlocked;

  const keysPressedRef = useRef<Record<string, boolean>>({});
  const runtimeBodiesRef = useRef<Map<string, RuntimeBodyState>>(new Map());
  const simElapsedRef = useRef(0);
  const pendingStepsRef = useRef(0);

  // Detect WebGPU & initialize Wasm kernel once
  useEffect(() => {
    setWebgpuSupported(typeof navigator !== 'undefined' && 'gpu' in navigator);
    aetherWasm.init().catch(() => {});
  }, []);

  // Step Frame trigger
  useEffect(() => {
    if (stepTrigger > 0) {
      pendingStepsRef.current += 1;
    }
  }, [stepTrigger]);

  // Keyboard input listener for Play mode (WASD + Space) & Editor Gizmo hotkeys (Q/W/E/R/C)
  useEffect(() => {
    const isTyping = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      keysPressedRef.current[e.code] = true;
      if (e.code === 'Space' && simStateRef.current === 'playing') {
        e.preventDefault();
      }
      if (simStateRef.current !== 'playing') {
        if (e.code === 'KeyQ') onChangeGizmoMode('select');
        if (e.code === 'KeyW') onChangeGizmoMode('translate');
        if (e.code === 'KeyE') onChangeGizmoMode('rotate');
        if (e.code === 'KeyR') onChangeGizmoMode('scale');
        if (e.code === 'KeyC') onChangeGizmoMode('comment');
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onChangeGizmoMode]);

  // Initialize Three.js WebGL/PBR Renderer, Cameras, Controls, Environment GI, Post-Processing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090e1a');
    scene.fog = new THREE.FogExp2('#090e1a', 0.018);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Procedural PBR Environment Map for realistic metallic & glass GI reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // Base ambient fill light for GI
    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#1e1b4b', 0.65);
    hemiLight.name = '__hemi_gi';
    scene.add(hemiLight);

    // Perspective & Orthographic Cameras
    const perspCam = new THREE.PerspectiveCamera(52, width / height, 0.1, 250);
    perspCam.position.set(8.5, 6.8, 12.5);
    perspCamRef.current = perspCam;

    const aspect = width / height;
    const frustum = 11;
    const orthoCam = new THREE.OrthographicCamera(
      (-frustum * aspect) / 2,
      (frustum * aspect) / 2,
      frustum / 2,
      -frustum / 2,
      0.1,
      250
    );
    orthoCam.position.set(0, 2.5, 18);
    orthoCamRef.current = orthoCam;
    activeCamRef.current = perspCam;

    // Grid Helper
    const grid = new THREE.GridHelper(36, 36, 0x00f0ff, 0x1e293b);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);
    gridHelperRef.current = grid;

    // OrbitControls
    const orbit = new OrbitControls(perspCam, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.target.set(0, 1.2, 0);
    orbitRef.current = orbit;

    // TransformControls (Three r173: add getHelper() to scene!)
    const transform = new TransformControls(perspCam, renderer.domElement);
    transform.setSize(0.85);
    const tcHelper = transform.getHelper();
    tcHelper.name = '__transform_helper';
    scene.add(tcHelper);
    transformRef.current = transform;

    transform.addEventListener('dragging-changed', (ev) => {
      orbit.enabled = !ev.value;
      if (!ev.value && transform.object) {
        const obj = transform.object;
        const entityId = obj.userData.entityId as string | undefined;
        if (entityId) {
          const deg = THREE.MathUtils.radToDeg;
          onTransformCommit(
            entityId,
            [
              Number(obj.position.x.toFixed(2)),
              Number(obj.position.y.toFixed(2)),
              Number(obj.position.z.toFixed(2)),
            ],
            [
              Number(deg(obj.rotation.x).toFixed(1)),
              Number(deg(obj.rotation.y).toFixed(1)),
              Number(deg(obj.rotation.z).toFixed(1)),
            ],
            [
              Number(obj.scale.x.toFixed(2)),
              Number(obj.scale.y.toFixed(2)),
              Number(obj.scale.z.toFixed(2)),
            ]
          );
        }
      }
    });

    // Selection Outline Helper
    const selBox = new THREE.BoxHelper(new THREE.Mesh(), 0x00f0ff);
    selBox.visible = false;
    scene.add(selBox);
    selectionBoxRef.current = selBox;

    // Post-Processing Composer
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, perspCam);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.7, 0.4, 0.6);
    const gradePass = new ShaderPass(AetherColorGradeShader);
    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(gradePass);
    composer.addPass(outputPass);

    composerRef.current = composer;
    renderPassRef.current = renderPass;
    bloomPassRef.current = bloomPass;
    gradePassRef.current = gradePass;

    // Raycast Object Picking & 3D Comment Pinning
    const raycaster = new THREE.Raycaster();
    const pointerDownPos = new THREE.Vector2();

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos.set(ev.clientX, ev.clientY);
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (!onPlayerCursorMove || ev.buttons !== 0) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, activeCamRef.current || perspCam);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) {
        onPlayerCursorMove([
          Number(hit.x.toFixed(2)),
          Number(Math.max(0, hit.y).toFixed(2)),
          Number(hit.z.toFixed(2)),
        ]);
      }
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (transform.dragging) return;
      if (Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y) > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, activeCamRef.current || perspCam);

      const pickableRoots = Array.from(objectMapRef.current.values());
      const hits = raycaster.intersectObjects(pickableRoots, true);
      if (hits.length > 0) {
        let cur: THREE.Object3D | null = hits[0].object;
        let foundId: string | null = null;
        while (cur) {
          if (cur.userData?.entityId) {
            foundId = cur.userData.entityId;
            break;
          }
          cur = cur.parent;
        }
        if (foundId) {
          onSelectEntity(foundId);
          if (gizmoModeRef.current === 'comment') {
            setPendingCommentTarget(foundId);
          }
          // If in Play mode and clicked an AI NPC, open interactive dialogue!
          const clickedEnt = entitiesRef.current.find((e) => e.id === foundId);
          if (simStateRef.current === 'playing' && clickedEnt?.npc?.enabled) {
            setActiveNpcChatId(foundId);
            setNpcMessages([{ sender: 'npc', text: clickedEnt.npc.greeting }]);
          }
          return;
        }
      }
      if (simStateRef.current !== 'playing') {
        onSelectEntity(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ResizeObserver for Docking / Panel Splitters!
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(200, Math.floor(entry.contentRect.width));
        const h = Math.max(180, Math.floor(entry.contentRect.height));
        renderer.setSize(w, h);
        composer.setSize(w, h);
        perspCam.aspect = w / h;
        perspCam.updateProjectionMatrix();
        const a = w / h;
        orthoCam.left = (-frustum * a) / 2;
        orthoCam.right = (frustum * a) / 2;
        orthoCam.top = frustum / 2;
        orthoCam.bottom = -frustum / 2;
        orthoCam.updateProjectionMatrix();
      }
    });
    ro.observe(container);

    // Master 60FPS Engine Loop
    let rafId = 0;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsAccumTime = 0;
    let overlayThrottle = 0;
    const eyeCamL = new THREE.PerspectiveCamera(65, 1, 0.1, 200);
    const eyeCamR = new THREE.PerspectiveCamera(65, 1, 0.1, 200);

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      frameCounter++;
      fpsAccumTime += rawDt;

      const cam = activeCamRef.current || perspCam;
      orbit.update();

      // Follow Collaborator Camera if enabled
      if (followPeerRef.current) {
        const targetPeer = collaboratorsRef.current.find((p) => p.peerId === followPeerRef.current);
        if (targetPeer) {
          orbit.target.lerp(
            new THREE.Vector3(targetPeer.cursor3D[0], targetPeer.cursor3D[1], targetPeer.cursor3D[2]),
            0.08
          );
        }
      }

      // Update Spatial Audio 3D Listener
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      spatialAudio.updateListener(
        [cam.position.x, cam.position.y, cam.position.z],
        [forward.x, forward.y, forward.z]
      );

      // Update GPU Particle shader uniforms even in Editor preview so VFX look alive!
      const globalShaderTime = now * 0.001;
      for (const obj of objectMapRef.current.values()) {
        const pts = obj.getObjectByName('gpu_particles') as THREE.Points | undefined;
        if (pts && pts.material instanceof THREE.ShaderMaterial) {
          pts.material.uniforms.uTime.value = globalShaderTime;
        }
      }

      // Keyframe Animation Timeline preview when scrubbing or playing timeline
      if (isTimelinePlayingRef.current || simStateRef.current === 'playing') {
        const tLoop = isTimelinePlayingRef.current ? timelineTimeRef.current : simElapsedRef.current % 5.0;
        for (const trk of animTracksRef.current) {
          const obj = objectMapRef.current.get(trk.entityId);
          if (!obj || trk.keyframes.length < 2) continue;
          const kfs = trk.keyframes;
          let prev = kfs[0];
          let next = kfs[kfs.length - 1];
          for (let i = 0; i < kfs.length - 1; i++) {
            if (tLoop >= kfs[i].time && tLoop <= kfs[i + 1].time) {
              prev = kfs[i];
              next = kfs[i + 1];
              break;
            }
          }
          const span = Math.max(0.001, next.time - prev.time);
          const alpha = Math.max(0, Math.min(1, (tLoop - prev.time) / span));
          const val = prev.value + (next.value - prev.value) * alpha;
          if (trk.property === 'position.y' && simStateRef.current !== 'playing') {
            obj.position.y = val;
          } else if (trk.property === 'rotation.y' && simStateRef.current !== 'playing') {
            obj.rotation.y = THREE.MathUtils.degToRad(val);
          } else if (trk.property === 'emissiveIntensity') {
            obj.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissiveIntensity = val;
              }
            });
          }
        }
      }

      // Simulation Step (Play Mode or Step Frame)
      let wasmStepUs = 0;
      const shouldStep =
        simStateRef.current === 'playing' ||
        (simStateRef.current === 'paused' && pendingStepsRef.current > 0);

      if (shouldStep) {
        const stepDt = simStateRef.current === 'paused' ? 1 / 60 : rawDt;
        if (simStateRef.current === 'paused') {
          pendingStepsRef.current = Math.max(0, pendingStepsRef.current - 1);
        }
        simElapsedRef.current += stepDt;
        const simTime = simElapsedRef.current;
        const wasmStart = performance.now();

        const currentEntities = entitiesRef.current;
        const playerEnt =
          currentEntities.find((e) => e.physics?.isPlayerControlled || e.tag === 'Player') || null;
        const playerObj = playerEnt ? objectMapRef.current.get(playerEnt.id) : undefined;

        for (const ent of currentEntities) {
          if (!ent.visible) continue;
          const obj = objectMapRef.current.get(ent.id);
          if (!obj) continue;

          let body = runtimeBodiesRef.current.get(ent.id);
          if (!body) {
            body = {
              vy: 0,
              vx: 0,
              vz: 0,
              isGrounded: obj.position.y <= 0.12,
              baseY: ent.position[1],
              animState: 'Idle',
            };
            runtimeBodiesRef.current.set(ent.id, body);
          }

          const prevX = obj.position.x;
          const prevZ = obj.position.z;

          // 1. SoftBody / Cloth Simulation (Real-time vertex wave deformation!)
          if (ent.physics?.enabled && ent.physics.bodyType === 'softbody') {
            const softMesh = obj.getObjectByName('softbody_mesh') as THREE.Mesh | undefined;
            if (softMesh && softMesh.userData.restPositions) {
              const rest = softMesh.userData.restPositions as Float32Array;
              const posAttr = softMesh.geometry.attributes.position as THREE.BufferAttribute;
              const arr = posAttr.array as Float32Array;
              for (let i = 0; i < arr.length; i += 3) {
                const rx = rest[i];
                const ry = rest[i + 1];
                // Pin top edge of cloth (ry > 0.45)
                const pinWeight = Math.max(0, 0.5 - ry);
                arr[i + 2] =
                  Math.sin(simTime * 4.2 + rx * 3.5 + ry * 2.2) * 0.24 * pinWeight +
                  Math.cos(simTime * 2.7 + ry * 4.0) * 0.12 * pinWeight;
              }
              posAttr.needsUpdate = true;
              softMesh.geometry.computeVertexNormals();
            }
          }

          // 2. Vehicle Physics (Raycast-like Drift & Wheel Spin!)
          if (ent.physics?.enabled && ent.physics.bodyType === 'vehicle' && ent.physics.isPlayerControlled) {
            const keys = keysPressedRef.current;
            const maxSpd = ent.physics.moveSpeed || 12;
            let throttle = 0;
            if (keys['KeyW'] || keys['ArrowUp']) throttle += 1;
            if (keys['KeyS'] || keys['ArrowDown']) throttle -= 0.7;
            let steer = 0;
            if (keys['KeyA'] || keys['ArrowLeft']) steer += 1;
            if (keys['KeyD'] || keys['ArrowRight']) steer -= 1;

            body.vz = body.vz * 0.94 + throttle * maxSpd * 0.08;
            if (Math.abs(body.vz) > 0.15) {
              obj.rotation.y += steer * 2.3 * stepDt * Math.sign(body.vz);
            }
            obj.position.x += Math.sin(obj.rotation.y) * body.vz * stepDt;
            obj.position.z += Math.cos(obj.rotation.y) * body.vz * stepDt;

            // Spin 4 wheels
            for (let w = 0; w < 4; w++) {
              const wheel = obj.getObjectByName(`wheel_${w}`);
              if (wheel) wheel.rotation.x += body.vz * stepDt * 3.2;
            }
          }

          // 3. Built-in Character Controller fallback if no custom script overrides WASD
          if (
            ent.physics?.enabled &&
            ent.physics.isPlayerControlled &&
            ent.physics.bodyType !== 'vehicle' &&
            (!ent.script || !ent.script.enabled)
          ) {
            const keys = keysPressedRef.current;
            const spd = (ent.physics.moveSpeed || 6.2) * (boostUnlockedRef.current ? 1.35 : 1);
            let mx = 0;
            let mz = 0;
            if (keys['KeyW'] || keys['ArrowUp']) mz -= 1;
            if (keys['KeyS'] || keys['ArrowDown']) mz += 1;
            if (keys['KeyA'] || keys['ArrowLeft']) mx -= 1;
            if (keys['KeyD'] || keys['ArrowRight']) mx += 1;
            if (mx !== 0 || mz !== 0) {
              const l = Math.hypot(mx, mz);
              obj.position.x += (mx / l) * spd * stepDt;
              if (!is2DMode) {
                obj.position.z += (mz / l) * spd * stepDt;
                obj.rotation.y = Math.atan2(mx, mz);
              } else {
                obj.rotation.y = mx >= 0 ? Math.PI / 2 : -Math.PI / 2;
              }
            }
            if (keys['Space'] && body.isGrounded) {
              body.vy = (ent.physics.jumpForce || 8.8) * (boostUnlockedRef.current ? 1.35 : 1);
              body.isGrounded = false;
              spatialAudio.playSpatialSfx('jump', [obj.position.x, obj.position.y, obj.position.z]);
            }
          }

          // 4. Execute Multi-Language Scripts (TypeScript/JS + Rust/C# Wasm Kernels!)
          if (ent.script && ent.script.enabled) {
            if (ent.script.wasmKernel === 'hover_wave') {
              const force = aetherWasm.springForce(obj.position.y, body.baseY + Math.sin(simTime * 2.5) * 0.45, body.vy, 18, 4);
              body.vy += force * stepDt;
              obj.position.y += body.vy * stepDt;
              obj.rotation.y += 0.9 * stepDt;
            } else if (ent.script.wasmKernel === 'orbital') {
              const angle = simTime * 0.95;
              obj.position.x = Math.cos(angle) * 4.4;
              obj.position.z = Math.sin(angle) * 4.4;
              obj.position.y = 1.6 + Math.sin(simTime * 3.0) * 0.25;
              obj.rotation.y = -angle;
            } else if (ent.script.language === 'typescript') {
              if (body.compiledCodeSrc !== ent.script.code) {
                body.compiledCodeSrc = ent.script.code;
                try {
                  const cleanJs = transpileAetherTS(ent.script.code);
                  body.compiledFn = new Function(
                    'entity',
                    'dt',
                    'input',
                    'world',
                    `${cleanJs}\nif (typeof onUpdate === 'function') onUpdate(entity, dt, input, world);`
                  ) as (entity: any, dt: number, input: any, world: any) => void;
                } catch (err) {
                  body.compiledFn = null;
                  onConsoleLog('error', ent.script.name, `Compile error: ${(err as Error).message}`);
                }
              }

              if (body.compiledFn) {
                const boostMult = ent.physics?.isPlayerControlled && boostUnlockedRef.current ? 1.35 : 1;
                const proxyEntity = {
                  id: ent.id,
                  name: ent.name,
                  baseY: body.baseY,
                  isGrounded: body.isGrounded,
                  position: obj.position,
                  rotation: {
                    get x() { return THREE.MathUtils.radToDeg(obj.rotation.x); },
                    set x(v: number) { obj.rotation.x = THREE.MathUtils.degToRad(v); },
                    get y() { return THREE.MathUtils.radToDeg(obj.rotation.y); },
                    set y(v: number) { obj.rotation.y = THREE.MathUtils.degToRad(v); },
                    get z() { return THREE.MathUtils.radToDeg(obj.rotation.z); },
                    set z(v: number) { obj.rotation.z = THREE.MathUtils.degToRad(v); },
                  },
                  velocity: {
                    get x() { return body!.vx; },
                    set x(v: number) { body!.vx = v; },
                    get y() { return body!.vy; },
                    set y(v: number) { body!.vy = v * boostMult; },
                    get z() { return body!.vz; },
                    set z(v: number) { body!.vz = v; },
                  },
                  set emissiveIntensity(val: number) {
                    obj.traverse((c) => {
                      if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
                        c.material.emissiveIntensity = val;
                      }
                    });
                  },
                  get emissiveIntensity() {
                    return ent.material.emissiveIntensity;
                  },
                };

                const worldApi = {
                  time: simTime,
                  getPlayer: () =>
                    playerObj && playerEnt
                      ? { id: playerEnt.id, position: playerObj.position }
                      : null,
                  playSfx: (sfx: 'jump' | 'crystal' | 'laser', p?: THREE.Vector3) =>
                    spatialAudio.playSpatialSfx(sfx, p ? [p.x, p.y, p.z] : [obj.position.x, obj.position.y, obj.position.z]),
                };

                try {
                  body.compiledFn(proxyEntity, stepDt, { keys: keysPressedRef.current }, worldApi);
                  body.isGrounded = proxyEntity.isGrounded;
                } catch {
                  // prevent per-frame crash
                }
              }
            }
          }

          // 5. Execute Node-Based Visual Scripting (Live Blueprint Hot-Reloading!)
          const vg = visualGraphRef.current;
          if (
            ent.visualScriptEnabled ||
            vg.targetEntityId === ent.id ||
            (vg.targetEntityId === 'selected' && selectedIdRef.current === ent.id)
          ) {
            for (const edge of vg.edges) {
              const fromNode = vg.nodes.find((n) => n.id === edge.fromNodeId);
              const toNode = vg.nodes.find((n) => n.id === edge.toNodeId);
              if (!fromNode || !toNode) continue;

              const triggered =
                fromNode.type === 'event_tick' ||
                (fromNode.type === 'event_key_space' && keysPressedRef.current['Space']);

              if (triggered) {
                if (toNode.type === 'action_rotate') {
                  const spdDeg = Number(toNode.params.speedDeg ?? 60);
                  obj.rotation.y += THREE.MathUtils.degToRad(spdDeg) * stepDt;
                } else if (toNode.type === 'action_hover_sin') {
                  const amp = Number(toNode.params.amplitude ?? 0.35);
                  const spd = Number(toNode.params.speed ?? 2.5);
                  obj.position.y = body.baseY + Math.sin(simTime * spd) * amp;
                } else if (toNode.type === 'action_pulse_emissive') {
                  const minG = Number(toNode.params.minGlow ?? 0.5);
                  const maxG = Number(toNode.params.maxGlow ?? 2.0);
                  const freq = Number(toNode.params.frequency ?? 3.0);
                  const glow = minG + (Math.sin(simTime * freq) * 0.5 + 0.5) * (maxG - minG);
                  obj.traverse((c) => {
                    if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
                      c.material.emissiveIntensity = glow;
                    }
                  });
                } else if (toNode.type === 'action_jump' && body.isGrounded) {
                  body.vy = Number(toNode.params.force ?? 8.5);
                  body.isGrounded = false;
                } else if (toNode.type === 'action_chase_player' && playerObj && ent.id !== playerEnt?.id) {
                  const dx = playerObj.position.x - obj.position.x;
                  const dz = playerObj.position.z - obj.position.z;
                  const d = Math.hypot(dx, dz);
                  if (d > 1.3) {
                    const spd = Number(toNode.params.speed ?? 3.5);
                    obj.position.x += (dx / d) * spd * stepDt;
                    obj.position.z += (dz / d) * spd * stepDt;
                  }
                }
              }

              // Chained second-hop Blueprint actions (Event -> Action1 -> Action2)
              if (fromNode.category === 'action') {
                if (toNode.type === 'action_pulse_emissive') {
                  const minG = Number(toNode.params.minGlow ?? 0.5);
                  const maxG = Number(toNode.params.maxGlow ?? 2.0);
                  const freq = Number(toNode.params.frequency ?? 3.0);
                  const glow = minG + (Math.sin(simTime * freq) * 0.5 + 0.5) * (maxG - minG);
                  obj.traverse((c) => {
                    if (c instanceof THREE.Mesh && c.material instanceof THREE.MeshStandardMaterial) {
                      c.material.emissiveIntensity = glow;
                    }
                  });
                }
              }
            }
          }

          // 6. Native Wasm Gravity & RigidBody Collision Solver
          if (ent.physics?.enabled && ent.physics.bodyType === 'dynamic') {
            const g = -19.6 * (ent.physics.gravityScale ?? 1);
            const nextY = aetherWasm.gravityIntegrate(obj.position.y, body.vy, g, stepDt);
            body.vy += g * stepDt;
            obj.position.y = nextY;

            // Ground & 2D/3D static platform collision
            let floorY = 0;
            if (ent.meshPrimitive === 'box' || ent.meshPrimitive === 'sphere') {
              floorY = 0.5 * ent.scale[1];
            }
            for (const other of currentEntities) {
              if (other.id === ent.id || !other.physics?.enabled || other.physics.bodyType !== 'static') continue;
              if (other.id === 'env-ground' || other.id === 'cyber-floor' || other.id === 'track-asphalt') continue;
              const halfW = other.scale[0] * 0.5;
              const halfD = other.scale[2] * 0.5;
              const topY = other.position[1] + other.scale[1] * 0.5;
              if (
                Math.abs(obj.position.x - other.position[0]) <= halfW + 0.35 &&
                Math.abs(obj.position.z - other.position[2]) <= halfD + 0.35 &&
                obj.position.y >= topY - 0.35
              ) {
                floorY = Math.max(floorY, topY);
              }
            }

            if (obj.position.y <= floorY) {
              obj.position.y = floorY;
              if (Math.abs(body.vy) > 2.2 && ent.physics.restitution > 0.25) {
                body.vy = -body.vy * ent.physics.restitution;
                body.isGrounded = false;
              } else {
                body.vy = 0;
                body.isGrounded = true;
              }
            } else {
              body.isGrounded = false;
            }

            // Player vs Dynamic Prop push impulse!
            if (playerObj && ent.id !== playerEnt?.id) {
              const dx = obj.position.x - playerObj.position.x;
              const dz = obj.position.z - playerObj.position.z;
              const dist = Math.hypot(dx, dz);
              if (dist < 1.25 && dist > 0.01 && Math.abs(obj.position.y - playerObj.position.y) < 1.4) {
                const push = (1.25 - dist) * 8.5 * stepDt;
                obj.position.x += (dx / dist) * push;
                obj.position.z += (dz / dist) * push;
              }
            }
          }

          // 7. State Machine Animator (Idle -> Walk -> Run -> Jump) + Inverse Kinematics (IK)!
          if (ent.animator?.enabled) {
            const horizSpeed = Math.hypot(obj.position.x - prevX, obj.position.z - prevZ) / stepDt;
            let nextState: AnimStateName = 'Idle';
            if (!body.isGrounded && obj.position.y > 0.25) {
              nextState = 'Jump';
            } else if (horizSpeed > 7.2) {
              nextState = 'Run';
            } else if (horizSpeed > 0.4) {
              nextState = 'Walk';
            }
            body.animState = nextState;
            if (ent.physics?.isPlayerControlled) {
              setActiveAnimStateHud(nextState);
            }

            const legL = obj.getObjectByName('rig_leg_l');
            const legR = obj.getObjectByName('rig_leg_r');
            const armL = obj.getObjectByName('rig_arm_l');
            const armR = obj.getObjectByName('rig_arm_r');
            const torso = obj.getObjectByName('rig_torso');
            const head = obj.getObjectByName('rig_head');

            const spdMul = ent.animator.speedMultiplier || 1;
            if (nextState === 'Idle') {
              const breath = Math.sin(simTime * 2.6 * spdMul) * 0.03;
              if (torso) torso.position.y = 1.05 + breath;
              if (legL) legL.rotation.x = 0;
              if (legR) legR.rotation.x = 0;
              if (armL) armL.rotation.x = Math.sin(simTime * 2.0) * 0.06;
              if (armR) armR.rotation.x = -Math.sin(simTime * 2.0) * 0.06;
            } else if (nextState === 'Walk' || nextState === 'Run') {
              const freq = nextState === 'Run' ? 13 * spdMul : 8 * spdMul;
              const amp = nextState === 'Run' ? 0.72 : 0.45;
              const swing = Math.sin(simTime * freq) * amp;
              if (legL) legL.rotation.x = swing;
              if (legR) legR.rotation.x = -swing;
              if (armL) armL.rotation.x = -swing * 0.85;
              if (armR) armR.rotation.x = swing * 0.85;
              if (torso) torso.position.y = 1.05 + Math.abs(Math.cos(simTime * freq)) * 0.06;
            } else if (nextState === 'Jump') {
              if (legL) legL.rotation.x = 0.45;
              if (legR) legR.rotation.x = -0.35;
              if (armL) armL.rotation.x = -0.9;
              if (armR) armR.rotation.x = -0.9;
            }

            // Head Look-At Inverse Kinematics (IK)
            if (ent.animator.lookAtIK && head && ent.animator.lookAtTargetId) {
              const targetObj = objectMapRef.current.get(ent.animator.lookAtTargetId);
              if (targetObj) {
                const worldTarget = new THREE.Vector3();
                targetObj.getWorldPosition(worldTarget);
                head.lookAt(worldTarget);
              }
            }
          }
        }

        wasmStepUs = Math.round((performance.now() - wasmStart) * 1000);
      }

      // Keep selection BoxHelper synced
      if (selectionBoxRef.current && selectedIdRef.current) {
        const selObj = objectMapRef.current.get(selectedIdRef.current);
        if (selObj) {
          selectionBoxRef.current.setFromObject(selObj);
          selectionBoxRef.current.visible = simStateRef.current !== 'playing';
        } else {
          selectionBoxRef.current.visible = false;
        }
      } else if (selectionBoxRef.current) {
        selectionBoxRef.current.visible = false;
      }

      // Render Viewport (VR Dual-Eye Stereoscopic vs Standard Composer)
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;

      if (targetPlatformRef.current === 'vr') {
        renderer.setScissorTest(true);
        const halfW = Math.floor(w / 2);

        eyeCamL.copy(perspCam);
        eyeCamL.aspect = halfW / h;
        eyeCamL.updateProjectionMatrix();
        eyeCamL.translateX(-0.035);

        eyeCamR.copy(perspCam);
        eyeCamR.aspect = halfW / h;
        eyeCamR.updateProjectionMatrix();
        eyeCamR.translateX(0.035);

        renderer.setViewport(0, 0, halfW, h);
        renderer.setScissor(0, 0, halfW, h);
        renderer.render(scene, eyeCamL);

        renderer.setViewport(halfW, 0, w - halfW, h);
        renderer.setScissor(halfW, 0, w - halfW, h);
        renderer.render(scene, eyeCamR);

        renderer.setScissorTest(false);
        renderer.setViewport(0, 0, w, h);
      } else {
        composer.render();
      }

      // Project 3D Collaborators & 3D Pinned Comments (~20Hz UI sync)
      overlayThrottle += rawDt;
      if (overlayThrottle >= 0.05) {
        overlayThrottle = 0;
        const projCam = activeCamRef.current || perspCam;

        const nextPeers = collaboratorsRef.current.map((peer) => {
          const v = new THREE.Vector3(peer.cursor3D[0], peer.cursor3D[1] + 0.6, peer.cursor3D[2]);
          v.project(projCam);
          return {
            peer,
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h,
            visible: v.z < 1 && v.x >= -1.05 && v.x <= 1.05 && v.y >= -1.05 && v.y <= 1.05,
          };
        });
        setProjectedPeers(nextPeers);

        const nextCmts = commentsRef.current.map((cmt) => {
          const anchorObj = objectMapRef.current.get(cmt.entityId);
          const base = anchorObj
            ? anchorObj.position
            : new THREE.Vector3(0, 1.5, 0);
          const v = new THREE.Vector3(
            base.x + cmt.offset[0],
            base.y + cmt.offset[1],
            base.z + cmt.offset[2]
          );
          v.project(projCam);
          return {
            comment: cmt,
            x: (v.x * 0.5 + 0.5) * w,
            y: (-v.y * 0.5 + 0.5) * h,
            visible: v.z < 1 && v.x >= -1.05 && v.x <= 1.05 && v.y >= -1.05 && v.y <= 1.05,
          };
        });
        setProjectedComments(nextCmts);
      }

      // Emit Performance Profiler telemetry every 0.5s
      if (fpsAccumTime >= 0.5) {
        const fps = Math.min(144, Math.round(frameCounter / fpsAccumTime));
        const frameTimeMs = Number(((fpsAccumTime / frameCounter) * 1000).toFixed(2));
        setFpsBadge(fps);
        const memPerf = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const memoryMb = memPerf
          ? Math.round(memPerf.usedJSHeapSize / (1024 * 1024))
          : 64 + objectMapRef.current.size * 2;

        const dynCount = entitiesRef.current.filter((e) => e.physics?.enabled).length;
        onProfilerSample({
          fps,
          frameTimeMs,
          memoryMb,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          physicsBodies: dynCount,
          wasmStepUs: wasmStepUs || 42,
        });

        frameCounter = 0;
        fpsAccumTime = 0;
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync Scene Entities -> Three.js Scene Graph cleanly (preserving play-mode transforms until Stop!)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // When stopping simulation, reset runtime bodies so objects snap back to authored positions!
    if (simState === 'stopped') {
      runtimeBodiesRef.current.clear();
      simElapsedRef.current = 0;
    }

    const validIds = new Set(entities.map((e) => e.id));
    for (const [id, obj] of objectMapRef.current.entries()) {
      if (!validIds.has(id)) {
        if (transformRef.current?.object === obj) {
          transformRef.current.detach();
        }
        scene.remove(obj);
        objectMapRef.current.delete(id);
      }
    }

    const shading = postProcessing.shadingMode;
    for (const ent of entities) {
      const existing = objectMapRef.current.get(ent.id);
      const sig = JSON.stringify({
        type: ent.type,
        prim: ent.meshPrimitive,
        mat: ent.material,
        light: ent.light,
        particle: ent.particle,
        soft: ent.physics?.bodyType === 'softbody',
        shading,
        texLen: texturePacks.length,
      });

      let targetObj = existing;
      if (!targetObj || targetObj.userData.buildSig !== sig) {
        const prevPos = targetObj ? targetObj.position.clone() : null;
        const prevRot = targetObj ? targetObj.rotation.clone() : null;
        if (targetObj) {
          if (transformRef.current?.object === targetObj) {
            transformRef.current.detach();
          }
          scene.remove(targetObj);
        }
        targetObj = buildEntityObject3D(ent, shading, texturePacks);
        targetObj.userData.buildSig = sig;
        scene.add(targetObj);
        objectMapRef.current.set(ent.id, targetObj);

        if (simState !== 'stopped' && prevPos && prevRot) {
          targetObj.position.copy(prevPos);
          targetObj.rotation.copy(prevRot);
        } else {
          targetObj.position.set(ent.position[0], ent.position[1], ent.position[2]);
          targetObj.rotation.set(
            THREE.MathUtils.degToRad(ent.rotation[0]),
            THREE.MathUtils.degToRad(ent.rotation[1]),
            THREE.MathUtils.degToRad(ent.rotation[2])
          );
        }
      } else if (simState === 'stopped') {
        targetObj.position.set(ent.position[0], ent.position[1], ent.position[2]);
        targetObj.rotation.set(
          THREE.MathUtils.degToRad(ent.rotation[0]),
          THREE.MathUtils.degToRad(ent.rotation[1]),
          THREE.MathUtils.degToRad(ent.rotation[2])
        );
      }

      targetObj.scale.set(ent.scale[0], ent.scale[1], ent.scale[2]);
      targetObj.visible = ent.visible;

      // Hide editor light/camera wireframe gizmos during Play mode
      const helper = targetObj.getObjectByName('editor_helper');
      if (helper) helper.visible = simState !== 'playing';
      if (ent.type === 'camera') targetObj.visible = simState !== 'playing' && ent.visible;
    }

    // Re-attach TransformControls to selected object
    const tc = transformRef.current;
    if (tc) {
      if (
        simState !== 'playing' &&
        selectedId &&
        gizmoMode !== 'select' &&
        gizmoMode !== 'comment'
      ) {
        const selObj = objectMapRef.current.get(selectedId);
        const selEnt = entities.find((e) => e.id === selectedId);
        if (selObj && selEnt && !selEnt.locked && selEnt.visible) {
          tc.attach(selObj);
        } else {
          tc.detach();
        }
      } else {
        tc.detach();
      }
    }
  }, [entities, postProcessing.shadingMode, texturePacks, simState, selectedId, gizmoMode]);

  // Sync Gizmo Mode & Snap Settings
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc) return;
    if (gizmoMode === 'translate' || gizmoMode === 'rotate' || gizmoMode === 'scale') {
      tc.setMode(gizmoMode);
    }
    tc.setTranslationSnap(snapEnabled ? 0.5 : null);
    tc.setRotationSnap(snapEnabled ? THREE.MathUtils.degToRad(15) : null);
    tc.setScaleSnap(snapEnabled ? 0.25 : null);
  }, [gizmoMode, snapEnabled]);

  // Sync Grid & 2D / 3D Hybrid Camera Projection
  useEffect(() => {
    const grid = gridHelperRef.current;
    if (grid) {
      grid.visible = showGrid;
      grid.rotation.x = is2DMode ? Math.PI / 2 : 0;
      grid.position.z = is2DMode ? -0.8 : 0;
    }

    const persp = perspCamRef.current;
    const ortho = orthoCamRef.current;
    const orbit = orbitRef.current;
    const tc = transformRef.current;
    const rp = renderPassRef.current;
    if (!persp || !ortho || !orbit || !tc || !rp) return;

    const useOrtho = isOrtho || is2DMode;
    const nextCam = useOrtho ? ortho : persp;
    activeCamRef.current = nextCam;
    orbit.object = nextCam;
    tc.camera = nextCam;
    rp.camera = nextCam;

    if (is2DMode) {
      ortho.position.set(0, 2.2, 18);
      orbit.target.set(0, 2.0, 0);
      orbit.enableRotate = false;
    } else {
      orbit.enableRotate = true;
      if (useOrtho) {
        ortho.position.set(10, 9, 12);
        ortho.lookAt(0, 1, 0);
      }
    }
    orbit.update();
  }, [showGrid, isOrtho, is2DMode]);

  // Sync Post-Processing & Sky Preset
  useEffect(() => {
    const scene = sceneRef.current;
    const bloom = bloomPassRef.current;
    const grade = gradePassRef.current;
    const renderer = rendererRef.current;
    if (!scene || !bloom || !grade || !renderer) return;

    const skyColors: Record<PostProcessingConfig['skyPreset'], string> = {
      cyber_night: '#080d1a',
      sunset_horizon: '#1e1026',
      studio_dark: '#0d1117',
      daylight_clear: '#1e3a5f',
    };
    const bgHex = skyColors[postProcessing.skyPreset] || '#080d1a';
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, postProcessing.shadingMode === 'unlit' ? 0.0 : 0.016);

    bloom.enabled = postProcessing.bloomEnabled;
    // Keep neon highlights crisp without washing out albedo and scene detail.
    bloom.strength = postProcessing.bloomStrength * 0.58;
    bloom.radius = postProcessing.bloomRadius * 0.8;
    bloom.threshold = Math.max(0.86, postProcessing.bloomThreshold);

    const gradeIdx =
      postProcessing.colorGrading === 'aces_filmic'
        ? 0
        : postProcessing.colorGrading === 'cyberpunk'
        ? 1
        : postProcessing.colorGrading === 'warm_fantasy'
        ? 2
        : 3;

    grade.uniforms.uGradeMode.value = gradeIdx;
    grade.uniforms.uSSAO.value = postProcessing.ssaoEnabled ? postProcessing.ssaoIntensity : 0;
    grade.uniforms.uDOF.value = postProcessing.dofEnabled ? 0.65 : 0;
    grade.uniforms.uMotionBlur.value = postProcessing.motionBlurEnabled ? postProcessing.motionBlurAmount : 0;
    renderer.toneMappingExposure = 0.68 + postProcessing.giIntensity * 0.18;
  }, [postProcessing]);

  const snapCameraPreset = useCallback((view: 'persp' | 'top' | 'front' | 'right') => {
    const cam = activeCamRef.current;
    const orbit = orbitRef.current;
    if (!cam || !orbit) return;
    orbit.target.set(0, 1.2, 0);
    if (view === 'top') cam.position.set(0, 18, 0.01);
    else if (view === 'front') cam.position.set(0, 2.5, 16);
    else if (view === 'right') cam.position.set(16, 2.5, 0);
    else cam.position.set(8.5, 6.8, 12.5);
    orbit.update();
  }, []);

  // Drag-and-Drop Asset from Bottom Asset Drawer onto 3D Viewport
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/aether-asset');
    if (!raw || !rendererRef.current || !activeCamRef.current) return;
    try {
      const asset = JSON.parse(raw) as AssetItem;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, activeCamRef.current);

      // Check if dropped onto an existing object (e.g., applying PBR material!)
      const roots = Array.from(objectMapRef.current.values());
      const hits = raycaster.intersectObjects(roots, true);
      let hitEntityId: string | null = null;
      if (hits.length > 0) {
        let cur: THREE.Object3D | null = hits[0].object;
        while (cur) {
          if (cur.userData?.entityId) {
            hitEntityId = cur.userData.entityId;
            break;
          }
          cur = cur.parent;
        }
      }

      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const pt = new THREE.Vector3(0, 0.6, 0);
      raycaster.ray.intersectPlane(groundPlane, pt);
      onDropAsset(
        asset,
        [Number(pt.x.toFixed(1)), Math.max(0.5, Number(pt.y.toFixed(1))), Number(pt.z.toFixed(1))],
        hitEntityId
      );
    } catch {}
  };

  // Virtual touch button helper for Mobile Preview
  const setVirtualKey = (code: string, down: boolean) => {
    keysPressedRef.current[code] = down;
  };

  const activeNpcEntity = activeNpcChatId ? entities.find((e) => e.id === activeNpcChatId) : null;
  const firstNpcInScene = entities.find((e) => e.npc?.enabled);

  const sendNpcMessage = () => {
    if (!npcInput.trim() || !activeNpcEntity?.npc) return;
    const userMsg = npcInput.trim();
    const reply = generateNPCDialogueReply(activeNpcEntity.npc, userMsg, entities);
    setNpcMessages((prev) => [
      ...prev,
      { sender: 'player', text: userMsg },
      { sender: 'npc', text: reply },
    ]);
    setNpcInput('');
    spatialAudio.playSpatialSfx('crystal', activeNpcEntity.position);
  };

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="relative w-full h-full bg-[#070b14] overflow-hidden select-none"
    >
      {/* FLOATING TOOLBAR — TOP LEFT */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center gap-1.5 pr-[175px] 2xl:pr-[345px] pointer-events-auto">
        {/* Transform Gizmos + Pin Comment */}
        <div className="flex items-center bg-[#0f1522]/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 shadow-xl">
          {[
            { id: 'select', icon: MousePointer, tip: 'Select (Q)' },
            { id: 'translate', icon: Move, tip: 'Move Gizmo (W)' },
            { id: 'rotate', icon: RotateCw, tip: 'Rotate Gizmo (E)' },
            { id: 'scale', icon: Maximize2, tip: 'Scale Gizmo (R)' },
            { id: 'comment', icon: MessageSquarePlus, tip: 'Pin 3D Comment (C)' },
          ].map((tool) => {
            const Icon = tool.icon;
            const active = gizmoMode === tool.id;
            return (
              <button
                key={tool.id}
                title={tool.tip}
                onClick={() => onChangeGizmoMode(tool.id as GizmoMode)}
                className={`p-1.5 rounded-md transition-all ${
                  active
                    ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/50'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* 3D / 2D Hybrid + Perspective / Orthographic */}
        <div className="flex items-center bg-[#0f1522]/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 shadow-xl gap-0.5">
          <button
            onClick={() => onToggle2DMode(!is2DMode)}
            title="Toggle 2D / 3D Hybrid Engine Mode"
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              is2DMode
                ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/50'
                : 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-400/40'
            }`}
          >
            {is2DMode ? '2D Hybrid' : '3D Full'}
          </button>
          <button
            onClick={() => setIsOrtho((v) => !v)}
            className="px-2 py-1 rounded text-[11px] text-slate-300 hover:bg-slate-800 transition-colors"
            title="Toggle Camera Projection (Perspective / Orthographic)"
          >
            {isOrtho || is2DMode ? 'Ortho' : 'Persp'}
          </button>
        </div>

        {/* Shading Mode Selector */}
        <div className="flex items-center bg-[#0f1522]/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 shadow-xl gap-0.5">
          <Eye className="w-3.5 h-3.5 text-slate-400 mx-1" />
          {(['wireframe', 'unlit', 'lit', 'raytraced'] as ShadingMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onUpdatePostProcessing({ shadingMode: mode })}
              className={`px-2 py-0.5 rounded text-[11px] capitalize transition-all ${
                postProcessing.shadingMode === mode
                  ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 text-cyan-200 ring-1 ring-cyan-400/40 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode === 'raytraced' ? 'Raytraced GI' : mode}
            </button>
          ))}
        </div>

        {/* Grid & Snap Toggles */}
        <div className="flex items-center bg-[#0f1522]/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 shadow-xl gap-0.5">
          <button
            onClick={() => setShowGrid((v) => !v)}
            title="Toggle World Grid"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
              showGrid ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            Grid
          </button>
          <button
            onClick={() => setSnapEnabled((v) => !v)}
            title="Snap Transform (0.5m / 15°)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
              snapEnabled ? 'bg-purple-500/25 text-purple-300 ring-1 ring-purple-400/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            Snap {snapEnabled ? '0.5m' : 'Off'}
          </button>
        </div>
      </div>

      {/* TOP RIGHT ENGINE TELEMETRY & QUICK CAMERA AXES */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
        <div className="hidden 2xl:flex items-center bg-[#0f1522]/85 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 text-[10px] text-slate-300 gap-0.5">
          {(['persp', 'top', 'front', 'right'] as const).map((v) => (
            <button
              key={v}
              onClick={() => snapCameraPreset(v)}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 uppercase tracking-wider text-slate-400 hover:text-cyan-300"
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-[#0f1522]/90 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1 text-[11px] shadow-xl">
          <span className="flex items-center gap-1.5 text-cyan-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {webgpuSupported && postProcessing.renderBackend === 'webgpu'
              ? 'WebGPU Active'
              : 'WebGL2 PBR'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-mono-code text-emerald-300">{fpsBadge} FPS</span>
        </div>
      </div>

      {/* PLAY MODE INTERACTIVE HUD */}
      {simState !== 'stopped' && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="bg-[#0f1522]/90 backdrop-blur-md border border-cyan-500/40 rounded-lg px-3 py-1.5 text-xs flex items-center gap-3 shadow-xl">
            <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              LIVE SIMULATION ({simState.toUpperCase()})
            </span>
            <span className="text-slate-400 hidden sm:inline">
              WASD: Gerak • Space: Lompat
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-200 text-[11px]">
              Animator: <strong>{activeAnimStateHud}</strong>
            </span>
          </div>

          {firstNpcInScene && (
            <button
              onClick={() => {
                setActiveNpcChatId(firstNpcInScene.id);
                setNpcMessages([{ sender: 'npc', text: firstNpcInScene.npc!.greeting }]);
              }}
              className="bg-purple-600/90 hover:bg-purple-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Ajukan Dialog ke {firstNpcInScene.npc?.npcName}
            </button>
          )}

          <button
            onClick={() => setShowInGameShop((v) => !v)}
            className="bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 transition"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            In-Game Store ({shardsBalance} Shards)
          </button>
        </div>
      )}

      {/* 3D COLLABORATOR CURSORS OVERLAY */}
      {projectedPeers.map(
        ({ peer, x, y, visible }) =>
          visible && (
            <div
              key={peer.peerId}
              style={{ transform: `translate(${x}px, ${y}px)` }}
              className="absolute top-0 left-0 z-10 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rotate-45 border border-white shadow-md"
                  style={{ backgroundColor: peer.color }}
                />
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-950 shadow-lg whitespace-nowrap flex items-center gap-1"
                  style={{ backgroundColor: peer.color }}
                >
                  {peer.isMobileTester && <Smartphone className="w-2.5 h-2.5" />}
                  {peer.name}
                </div>
              </div>
            </div>
          )
      )}

      {/* 3D PINNED COMMENTS OVERLAY */}
      {simState === 'stopped' &&
        projectedComments.map(
          ({ comment, x, y, visible }) =>
            visible &&
            !comment.resolved && (
              <div
                key={comment.id}
                style={{ left: `${x}px`, top: `${y}px` }}
                className="absolute z-20 -translate-x-1/2 -translate-y-full pointer-events-auto"
              >
                <button
                  onClick={() => setOpenCommentId(openCommentId === comment.id ? null : comment.id)}
                  className="group flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#0f1522]/95 border border-cyan-400/50 hover:border-cyan-300 shadow-lg text-[11px] text-slate-100 transition"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: comment.authorColor }}
                  />
                  <span className="max-w-[140px] truncate">{comment.text}</span>
                </button>

                {openCommentId === comment.id && (
                  <div className="mt-1.5 w-64 bg-[#0f1522] border border-slate-700 rounded-xl p-3 shadow-2xl text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-cyan-300">{comment.author}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onResolveComment(comment.id);
                            setOpenCommentId(null);
                          }}
                          title="Resolve Comment"
                          className="text-emerald-400 hover:text-emerald-300 p-0.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setOpenCommentId(null)}
                          className="text-slate-400 hover:text-slate-200 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-200 mb-2 leading-relaxed">{comment.text}</p>
                    {comment.replies.length > 0 && (
                      <div className="space-y-1.5 border-t border-slate-800 pt-2 mb-2">
                        {comment.replies.map((r) => (
                          <div key={r.id} className="bg-slate-900/80 rounded p-1.5 text-[11px]">
                            <span className="text-purple-300 font-medium">{r.author}: </span>
                            <span className="text-slate-300">{r.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && replyText.trim()) {
                            onReplyComment(comment.id, replyText.trim());
                            setReplyText('');
                          }
                        }}
                        placeholder="Balas di ruang 3D..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        onClick={() => {
                          if (replyText.trim()) {
                            onReplyComment(comment.id, replyText.trim());
                            setReplyText('');
                          }
                        }}
                        className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded hover:bg-cyan-500/30"
                      >
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
        )}

      {/* NEW 3D PINNED COMMENT COMPOSER */}
      {pendingCommentTarget && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#0f1522] border border-cyan-400/60 rounded-xl p-3 w-80 shadow-2xl">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-cyan-300">
              Pin 3D Comment ke "{entities.find((e) => e.id === pendingCommentTarget)?.name}"
            </span>
            <button onClick={() => setPendingCommentTarget(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCommentText.trim()) {
                  onAddComment(pendingCommentTarget, newCommentText.trim(), [0, 2.1, 0]);
                  setNewCommentText('');
                  setPendingCommentTarget(null);
                  onChangeGizmoMode('translate');
                }
              }}
              placeholder="Tulis catatan desain untuk tim..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => {
                if (newCommentText.trim()) {
                  onAddComment(pendingCommentTarget, newCommentText.trim(), [0, 2.1, 0]);
                  setNewCommentText('');
                  setPendingCommentTarget(null);
                  onChangeGizmoMode('translate');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400"
            >
              Pin
            </button>
          </div>
        </div>
      )}

      {/* AI NPC INTERACTIVE DIALOGUE MODAL IN VIEWPORT */}
      {activeNpcEntity?.npc && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-lg bg-[#0f1522]/95 backdrop-blur-xl border border-purple-500/50 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
                {activeNpcEntity.npc.npcName}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200">
                  Aether AI NPC LLM
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">{activeNpcEntity.npc.roleTitle}</p>
            </div>
            <button
              onClick={() => setActiveNpcChatId(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-36 overflow-y-auto space-y-2 mb-3 pr-1">
            {npcMessages.map((m, idx) => (
              <div
                key={idx}
                className={`text-xs px-3 py-2 rounded-xl ${
                  m.sender === 'npc'
                    ? 'bg-slate-900/90 border border-purple-500/30 text-slate-200'
                    : 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100 ml-8'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="flex gap-1.5 mb-2 flex-wrap">
            {['Apa misi rahasia di sini?', 'Di mana lokasi kristal?', 'Beli item upgrade'].map((q) => (
              <button
                key={q}
                onClick={() => {
                  const reply = generateNPCDialogueReply(activeNpcEntity.npc!, q, entities);
                  setNpcMessages((prev) => [
                    ...prev,
                    { sender: 'player', text: q },
                    { sender: 'npc', text: reply },
                  ]);
                }}
                className="text-[11px] px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={npcInput}
              onChange={(e) => setNpcInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendNpcMessage()}
              placeholder="Ketik dialog bebas ke NPC..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={sendNpcMessage}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" /> Kirim
            </button>
          </div>
        </div>
      )}

      {/* IN-GAME MONETIZATION STORE DEMO (STRIPE / MIDTRANS) */}
      {showInGameShop && (
        <div className="absolute top-16 right-4 z-30 w-80 bg-[#0f1522]/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl p-4 shadow-2xl text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4" /> Aether In-Game Store
            </span>
            <button onClick={() => setShowInGameShop(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">
            Saldo: <strong className="text-emerald-300">{shardsBalance} Shards</strong> • Gateway: Stripe & Midtrans QRIS
          </p>
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-100">Aether Thruster Boots</div>
                <div className="text-[11px] text-slate-400">+35% Jump & Move Speed di Live Play</div>
              </div>
              <button
                disabled={boostUnlocked}
                onClick={() => {
                  if (shardsBalance >= 150) {
                    setShardsBalance((s) => s - 150);
                    setBoostUnlocked(true);
                    spatialAudio.playSpatialSfx('collect');
                    onConsoleLog('info', 'MonetizationSDK', 'Item "Aether Thruster Boots" dibeli (150 Shards). Boost +35% aktif!');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg font-semibold ${
                  boostUnlocked
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {boostUnlocked ? 'Aktif' : '150 Shards'}
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-100">+500 Aether Shards Pack</div>
                <div className="text-[11px] text-slate-400">Rp 15.000 (QRIS Midtrans) / $0.99 Stripe</div>
              </div>
              <button
                onClick={() => {
                  setShardsBalance((s) => s + 500);
                  spatialAudio.playSpatialSfx('crystal');
                  onConsoleLog('info', 'Midtrans/Stripe', 'Sandbox Top-Up +500 Aether Shards berhasil!');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 hover:bg-cyan-500/30 font-semibold"
              >
                Top Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARGET PREVIEW OVERLAY: MOBILE PHONE FRAME + TOUCH GAMEPAD */}
      {targetPlatform === 'mobile' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="w-[330px] h-[92%] rounded-[36px] border-[6px] border-slate-800/95 shadow-[0_0_0_9999px_rgba(5,8,15,0.68)] relative flex flex-col justify-between p-4">
            <div className="mx-auto w-24 h-4 rounded-full bg-slate-900 border border-slate-700/60 flex items-center justify-center text-[9px] text-cyan-300">
              MOBILE 60Hz
            </div>
            <div className="flex items-end justify-between pointer-events-auto pb-1">
              {/* Virtual Touch D-Pad */}
              <div className="grid grid-cols-3 gap-1 w-24 h-24 bg-slate-900/75 backdrop-blur rounded-2xl p-1.5 border border-slate-700/60">
                <div />
                <button
                  onPointerDown={() => setVirtualKey('KeyW', true)}
                  onPointerUp={() => setVirtualKey('KeyW', false)}
                  onPointerLeave={() => setVirtualKey('KeyW', false)}
                  className="bg-slate-800 active:bg-cyan-500/40 rounded text-[10px] font-bold text-cyan-200"
                >
                  ▲
                </button>
                <div />
                <button
                  onPointerDown={() => setVirtualKey('KeyA', true)}
                  onPointerUp={() => setVirtualKey('KeyA', false)}
                  onPointerLeave={() => setVirtualKey('KeyA', false)}
                  className="bg-slate-800 active:bg-cyan-500/40 rounded text-[10px] font-bold text-cyan-200"
                >
                  ◀
                </button>
                <div className="rounded-full bg-cyan-500/20 m-1" />
                <button
                  onPointerDown={() => setVirtualKey('KeyD', true)}
                  onPointerUp={() => setVirtualKey('KeyD', false)}
                  onPointerLeave={() => setVirtualKey('KeyD', false)}
                  className="bg-slate-800 active:bg-cyan-500/40 rounded text-[10px] font-bold text-cyan-200"
                >
                  ▶
                </button>
                <div />
                <button
                  onPointerDown={() => setVirtualKey('KeyS', true)}
                  onPointerUp={() => setVirtualKey('KeyS', false)}
                  onPointerLeave={() => setVirtualKey('KeyS', false)}
                  className="bg-slate-800 active:bg-cyan-500/40 rounded text-[10px] font-bold text-cyan-200"
                >
                  ▼
                </button>
                <div />
              </div>

              {/* Jump Button */}
              <button
                onPointerDown={() => setVirtualKey('Space', true)}
                onPointerUp={() => setVirtualKey('Space', false)}
                onPointerLeave={() => setVirtualKey('Space', false)}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/80 to-purple-600/80 border-2 border-cyan-300/70 text-xs font-bold text-white shadow-lg active:scale-95"
              >
                JUMP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TARGET PREVIEW OVERLAY: VR STEREOSCOPIC HEADSET */}
      {targetPlatform === 'vr' && (
        <div className="absolute inset-0 pointer-events-none z-10 flex">
          <div className="w-1/2 h-full border-r-2 border-cyan-400/40 shadow-[inset_0_0_60px_rgba(0,0,0,0.85)] flex items-end justify-center pb-3">
            <span className="px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-cyan-300 flex items-center gap-1">
              <Glasses className="w-3 h-3" /> WebXR Left Eye
            </span>
          </div>
          <div className="w-1/2 h-full shadow-[inset_0_0_60px_rgba(0,0,0,0.85)] flex items-end justify-center pb-3">
            <span className="px-2 py-0.5 rounded bg-slate-900/80 text-[10px] text-purple-300 flex items-center gap-1">
              <Glasses className="w-3 h-3" /> WebXR Right Eye
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
