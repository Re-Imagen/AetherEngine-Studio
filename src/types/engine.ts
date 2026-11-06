export type Vec3 = [number, number, number];

export type EntityType =
  | 'mesh'
  | 'character'
  | 'vehicle'
  | 'light'
  | 'camera'
  | 'sprite2d'
  | 'tilemap2d'
  | 'particle'
  | 'audio'
  | 'empty';

export type MeshPrimitive =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'capsule'
  | 'plane'
  | 'torus'
  | 'cone'
  | 'hero_knight'
  | 'cyber_drone'
  | 'sports_car'
  | 'crystal'
  | 'pine_tree'
  | 'ruin_pillar'
  | 'turret';

export type LightSubType = 'directional' | 'point' | 'spot' | 'ambient';

export type PhysicsBodyType =
  | 'static'
  | 'dynamic'
  | 'kinematic'
  | 'softbody'
  | 'vehicle'
  | 'ragdoll';

export type ColliderShape = 'box' | 'sphere' | 'capsule' | 'trimesh';

export type ScriptLanguage = 'typescript' | 'rust_wasm' | 'csharp_wasm';

export interface PBRMaterialConfig {
  albedo: string;
  metallic: number;
  roughness: number;
  normalScale: number;
  emissive: string;
  emissiveIntensity: number;
  wireframe: boolean;
  opacity: number;
  transparent: boolean;
  texturePackId?: string;
  textureRepeat?: [number, number];
}

export interface GeneratedPBRTexturePack {
  id: string;
  name: string;
  prompt: string;
  albedoDataUrl: string;
  normalDataUrl: string;
  roughnessDataUrl: string;
  metallicDataUrl: string;
  createdAt: number;
}

export interface PhysicsConfig {
  enabled: boolean;
  bodyType: PhysicsBodyType;
  collider: ColliderShape;
  mass: number;
  restitution: number;
  friction: number;
  gravityScale: number;
  isPlayerControlled?: boolean;
  jumpForce?: number;
  moveSpeed?: number;
}

export interface ScriptConfig {
  enabled: boolean;
  name: string;
  language: ScriptLanguage;
  code: string;
  wasmKernel?: 'none' | 'orbital' | 'hover_wave' | 'spring_chase';
}

export interface ParticleEmitterConfig {
  count: number;
  colorStart: string;
  colorEnd: string;
  size: number;
  speed: number;
  spread: number;
  lifetime: number;
  mode: 'fire' | 'sparks' | 'galaxy' | 'snow' | 'portal';
}

export interface SpatialAudioConfig {
  soundPreset: 'crystal_hum' | 'campfire' | 'cyber_synth' | 'thruster' | 'wind_ruins';
  volume: number;
  refDistance: number;
  maxDistance: number;
  dopplerFactor: number;
  reverbZone: 'none' | 'small_room' | 'cyber_alley' | 'cathedral' | 'open_field';
  loop: boolean;
  autoPlay: boolean;
}

export type AnimStateName = 'Idle' | 'Walk' | 'Run' | 'Jump';

export interface AnimatorConfig {
  enabled: boolean;
  currentState: AnimStateName;
  blendDuration: number;
  speedMultiplier: number;
  footIK: boolean;
  lookAtIK: boolean;
  lookAtTargetId?: string;
}

export interface AINPCConfig {
  enabled: boolean;
  npcName: string;
  roleTitle: string;
  personality: string;
  greeting: string;
  knowledgeBase: string[];
}

export interface Sprite2DConfig {
  glyph: 'runner' | 'coin' | 'slime' | 'platform_neon' | 'portal2d' | 'heart';
  tint: string;
  flipX: boolean;
  frameSpeed: number;
  sortingLayer: number;
}

