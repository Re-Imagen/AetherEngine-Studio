import * as THREE from 'three';
import type { GeneratedPBRTexturePack, SceneEntity, ShadingMode } from '../types/engine';

const textureCache = new Map<string, THREE.Texture>();

function loadCachedTexture(key: string, dataUrl: string, repeat: [number, number] = [2, 2], isColor = false): THREE.Texture {
  const cacheKey = `${key}_${repeat[0]}_${repeat[1]}`;
  const existing = textureCache.get(cacheKey);
  if (existing) return existing;

  const tex = new THREE.TextureLoader().load(dataUrl);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  textureCache.set(cacheKey, tex);
  return tex;
}

export function createEntityMaterial(
  entity: SceneEntity,
  shadingMode: ShadingMode,
  texturePacks: GeneratedPBRTexturePack[]
): THREE.Material {
  const matCfg = entity.material;
  const pack = matCfg.texturePackId
    ? texturePacks.find((p) => p.id === matCfg.texturePackId)
    : undefined;
  const rep: [number, number] = matCfg.textureRepeat || [2, 2];

  if (shadingMode === 'unlit') {
    const basic = new THREE.MeshBasicMaterial({
      color: new THREE.Color(matCfg.albedo),
      wireframe: matCfg.wireframe,
      transparent: matCfg.transparent,
      opacity: matCfg.opacity,
    });
    if (pack) {
      basic.map = loadCachedTexture(`${pack.id}_alb`, pack.albedoDataUrl, rep, true);
    }
    return basic;
  }

  const std = new THREE.MeshStandardMaterial({
    color: new THREE.Color(pack ? '#ffffff' : matCfg.albedo),
    metalness: shadingMode === 'raytraced' ? Math.min(1, matCfg.metallic + 0.06) : matCfg.metallic,
    roughness: shadingMode === 'raytraced' ? Math.max(0.04, matCfg.roughness - 0.05) : matCfg.roughness,
    emissive: new THREE.Color(matCfg.emissive),
    emissiveIntensity: matCfg.emissiveIntensity,
    wireframe: shadingMode === 'wireframe' || matCfg.wireframe,
    transparent: matCfg.transparent,
    opacity: matCfg.opacity,
    side: entity.meshPrimitive === 'plane' ? THREE.DoubleSide : THREE.FrontSide,
    envMapIntensity: shadingMode === 'raytraced' ? 1.1 : 0.8,
  });

  if (pack) {
    std.map = loadCachedTexture(`${pack.id}_alb`, pack.albedoDataUrl, rep, true);
    std.normalMap = loadCachedTexture(`${pack.id}_nrm`, pack.normalDataUrl, rep, false);
    std.normalScale = new THREE.Vector2(matCfg.normalScale, matCfg.normalScale);
    std.roughnessMap = loadCachedTexture(`${pack.id}_rgh`, pack.roughnessDataUrl, rep, false);
    std.metalnessMap = loadCachedTexture(`${pack.id}_mtl`, pack.metallicDataUrl, rep, false);
  }

  return std;
}

