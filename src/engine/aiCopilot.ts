import type { AINPCConfig, SceneEntity } from '../types/engine';

/**
 * Strips basic TypeScript parameter/variable annotations so user & AI TypeScript
 * scripts execute directly in-browser at 60 FPS with zero build step.
 */
export function transpileAetherTS(tsCode: string): string {
  return tsCode
    .replace(/export\s+function\s+/g, 'function ')
    .replace(/:\s*(AetherEntity|InputState|WorldAPI|number|string|boolean|any|void)(\[\])?/g, '')
    .replace(/as\s+(number|string|boolean|any)/g, '');
}

export function generateAIScriptFromPrompt(prompt: string, entityName = 'TargetObject'): {
  code: string;
  summary: string;
  enablePhysicsDynamic: boolean;
} {
  const p = prompt.toLowerCase();
  const wantsJump = /lompat|melompat|jump|loncat|hop/.test(p);
  const wantsChase = /kejar|mengejar|chase|follow|ikuti|target\s*pemain|player/.test(p);
  const wantsRotate = /putar|berputar|spin|rotasi|rotate/.test(p);
  const wantsHover = /melayang|hover|float|naik\s*turun|oscillat/.test(p);
  const wantsPatrol = /patrol|bolak|mondar|wander/.test(p);
  const wantsPulse = /kedip|glow|neon|bercahaya|pulse|warna/.test(p);
  const wantsWASD = /wasd|kontrol|gerak\s*pemain|player\s*control/.test(p);

  const lines: string[] = [
    `// Aether AI Generated Script for "${entityName}"`,
    `// Prompt: "${prompt.trim()}"`,
    `export function onUpdate(entity: AetherEntity, dt: number, input: InputState, world: WorldAPI): void {`,
  ];

  const features: string[] = [];

  if (wantsJump) {
    features.push('Jump on Spacebar');
    lines.push(
      `  // Lompat saat tombol Spasi ditekan dan objek menyentuh tanah`,
      `  if (input.keys['Space'] && entity.isGrounded) {`,
      `    entity.velocity.y = 8.2;`,
      `    entity.isGrounded = false;`,
      `    world.playSfx('jump', entity.position);`,
      `  }`
    );
  }

  if (wantsChase) {
    features.push('Chase Player AI');
    lines.push(
      `  // Mengejar posisi pemain secara mulus di bidang XZ`,
      `  const player = world.getPlayer();`,
      `  if (player && player.id !== entity.id) {`,
      `    const dx = player.position.x - entity.position.x;`,
      `    const dz = player.position.z - entity.position.z;`,
      `    const dist = Math.hypot(dx, dz);`,
      `    if (dist > 1.35) {`,
      `      const chaseSpeed = 3.8;`,
      `      entity.position.x += (dx / dist) * chaseSpeed * dt;`,
      `      entity.position.z += (dz / dist) * chaseSpeed * dt;`,
      `      entity.rotation.y = Math.atan2(dx, dz) * (180 / Math.PI);`,
      `    }`,
      `  }`
    );
  }

  if (wantsWASD) {
    features.push('WASD Movement');
    lines.push(
      `  // Kontrol pergerakan karakter dengan WASD`,
      `  const moveSpeed = 5.5;`,
      `  if (input.keys['KeyW'] || input.keys['ArrowUp']) entity.position.z -= moveSpeed * dt;`,
      `  if (input.keys['KeyS'] || input.keys['ArrowDown']) entity.position.z += moveSpeed * dt;`,
      `  if (input.keys['KeyA'] || input.keys['ArrowLeft']) entity.position.x -= moveSpeed * dt;`,
      `  if (input.keys['KeyD'] || input.keys['ArrowRight']) entity.position.x += moveSpeed * dt;`
    );
  }

  if (wantsPatrol && !wantsChase) {
    features.push('Waypoint Patrol');
    lines.push(
      `  // Patroli sinusoidal bolak-balik`,
      `  entity.position.x += Math.cos(world.time * 1.6) * 3.2 * dt;`,
      `  entity.rotation.y = Math.cos(world.time * 1.6) >= 0 ? 90 : -90;`
    );
  }

  if (wantsHover) {
    features.push('Anti-Gravity Hover');
    lines.push(
      `  // Efek melayang halus dengan gelombang sinus`,
      `  entity.position.y = Math.max(0.6, entity.baseY + Math.sin(world.time * 2.6) * 0.45);`
    );
  }

  if (wantsRotate || features.length === 0) {
    features.push('Continuous Spin');
    lines.push(
      `  // Rotasi dinamis per frame`,
      `  entity.rotation.y = (entity.rotation.y + 75 * dt) % 360;`
    );
  }

  if (wantsPulse) {
    features.push('Neon Emissive Pulse');
    lines.push(
      `  // Denyut intensitas cahaya material PBR`,
      `  entity.emissiveIntensity = 0.8 + Math.sin(world.time * 4.0) * 0.6;`
    );
  }

  lines.push(`}`);

  return {
    code: lines.join('\n'),
    summary: `Skrip TypeScript berhasil dibuat (${features.join(' + ')}) dan siap dijalankan di mode Play!`,
    enablePhysicsDynamic: wantsJump,
  };
}