export interface SceneEntity {
  id: string;
  parentId: string | null;
  name: string;
  tag: string;
  layer: string;
  type: EntityType;
  visible: boolean;
  locked: boolean;
  position: Vec3;
  rotation: Vec3; // Euler degrees
  scale: Vec3;
  meshPrimitive?: MeshPrimitive;
  material: PBRMaterialConfig;
  light?: {
    subType: LightSubType;
    color: string;
    intensity: number;
    range: number;
    castShadow: boolean;
  };
  camera?: {
    projection: 'perspective' | 'orthographic';
    fov: number;
    isMain: boolean;
  };
  physics?: PhysicsConfig;
  script?: ScriptConfig;
  visualScriptEnabled?: boolean;
  particle?: ParticleEmitterConfig;
  audio?: SpatialAudioConfig;
  animator?: AnimatorConfig;
  npc?: AINPCConfig;
  sprite2d?: Sprite2DConfig;
  tilemapGrid?: number[][];
}

export type BlueprintNodeType =
  | 'event_tick'
  | 'event_key_space'
  | 'event_proximity'
  | 'action_jump'
  | 'action_chase_player'
  | 'action_rotate'
  | 'action_hover_sin'
  | 'action_pulse_emissive'
  | 'action_play_sfx'
  | 'param_float'
  | 'param_color';

export interface BlueprintNode {
  id: string;
  type: BlueprintNodeType;
  title: string;
  category: 'event' | 'action' | 'value';
  x: number;
  y: number;
  params: Record<string, number | string | boolean>;
}

export interface BlueprintEdge {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
}

export interface VisualScriptGraph {
  id: string;
  targetEntityId: string | 'selected';
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export interface KeyframePoint {
  time: number; // 0..5 seconds
  value: number;
}

export interface AnimationTrack {
  id: string;
  entityId: string;
  property: 'position.y' | 'rotation.y' | 'scale.uniform' | 'emissiveIntensity';
  keyframes: KeyframePoint[];
}

export interface PinComment3D {
  id: string;
  entityId: string;
  author: string;
  authorColor: string;
  text: string;
  offset: Vec3;
  createdAt: number;
  resolved: boolean;
  replies: { id: string; author: string; text: string; createdAt: number }[];
}

export interface CollaboratorPresence {
  peerId: string;
  name: string;
  role: string;
  color: string;
  cursor3D: Vec3;
  selectedEntityId: string | null;
  isSimulated?: boolean;
  isMobileTester?: boolean;
}

export interface SceneSnapshot {
  id: string;
  branch: string;
  message: string;
  author: string;
  timestamp: number;
  entities: SceneEntity[];
  postProcessing: PostProcessingConfig;
}

export type ShadingMode = 'wireframe' | 'unlit' | 'lit' | 'raytraced';
export type TargetPlatform = 'web' | 'mobile' | 'vr';
export type GizmoMode = 'select' | 'translate' | 'rotate' | 'scale' | 'comment';
export type SimState = 'stopped' | 'playing' | 'paused';

export interface PostProcessingConfig {
  renderBackend: 'webgpu' | 'webgl2';
  shadingMode: ShadingMode;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  ssaoEnabled: boolean;
  ssaoIntensity: number;
  motionBlurEnabled: boolean;
  motionBlurAmount: number;
  dofEnabled: boolean;
  dofFocusDistance: number;
  colorGrading: 'aces_filmic' | 'cyberpunk' | 'warm_fantasy' | 'noir_contrast';
  giIntensity: number;
  skyPreset: 'cyber_night' | 'sunset_horizon' | 'studio_dark' | 'daylight_clear';
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'physics' | 'wasm' | 'ai' | 'collab';
  source: string;
  message: string;
}

export interface ProfilerSample {
  fps: number;
  frameTimeMs: number;
  memoryMb: number;
  drawCalls: number;
  triangles: number;
  physicsBodies: number;
  wasmStepUs: number;
}

export interface AssetItem {
  id: string;
  name: string;
  category: 'model3d' | 'material' | 'sprite2d' | 'script' | 'audio' | 'prefab';
  source: 'local_opfs' | 'cloud_r2';
  sizeKb: number;
  downloaded: boolean;
  badgeColor: string;
  description: string;
  spawnConfig?: Partial<SceneEntity>;
  texturePrompt?: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  templateId: string;
  genre: string;
  updatedAt: number;
  branch: string;
  entityCount: number;
  is2DMode: boolean;
  accentFrom: string;
  accentTo: string;
}