export function buildEntityObject3D(
  entity: SceneEntity,
  shadingMode: ShadingMode,
  texturePacks: GeneratedPBRTexturePack[]
): THREE.Object3D {
  const group = new THREE.Group();
  group.name = entity.id;
  group.userData.entityId = entity.id;

  // GPU Particle System
  if (entity.type === 'particle' && entity.particle) {
    const cfg = entity.particle;
    const count = Math.max(500, Math.min(60000, cfg.count));
    const geom = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 3);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const theta = Math.random() * Math.PI * 2;
      seeds[i * 3] = Math.cos(theta) * r * cfg.spread;
      seeds[i * 3 + 1] = Math.random() * cfg.lifetime;
      seeds[i * 3 + 2] = Math.sin(theta) * r * cfg.spread;
      phases[i] = Math.random();
    }

    geom.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
    geom.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const modeIndex =
      cfg.mode === 'fire' ? 0 : cfg.mode === 'sparks' ? 1 : cfg.mode === 'galaxy' ? 2 : cfg.mode === 'snow' ? 3 : 4;

    const shaderMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: cfg.speed },
        uLifetime: { value: Math.max(0.5, cfg.lifetime) },
        uSize: { value: cfg.size * 180 },
        uColorA: { value: new THREE.Color(cfg.colorStart) },
        uColorB: { value: new THREE.Color(cfg.colorEnd) },
        uMode: { value: modeIndex },
      },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uLifetime;
        uniform float uSize;
        uniform float uMode;
        varying float vLife;
        void main() {
          float t = mod(uTime * uSpeed + aPhase * uLifetime, uLifetime) / uLifetime;
          vLife = t;
          vec3 p = position;
          if (uMode > 1.5 && uMode < 2.5) {
            // Galaxy spiral
            float ang = uTime * uSpeed * 0.8 + length(p.xz) * 0.9;
            float rad = length(p.xz);
            p.x = cos(ang + aPhase * 6.28) * rad;
            p.z = sin(ang + aPhase * 6.28) * rad;
            p.y = sin(aPhase * 12.0 + uTime * 2.0) * 0.45;
          } else if (uMode > 3.5) {
            // Portal vortex
            float ang = uTime * uSpeed * 1.4 + aPhase * 6.283;
            float rad = mix(0.4, length(p.xz) + 0.6, 1.0 - t * 0.4);
            p.x = cos(ang) * rad;
            p.z = sin(ang) * rad;
            p.y = t * 3.4;
          } else if (uMode > 2.5 && uMode < 3.5) {
            // Snow fall
            p.y = (1.0 - t) * 5.0;
            p.x += sin(uTime + aPhase * 10.0) * 0.35;
          } else {
            // Fire / Sparks rise
            p.y = t * 3.6;
            p.x *= (1.0 - t * 0.35);
            p.z *= (1.0 - t * 0.35);
          }
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(uSize / max(1.0, -mvPosition.z), 1.5, 24.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vLife;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.05, d) * sin(vLife * 3.14159);
          vec3 col = mix(uColorA, uColorB, vLife);
          gl_FragColor = vec4(col, alpha * 0.9);
        }
      `,
    });

    const points = new THREE.Points(geom, shaderMat);
    points.name = 'gpu_particles';
    points.userData.entityId = entity.id;
    group.add(points);

    // Subtle emitter gizmo core so raycasting can select it easily
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.24, 0),
      new THREE.MeshBasicMaterial({ color: cfg.colorStart, wireframe: true })
    );
    core.userData.entityId = entity.id;
    group.add(core);
    return group;
  }

  // Light Node
  if (entity.type === 'light' && entity.light) {
    const l = entity.light;
    let lightObj: THREE.Light;
    if (l.subType === 'directional') {
      const dl = new THREE.DirectionalLight(l.color, l.intensity);
      dl.castShadow = l.castShadow;
      dl.shadow.mapSize.set(1024, 1024);
      dl.shadow.camera.near = 0.5;
      dl.shadow.camera.far = 45;
      dl.shadow.camera.left = -15;
      dl.shadow.camera.right = 15;
      dl.shadow.camera.top = 15;
      dl.shadow.camera.bottom = -15;
      lightObj = dl;
    } else if (l.subType === 'spot') {
      const sl = new THREE.SpotLight(l.color, l.intensity * 4, l.range, Math.PI / 5, 0.35);
      sl.castShadow = l.castShadow;
      lightObj = sl;
    } else if (l.subType === 'ambient') {
      lightObj = new THREE.AmbientLight(l.color, l.intensity);
    } else {
      const pl = new THREE.PointLight(l.color, l.intensity * 1.5, l.range, 1.6);
      pl.castShadow = l.castShadow;
      lightObj = pl;
    }
    group.add(lightObj);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ color: l.color, wireframe: true })
    );
    bulb.name = 'editor_helper';
    bulb.userData.entityId = entity.id;
    group.add(bulb);
    return group;
  }

  // Spatial Audio Node
  if (entity.type === 'audio') {
    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.03, 8, 24),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' })
    );
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.02, 8, 28),
      new THREE.MeshBasicMaterial({ color: '#a855f7', transparent: true, opacity: 0.55 })
    );
    ring2.rotation.x = Math.PI / 2;
    ring1.userData.entityId = entity.id;
    ring2.userData.entityId = entity.id;
    group.add(ring1, ring2);
    return group;
  }

  // Camera Node Helper
  if (entity.type === 'camera') {
    const camBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.32, 0.6),
      new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8, roughness: 0.25 })
    );
    const lens = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.35, 12),
      new THREE.MeshBasicMaterial({ color: '#00f0ff', wireframe: true })
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.z = -0.45;
    camBody.userData.entityId = entity.id;
    lens.userData.entityId = entity.id;
    group.add(camBody, lens);
    return group;
  }

  const mat = createEntityMaterial(entity, shadingMode, texturePacks);
  const prim = entity.meshPrimitive || 'box';

  const markMesh = (m: THREE.Mesh) => {
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.entityId = entity.id;
    return m;
  };

  if (prim === 'hero_knight') {
    // Articulated Humanoid Rig for State Machine + Foot/LookAt IK!
    const darkArmor = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      metalness: 0.75,
      roughness: 0.3,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: entity.material.emissive || '#00f0ff',
      emissive: entity.material.emissive || '#00f0ff',
      emissiveIntensity: 1.8,
    });

    const torso = markMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.55, 8, 16), mat));
    torso.position.y = 1.05;
    torso.name = 'rig_torso';

    const head = new THREE.Group();
    head.name = 'rig_head';
    head.position.set(0, 1.72, 0);
    const helmet = markMesh(new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), mat));
    const visor = markMesh(new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.16), visorMat));
    visor.position.set(0, 0.02, 0.18);
    head.add(helmet, visor);

    const leftLeg = markMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 10), darkArmor));
    leftLeg.position.set(-0.16, 0.38, 0);
    leftLeg.name = 'rig_leg_l';

    const rightLeg = markMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 6, 10), darkArmor));
    rightLeg.position.set(0.16, 0.38, 0);
    rightLeg.name = 'rig_leg_r';

    const leftArm = markMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.4, 6, 10), mat));
    leftArm.position.set(-0.44, 1.08, 0);
    leftArm.name = 'rig_arm_l';

    const rightArm = markMesh(new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.4, 6, 10), mat));
    rightArm.position.set(0.44, 1.08, 0);
    rightArm.name = 'rig_arm_r';

    // Energy blade in right hand
    const blade = markMesh(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.08), visorMat));
    blade.position.set(0, -0.35, 0.25);
    blade.rotation.x = Math.PI / 3;
    rightArm.add(blade);

    group.add(torso, head, leftLeg, rightLeg, leftArm, rightArm);
    return group;
  }

  if (prim === 'cyber_drone') {
    const core = markMesh(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), mat));
    const ring = markMesh(new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.07, 10, 28), mat));
    ring.rotation.x = Math.PI / 2;
    const eye = markMesh(
      new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 12, 12),
        new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#00f0ff', emissiveIntensity: 2.2 })
      )
    );
    eye.position.set(0, 0, 0.38);
    group.add(core, ring, eye);
    return group;
  }

  if (prim === 'sports_car') {
    const chassis = markMesh(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 3.1), mat));
    chassis.position.y = 0.42;
    const cabin = markMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(1.22, 0.36, 1.45),
        new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.95, roughness: 0.08 })
      )
    );
    cabin.position.set(0, 0.76, -0.15);
    const tailStrip = markMesh(
      new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: '#00f0ff', emissive: '#00f0ff', emissiveIntensity: 2.4 })
      )
    );
    tailStrip.position.set(0, 0.5, -1.55);

    const wheelMat = new THREE.MeshStandardMaterial({ color: '#111827', metalness: 0.5, roughness: 0.6 });
    const wheelOffsets: [number, number, number][] = [
      [-0.78, 0.28, 0.98],
      [0.78, 0.28, 0.98],
      [-0.78, 0.28, -0.98],
      [0.78, 0.28, -0.98],
    ];
    wheelOffsets.forEach(([wx, wy, wz], idx) => {
      const wheel = markMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 16), wheelMat));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.name = `wheel_${idx}`;
      group.add(wheel);
    });
    group.add(chassis, cabin, tailStrip);
    return group;
  }

  if (prim === 'crystal') {
    const mainCrystal = markMesh(new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), mat));
    const shardL = markMesh(new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat));
    shardL.position.set(-0.45, -0.25, 0.15);
    shardL.rotation.z = 0.35;
    const shardR = markMesh(new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), mat));
    shardR.position.set(0.42, -0.28, -0.15);
    shardR.rotation.z = -0.35;
    group.add(mainCrystal, shardL, shardR);
    return group;
  }

  if (prim === 'pine_tree') {
    const trunk = markMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.26, 1.2, 10),
        new THREE.MeshStandardMaterial({ color: '#5c3a21', roughness: 0.9 })
      )
    );
    trunk.position.y = 0.6;
    const c1 = markMesh(new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.5, 9), mat));
    c1.position.y = 1.65;
    const c2 = markMesh(new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.35, 9), mat));
    c2.position.y = 2.45;
    const c3 = markMesh(new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.1, 9), mat));
    c3.position.y = 3.15;
    group.add(trunk, c1, c2, c3);
    return group;
  }

  if (prim === 'ruin_pillar') {
    const base = markMesh(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 1.2), mat));
    base.position.y = 0.19;
    const shaft = markMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 2.8, 12), mat));
    shaft.position.y = 1.75;
    const cap = markMesh(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.32, 1.15), mat));
    cap.position.y = 3.25;
    const runeBand = markMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.49, 0.49, 0.18, 12),
        new THREE.MeshStandardMaterial({
          color: entity.material.emissive || '#00f0ff',
          emissive: entity.material.emissive || '#00f0ff',
          emissiveIntensity: 1.5,
        })
      )
    );
    runeBand.position.y = 2.1;
    group.add(base, shaft, cap, runeBand);
    return group;
  }

  if (prim === 'turret') {
    const pedestal = markMesh(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.72, 0.7, 12),
        new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.25 })
      )
    );
    pedestal.position.y = 0.35;
    const head = markMesh(new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.5, 0.85), mat));
    head.position.y = 0.92;
    const barrelL = markMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 10), mat));
    barrelL.rotation.x = Math.PI / 2;
    barrelL.position.set(-0.2, 0.92, 0.65);
    const barrelR = markMesh(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 10), mat));
    barrelR.rotation.x = Math.PI / 2;
    barrelR.position.set(0.2, 0.92, 0.65);
    group.add(pedestal, head, barrelL, barrelR);
    return group;
  }

  // Standard Geometric Primitives (including SoftBody high-segment plane!)
  let geom: THREE.BufferGeometry;
  switch (prim) {
    case 'sphere':
      geom = new THREE.SphereGeometry(0.6, 28, 28);
      break;
    case 'cylinder':
      geom = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 24);
      break;
    case 'capsule':
      geom = new THREE.CapsuleGeometry(0.4, 0.8, 10, 20);
      break;
    case 'plane': {
      const segs = entity.physics?.bodyType === 'softbody' ? 18 : 2;
      geom = new THREE.PlaneGeometry(1, 1, segs, segs);
      break;
    }
    case 'torus':
      geom = new THREE.TorusGeometry(0.52, 0.16, 16, 36);
      break;
    case 'cone':
      geom = new THREE.ConeGeometry(0.55, 1.2, 20);
      break;
    case 'box':
    default:
      geom = new THREE.BoxGeometry(1, 1, 1);
      break;
  }

  const mesh = markMesh(new THREE.Mesh(geom, mat));
  if (entity.physics?.bodyType === 'softbody') {
    mesh.name = 'softbody_mesh';
    // Store rest positions for real-time cloth wave physics!
    const posAttr = geom.attributes.position as THREE.BufferAttribute;
    mesh.userData.restPositions = new Float32Array(posAttr.array);
  }
  group.add(mesh);
  return group;
}