export function generateAINPCProfile(prompt: string, fallbackName = 'Aether Guardian'): AINPCConfig {
  const lower = prompt.toLowerCase();
  if (/pedagang|merchant|cyber|toko|senjata/.test(lower)) {
    return {
      enabled: true,
      npcName: 'Vex-7 (Cyber Merchant)',
      roleTitle: 'Black-Market Arms & Augment Dealer',
      personality: 'Cerdas, sarkastik ringan, berbicara dengan slang cyberpunk namun sangat membantu jika pemain sopan.',
      greeting: 'Hei Runner! Sensor optikku mendeteksi energi kristal di tasmu. Mau upgrade plasma blade atau info rahasia Sektor 9?',
      knowledgeBase: [
        'Gerbang utama Sektor 9 dijaga oleh dua Cyber Drone berpatroli. Gunakan lompatan tinggi untuk melewati laser.',
        'Aku menjual Plasma Core seharga 150 Aether Shards yang meningkatkan kekuatan lompatanmu.',
        'Rumor mengatakan inti AI kuno tersembunyi di balik pilar neon utara.',
      ],
    };
  }
  if (/penyihir|mage|wizard|kristal|eldoria/.test(lower)) {
    return {
      enabled: true,
      npcName: 'Archmage Lyra',
      roleTitle: 'Penjaga Segel Kristal Eldoria',
      personality: 'Bijaksana, puitis, penuh misteri kuno, memberi petunjuk quest secara imersif.',
      greeting: 'Selamat datang, Pengembara Cahaya. Kristal Aether bergetar sejak kedatanganmu di reruntuhan ini.',
      knowledgeBase: [
        'Tiga pilar batu berlumut menyimpan energi kuno yang menjaga pulau ini tetap melayang.',
        'Sentuh Kristal Mana di altar tengah untuk memulihkan energi gravitasi.',
        'Berhati-hatilah terhadap bayangan yang bergerak saat matahari tenggelam di ufuk barat.',
      ],
    };
  }
  return {
    enabled: true,
    npcName: fallbackName,
    roleTitle: 'Autonomous AI Companion',
    personality: prompt.trim() || 'Ramah, responsif terhadap dunia sekitar, dan siap membantu petualangan pemain.',
    greeting: `Halo! Aku ${fallbackName}. Ada yang ingin kau tanyakan tentang wilayah ini?`,
    knowledgeBase: [
      `Karakter ini dikendalikan oleh Aether Lightweight LLM Behavior dengan konteks: "${prompt.trim()}".`,
      'Coba tanyakan tentang misi/quest, rahasia lokasi, atau tips bertarung!',
      'Semua respons dihasilkan secara dinamis berdasarkan kepribadian NPC dan status scene.',
    ],
  };
}

export function generateNPCDialogueReply(npc: AINPCConfig, userMessage: string, sceneContext: SceneEntity[]): string {
  const q = userMessage.toLowerCase();
  if (/misi|quest|tugas|bantu|apa yang harus/.test(q)) {
    return `${npc.knowledgeBase[0] || 'Jelajahi area pusat dan kumpulkan kristal energi.'} Jika kau berhasil, kembali padaku untuk hadiah spesial!`;
  }
  if (/rahasia|lokasi|peta|dimana|petunjuk|boss/.test(q)) {
    return npc.knowledgeBase[1] || `Menurut pengamatanku, ada ${sceneContext.length} objek aktif di area ini. Perhatikan objek yang berpendar neon!`;
  }
  if (/beli|pedang|senjata|item|upgrade|harga|toko/.test(q)) {
    return `Tentu! Sebagai ${npc.roleTitle}, aku merekomendasikan Aether Thruster Boots agar lompatanmu dua kali lebih tinggi.`;
  }
  if (/siapa|nama|kamu/.test(q)) {
    return `Aku ${npc.npcName}, ${npc.roleTitle}. ${npc.personality}`;
  }
  const pick = npc.knowledgeBase[Math.floor(Math.random() * npc.knowledgeBase.length)] || npc.greeting;
  return `"${userMessage.trim()}"? Menarik! ${pick}`;
}
