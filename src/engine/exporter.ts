import type { PostProcessingConfig, SceneEntity } from '../types/engine';

function triggerDownload(filename: string, content: string, mimeType = 'text/html;charset=utf-8'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function exportStandaloneHTML5Game(
  projectName: string,
  entities: SceneEntity[],
  postProcessing: PostProcessingConfig
): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sceneJson = JSON.stringify({ projectName, entities, postProcessing });

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName} — Powered by AetherEngine</title>
  <style>
    html, body { margin: 0; height: 100%; background: #070b14; color: #e2e8f0; font-family: system-ui, sans-serif; overflow: hidden; }
    #hud { position: fixed; top: 14px; left: 14px; background: rgba(15,23,42,0.82); border: 1px solid rgba(0,240,255,0.35); border-radius: 10px; padding: 10px 14px; backdrop-filter: blur(8px); z-index: 10; }
    #hud h1 { margin: 0 0 4px 0; font-size: 14px; color: #00f0ff; }
    #hud p { margin: 0; font-size: 12px; color: #94a3b8; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="hud">
    <h1>${projectName}</h1>
    <p>WASD / Arrow Keys: Move • Space: Jump • Exported from AetherEngine Studio</p>
  </div>
  <canvas id="game"></canvas>
  <script>
    const SCENE = ${sceneJson};
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const keys = {};
    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    const objs = SCENE.entities.filter(e => e.visible && e.type !== 'light' && e.type !== 'camera').map(e => ({
      ...e,
      pos: [...e.position],
      vy: 0,
      isPlayer: e.tag === 'Player' || (e.physics && e.physics.isPlayerControlled)
    }));
    let player = objs.find(o => o.isPlayer) || objs[0];
    let camYaw = 0;

    let last = performance.now();
    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (player) {
        const spd = 6.5;
        if (keys['KeyW'] || keys['ArrowUp']) player.pos[2] -= spd * dt;
        if (keys['KeyS'] || keys['ArrowDown']) player.pos[2] += spd * dt;
        if (keys['KeyA'] || keys['ArrowLeft']) player.pos[0] -= spd * dt;
        if (keys['KeyD'] || keys['ArrowRight']) player.pos[0] += spd * dt;
        if (keys['Space'] && player.pos[1] <= 0.05) player.vy = 8.5;
        player.vy -= 18 * dt;
        player.pos[1] = Math.max(0, player.pos[1] + player.vy * dt);
        if (player.pos[1] === 0) player.vy = 0;
      }

      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Perspective 3D projection
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const camX = player ? player.pos[0] : 0;
      const camY = 5.5;
      const camZ = (player ? player.pos[2] : 0) + 12;
      const fov = 460;

      const sorted = [...objs].sort((a, b) => (b.pos[2] - camZ) - (a.pos[2] - camZ)).reverse();
      for (const o of sorted) {
        const rx = o.pos[0] - camX;
        const ry = o.pos[1] - camY + 2.2;
        const rz = camZ - o.pos[2];
        if (rz <= 0.5) continue;
        const sx = cx + (rx / rz) * fov;
        const sy = cy - (ry / rz) * fov;
        const w = Math.max(8, (o.scale[0] * fov) / rz);
        const h = Math.max(8, (o.scale[1] * fov) / rz);
        ctx.fillStyle = (o.material && o.material.albedo) || '#00f0ff';
        ctx.shadowColor = (o.material && o.material.emissive) || '#00f0ff';
        ctx.shadowBlur = o.isPlayer ? 18 : 8;
        ctx.fillRect(sx - w/2, sy - h/2, w, h);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(o.name, sx, sy - h/2 - 6);
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;

  const filename = `${slug || 'aether-game'}-html5-pwa.html`;
  triggerDownload(filename, html, 'text/html;charset=utf-8');
  return filename;
}

export function exportDesktopBundle(
  projectName: string,
  wrapper: 'tauri' | 'electron',
  entities: SceneEntity[]
): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const bundle = {
    generator: 'AetherEngine Studio Multi-Platform Exporter v1.0',
    wrapper: wrapper === 'tauri' ? 'Tauri v2 (Rust + WebGPU WebView)' : 'Electron 34 (Chromium WebGPU)',
    targets: ['windows-x64.msi', 'macos-universal.dmg', 'linux-x86_64.AppImage'],
    tauriConf: {
      productName: projectName,
      version: '1.0.0',
      identifier: `gg.aether.${slug.replace(/-/g, '')}`,
      app: {
        windows: [{ title: projectName, width: 1280, height: 720, resizable: true, fullscreen: false }],
      },
    },
    sceneEntitiesCount: entities.length,
    sceneData: entities,
  };
  const filename = `${slug}-${wrapper}-desktop-project.json`;
  triggerDownload(filename, JSON.stringify(bundle, null, 2), 'application/json');
  return filename;
}

export function exportMobileBundle(
  projectName: string,
  platform: 'android_apk' | 'ios_xcode',
  entities: SceneEntity[]
): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const bundle = {
    generator: 'AetherEngine Mobile Packaging Pipeline v1.0',
    platform: platform === 'android_apk' ? 'Android APK / Play Store AAB' : 'iOS Xcode Workspace (Metal/WebGPU)',
    capacitorConfig: {
      appId: `gg.aether.${slug.replace(/-/g, '')}`,
      appName: projectName,
      webDir: 'dist',
      server: { androidScheme: 'https' },
      plugins: { Haptics: { enabled: true }, GamepadTouchControls: { virtualJoystick: true } },
    },
    monetizationReady: ['Stripe Checkout', 'Midtrans QRIS / GoPay', 'Rewarded Web Ads'],
    sceneData: entities,
  };
  const filename = `${slug}-${platform}-bundle.json`;
  triggerDownload(filename, JSON.stringify(bundle, null, 2), 'application/json');
  return filename;
}
