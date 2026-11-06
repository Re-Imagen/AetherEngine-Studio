# AetherEngine Studio

**Build, Collaborate, and Publish Games Directly from Your Browser.**

Workspace game-engine berbasis React, TypeScript, Three.js, WebAssembly, Web Audio, OPFS/IndexedDB, dan WebSocket dengan antarmuka dark slate + neon cyan/purple.

## Menjalankan

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Production build:

```bash
npm run build
npm run preview
```

## Alur utama

1. **Dashboard** — buka proyek OPFS, pilih template 3D RPG, Cyber FPS, 2D Platformer, atau Racing, dan remix proyek komunitas.
2. **Studio Editor** — susun scene melalui Hierarchy, Viewport, Inspector, Asset Drawer, Blueprint/Code, Timeline/Audio, dan Console/Profiler.
3. **Kolaborasi** — kursor 3D, presence, komentar yang dipin ke objek, serta sinkronisasi entity melalui WebSocket dan BroadcastChannel. **Share Workspace** membuat link khusus editor atau playtester yang membawa project, template, dan CRDT room.
4. **Test on Mobile** — pindai QR sungguhan. Klien mobile membuka room CRDT yang sama dengan joystick, jump, dan live scene sync.
5. **Visual Git** — buat snapshot/branch, bandingkan dua scene 3D berdampingan, checkout, dan merge.
6. **Publish & Export** — deploy preview instant-play, unduh HTML5 playable, atau konfigurasi bundle Tauri/Electron/Android/iOS. Monetization sandbox mencakup Web Ads, Stripe, dan Midtrans.

## Controls

- `Q / W / E / R` — Select / Move / Rotate / Scale
- `C` — Pin 3D Comment
- `WASD` atau arrow keys — gerak saat Play
- `Space` — lompat saat Play
- `Ctrl/Cmd + K` — Command Palette dengan 21 aksi workspace, create, simulation, dan tools
- `Ctrl/Cmd + S` — simpan ke OPFS + IndexedDB
- `Ctrl/Cmd + Z` / `Ctrl/Cmd + Y` — undo / redo
- `Ctrl/Cmd + D` — duplicate entity
- `Delete` — hapus entity
- `Ctrl/Cmd + Enter` — Play / Stop
- Tarik splitter antar-panel untuk mengubah ukuran workspace.

Console mendukung `/help`, `/status`, `/bench`, `/spawn cube`, `/spawn sphere`, `/spawn crystal`, `/play`, `/pause`, `/stop`, `/snapshot <message>`, dan `/clear`.

## PWA & Offline

Production build menyertakan web app manifest, install icon, dan service worker. App shell serta hashed JS/CSS/assets di-cache sehingga Studio dapat dibuka kembali saat offline. Development mode tidak mendaftarkan service worker agar HMR tetap stabil; gunakan `npm run build && npm run preview` untuk menguji PWA. Kolaborasi online otomatis kembali menggunakan room yang sama ketika koneksi tersedia.

## Arsitektur

- `src/components/` — Dashboard, docking workspace, Three.js viewport, mobile runtime, visual Git, serta publish/export.
- `src/engine/wasmCore.ts` — native WebAssembly v1 binary untuk gravity integration, spring solver, dan FPU benchmark.
- `src/engine/meshBuilder.ts` — reusable PBR meshes, articulated rigs, vehicles, cloth, lights, dan GPU particles.
- `src/engine/pbrTextureGenerator.ts` — generator lokal seamless Albedo, Sobel Normal, Roughness, dan Metallic.
- `src/engine/aiCopilot.ts` — AI-assisted script/persona generation dan dialog NPC berbasis konteks scene.
- `src/engine/collabClient.ts` — Lamport-clock LWW synchronization melalui `/aether-ws` dan multi-tab `BroadcastChannel`.
- `src/engine/opfsStorage.ts` — persistent project dan asset cache dengan OPFS + IndexedDB/localStorage fallback.
- `src/engine/spatialAudio.ts` — HRTF PannerNode, Doppler, Convolver reverb, dan analyser spectrum.
- `vite.config.ts` — Vite dev/preview server sekaligus WebSocket collaboration hub.

Renderer menggunakan WebGL2 PBR dengan deteksi kesiapan WebGPU dan post-processing Bloom, AO/vignette, DOF, motion blur, serta color grading. AI generators berjalan lokal tanpa API key. Native mobile/Desktop exports menghasilkan starter bundle/configuration; signing APK, Xcode build, pembayaran produksi, dan domain `aether.gg` memerlukan layanan eksternal masing-masing.
