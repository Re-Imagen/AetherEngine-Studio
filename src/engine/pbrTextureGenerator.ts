import type { GeneratedPBRTexturePack } from '../types/engine';

function hash2D(ix: number, iy: number, seed: number): number {
  const px = ((ix % 64) + 64) % 64;
  const py = ((iy % 64) + 64) % 64;
  let n = px * 374761393 + py * 668265263 + seed * 1442695041;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function tileableValueNoise(u: number, v: number, freq: number, seed: number): number {
  const x = u * freq;
  const y = v * freq;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const wrap = (k: number) => ((k % freq) + freq) % freq;
  const a = hash2D(wrap(ix), wrap(iy), seed);
  const b = hash2D(wrap(ix + 1), wrap(iy), seed);
  const c = hash2D(wrap(ix), wrap(iy + 1), seed);
  const d = hash2D(wrap(ix + 1), wrap(iy + 1), seed);

  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

function fbmSeamless(u: number, v: number, baseFreq: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let freq = baseFreq;
  for (let i = 0; i < 4; i++) {
    sum += amp * tileableValueNoise(u, v, freq, seed + i * 31);
    freq *= 2;
    amp *= 0.5;
  }
  return sum;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function stringSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function generateProceduralPBRPack(prompt: string): GeneratedPBRTexturePack {
  const size = 256;
  const lower = prompt.toLowerCase();
  const seed = stringSeed(lower);

  const isBrick = /bata|brick|dinding|tembok|masonry|cobble/.test(lower);
  const isMoss = /lumut|moss|rumput|forest|jungle|hijau|overgrown/.test(lower);
  const isSciFi = /sci-fi|scifi|cyber|neon|hex|panel|metal|tech|futur/.test(lower);
  const isLava = /lava|magma|vulkan|fire|api|ember|molten/.test(lower);
  const isWood = /kayu|wood|plank|papan|oak|bark/.test(lower);
  const isGold = /emas|gold|treasure|royal|brass|perunggu/.test(lower);
  const isIce = /es|ice|crystal|kristal|frost|frozen/.test(lower);

  const height = new Float32Array(size * size);
  const albedoRGBA = new Uint8ClampedArray(size * size * 4);
  const roughRGBA = new Uint8ClampedArray(size * size * 4);
  const metalRGBA = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = y * size + x;
      const p4 = idx * 4;

      const n1 = fbmSeamless(u, v, 8, seed);
      const n2 = fbmSeamless(u, v, 16, seed + 77);

      let r = 130, g = 138, b = 150;
      let h = n1;
      let rough = 0.65;
      let metal = 0.08;

      if (isBrick) {
        const rows = 8;
        const cols = 4;
        const row = Math.floor(v * rows);
        const offsetU = (u + (row % 2) * 0.5 / cols) % 1;
        const bx = (offsetU * cols) % 1;
        const by = (v * rows) % 1;
        const mortarX = Math.min(bx, 1 - bx);
        const mortarY = Math.min(by, 1 - by);
        const mortarMask = Math.min(mortarX * 16, mortarY * 12);
        const isBrickFace = Math.min(1, Math.max(0, (mortarMask - 0.55) * 3.2));
        const brickTint = hash2D(Math.floor(offsetU * cols), row, seed);

        r = 48 + isBrickFace * (108 + brickTint * 36 + (n2 - 0.5) * 30);
        g = 46 + isBrickFace * (42 + brickTint * 18 + (n2 - 0.5) * 18);
        b = 45 + isBrickFace * (34 + brickTint * 14);
        h = isBrickFace * (0.68 + n2 * 0.28) + (1 - isBrickFace) * (0.15 + n1 * 0.1);
        rough = isBrickFace ? 0.78 - n2 * 0.12 : 0.92;
        metal = 0.03;

        if (isMoss) {
          const mossNoise = fbmSeamless(u, v, 6, seed + 209) + (1 - isBrickFace) * 0.32;
          if (mossNoise > 0.56) {
            const mAmt = Math.min(1, (mossNoise - 0.56) * 3.8);
            r = r * (1 - mAmt) + (38 + n2 * 36) * mAmt;
            g = g * (1 - mAmt) + (112 + n2 * 64) * mAmt;
            b = b * (1 - mAmt) + (34 + n1 * 22) * mAmt;
            h += mAmt * 0.14;
            rough = 0.88;
          }
        }
      } else if (isSciFi) {
        // Hex / Cyber Tech Panel Grid
        const gx = Math.abs(((u * 6) % 1) - 0.5);
        const gy = Math.abs(((v * 6) % 1) - 0.5);
        const seam = Math.max(gx, gy);
        const groove = seam > 0.43 ? 1 : 0;
        const circuit = Math.sin(u * Math.PI * 24) * Math.cos(v * Math.PI * 24) > 0.84 ? 1 : 0;

        if (groove) {
          r = 0;
          g = 235;
          b = 255;
          h = 0.18;
          rough = 0.2;
          metal = 0.9;
        } else if (circuit) {
          r = 168;
          g = 85;
          b = 247;
          h = 0.55;
          rough = 0.25;
          metal = 0.85;
        } else {
          const plate = 34 + n2 * 32;
          r = plate;
          g = plate + 8;
          b = plate + 20;
          h = 0.78 + n1 * 0.12;
          rough = 0.3 + n2 * 0.18;
          metal = 0.88;
        }
      } else if (isLava) {
        const crack = Math.abs(n1 - 0.5) * 2;
        if (crack < 0.16) {
          const heat = 1 - crack / 0.16;
          r = 255;
          g = 80 + heat * 155;
          b = 15 + heat * 45;
          h = 0.15;
          rough = 0.25;
          metal = 0.05;
        } else {
          const rock = 24 + n2 * 38;
          r = rock + 8;
          g = rock;
          b = rock + 4;
          h = 0.5 + crack * 0.45 + n2 * 0.15;
          rough = 0.88;
          metal = 0.12;
        }
      } else if (isWood) {
        const plank = Math.floor(v * 6);
        const py = (v * 6) % 1;
        const gap = py < 0.04 || py > 0.96 ? 1 : 0;
        const grain = Math.sin((u * 4 + fbmSeamless(u, v, 8, seed) * 0.9) * Math.PI * 14) * 0.5 + 0.5;
        if (gap) {
          r = 28; g = 18; b = 12;
          h = 0.12;
          rough = 0.95;
          metal = 0.0;
        } else {
          const tint = hash2D(plank, 1, seed) * 22;
          r = 105 + grain * 48 + tint;
          g = 68 + grain * 32 + tint * 0.6;
          b = 38 + grain * 18;
          h = 0.62 + grain * 0.22 + n2 * 0.1;
          rough = 0.68 + (1 - grain) * 0.2;
          metal = 0.02;
        }
      } else if (isGold) {
        const ornament = Math.sin(u * Math.PI * 12 + n1 * 3) * Math.sin(v * Math.PI * 12 + n2 * 3);
        const raised = ornament > 0.15 ? 1 : 0.35;
        r = 195 + raised * 55;
        g = 148 + raised * 52;
        b = 36 + raised * 30;
        h = 0.35 + raised * 0.5 + n2 * 0.12;
        rough = raised > 0.5 ? 0.22 : 0.48;
        metal = 0.95;
      } else if (isIce) {
        const facet = Math.abs(n1 - n2);
        r = 120 + facet * 110;
        g = 210 + facet * 45;
        b = 245 + facet * 10;
        h = 0.45 + facet * 0.5;
        rough = 0.15 + n2 * 0.2;
        metal = 0.18;
      } else {
        // Custom organic / stone / stylized material derived from prompt seed + moss option
        const baseR = 55 + ((seed >> 3) % 130);
        const baseG = isMoss ? 125 : 55 + ((seed >> 9) % 130);
        const baseB = 60 + ((seed >> 15) % 135);
        r = baseR * (0.65 + n1 * 0.7);
        g = baseG * (0.65 + n2 * 0.7);
        b = baseB * (0.65 + n1 * 0.65);
        h = n1 * 0.7 + n2 * 0.3;
        rough = 0.4 + n2 * 0.45;
        metal = 0.15 + (n1 > 0.65 ? 0.35 : 0);
      }

      height[idx] = h;
      albedoRGBA[p4] = clampByte(r);
      albedoRGBA[p4 + 1] = clampByte(g);
      albedoRGBA[p4 + 2] = clampByte(b);
      albedoRGBA[p4 + 3] = 255;

      const rv = clampByte(rough * 255);
      roughRGBA[p4] = rv;
      roughRGBA[p4 + 1] = rv;
      roughRGBA[p4 + 2] = rv;
      roughRGBA[p4 + 3] = 255;

      const mv = clampByte(metal * 255);
      metalRGBA[p4] = mv;
      metalRGBA[p4 + 1] = mv;
      metalRGBA[p4 + 2] = mv;
      metalRGBA[p4 + 3] = 255;
    }
  }

  // Compute Tangent-Space Normal Map via wrapped Sobel filter
  const normalRGBA = new Uint8ClampedArray(size * size * 4);
  const strength = 3.2;
  const sampleH = (sx: number, sy: number) => {
    const wx = ((sx % size) + size) % size;
    const wy = ((sy % size) + size) % size;
    return height[wy * size + wx];
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;

      const p4 = (y * size + x) * 4;
      normalRGBA[p4] = clampByte((nx * 0.5 + 0.5) * 255);
      normalRGBA[p4 + 1] = clampByte((ny * 0.5 + 0.5) * 255);
      normalRGBA[p4 + 2] = clampByte((nz * 0.5 + 0.5) * 255);
      normalRGBA[p4 + 3] = 255;
    }
  }

  const toDataUrl = (pixels: Uint8ClampedArray): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = new ImageData(new Uint8ClampedArray(pixels), size, size);
    ctx.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const cleanName = prompt
    .trim()
    .slice(0, 28)
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: `pbr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName || 'Procedural PBR Material',
    prompt,
    albedoDataUrl: toDataUrl(albedoRGBA),
    normalDataUrl: toDataUrl(normalRGBA),
    roughnessDataUrl: toDataUrl(roughRGBA),
    metallicDataUrl: toDataUrl(metalRGBA),
    createdAt: Date.now(),
  };
}
