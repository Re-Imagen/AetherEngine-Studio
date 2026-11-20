# AetherEngine Studio

**Editor game 2.5D bergaya kartun, langsung di peramban.** Susun adegan di pulau isometrik, hubungkan pemicu dengan aksi, lalu mainkan. Tidak perlu akun, mengetik kode, atau memasang aplikasi.

## Coba game pertamamu

1. Buka Studio. **Pulau Rimbun** sudah berisi Miko si rubah, pondok, dan contoh blok yang bisa dimainkan.
2. Klik gambar di **Pustaka aset** untuk menambah objek. Geser objek di **Panggung**, atau pilih namanya di **Objek adegan** untuk mengubah posisi, ukuran, dan arah hadap.
3. Pilih Miko. Di **Kode visual**, coba ubah tinggi pada **Saat tombol ditekan → Lompat → Bicara**. Klik **+** untuk menyambung aksi. Klik nama pemicu/aksi untuk menggantinya. Aksi dapat diurutkan dengan seret atau tombol panah pada blok.
4. Klik **Mainkan**. Gerakkan Miko dengan panah/WASD; tekan **Spasi** untuk menjalankan alurnya. Tombol di panggung juga bisa disentuh. **Berhenti** mengembalikan adegan yang sedang diedit, bukan menyimpan posisi hasil permainan.
5. **Bagikan** membuat tautan ke salinan game yang bisa langsung dimainkan. Tautan membawa data adegan dan blok, bukan undangan mengedit. Buat tautan baru setelah mengubah game.

**Proyek saya** membuka pulau yang tersimpan atau membuat proyek baru (pulau lengkap atau Miko saja). Objek, transformasi, serta blok disimpan otomatis di perangkat/peramban ini, terpisah dari proyek Studio klasik. Menghapus data situs akan menghapus simpanan lokal. Gunakan **Panduan** untuk petunjuk dan **Pintasan** untuk daftar tombol.

## Menjalankan secara lokal

Gunakan Node.js 22 terbaru.

```bash
npm ci
npm run dev
```

Buka `http://localhost:5173`. Uji interpreter dan build untuk produksi:

```bash
npm test
npm run build
npm run preview
```

## Cara kerja editor 2.5D

- Kamera ortografis memproyeksikan posisi di atas bidang **X/Z**. Sprite kartun diurutkan menurut kedalaman; ketinggian lompatan terpisah dari posisi kaki dan bayangannya. Pagar gerak mengikuti kontur pulau.
- Setiap objek memiliki alur berisi satu **pemicu** (mulai, tombol, klik objek) dan rangkaian **aksi** (melangkah, lompat, bicara, balik arah). Interpreter menjalankannya berurutan pada salinan keadaan permainan. Tidak ada eksekusi teks kode dari tautan atau blok.
- `src/studio/model.ts`, `runtime.ts`, `workspace.ts` — model adegan, proyeksi, simulasi, validasi simpanan dan riwayat urungkan/ulangi.
- `src/studio/` — panggung interaktif, pustaka, panel objek, editor blok, panduan dan pemutar tautan. Ilustrasi WebP dan font dibundel lokal, tanpa CDN.
- `tests/studio.test.mjs` — pengujian koordinat, batas pulau, urutan blok, pemicu, isolasi simulasi, riwayat proyek, dan validasi dokumen.

## Studio klasik dan proyek lama

Pilih **Proyek saya → Buka Studio klasik** (`?mode=classic`) untuk menggunakan editor Three.js sebelumnya, termasuk proyek OPFS/IndexedDB, kolaborasi dan alat ekspor. Tautan editor bersama, mode mobile, dan mode play versi sebelumnya tetap membuka runtime klasik. Data proyek lama tidak dikonversi atau ditimpa.

### Alur klasik

1. **Dashboard** — buka proyek OPFS, pilih template 3D RPG, Cyber FPS, 2D Platformer, atau Racing, dan remix proyek komunitas.
2. **Studio Editor** — susun scene melalui Hierarchy, Viewport, Inspector, Asset Drawer, Blueprint/Code, Timeline/Audio, dan Console/Profiler.
3. **Kolaborasi** — kursor 3D, presence, komentar yang dipin ke objek, serta sinkronisasi entity melalui WebSocket dan BroadcastChannel. **Share Workspace** membuat link khusus editor atau playtester yang membawa project, template, dan CRDT room.
4. **Test on Mobile** — pindai QR sungguhan. Klien mobile membuka room CRDT yang sama dengan joystick, jump, dan live scene sync.
5. **Visual Git** — buat snapshot/branch, bandingkan dua scene 3D berdampingan, checkout, dan merge.
6. **Publish & Export** — deploy preview instant-play, unduh HTML5 playable, atau konfigurasi bundle Tauri/Electron/Android/iOS. Monetization sandbox mencakup Web Ads, Stripe, dan Midtrans.

### Pintasan klasik

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

Production build menyertakan web app manifest, install icon, dan service worker. App shell serta hashed JS/CSS/assets di-cache sehingga Studio dapat dibuka kembali saat offline. Development mode tidak mendaftarkan service worker agar HMR tetap stabil; gunakan `npm run build && npm run preview` untuk menguji PWA. Editor 2.5D beserta ilustrasi dan font tersedia offline setelah kunjungan online pertama selesai mengaktifkan service worker. Runtime klasik dimuat dan di-cache saat dibuka.

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` membangun aplikasi dengan Node.js 22 dan `npm ci`, lalu men-deploy hasil `dist` setiap push ke `main`. Pada **Settings → Pages**, pilih **GitHub Actions** sebagai source. Asset, manifest, invite URL, dan service worker bersifat subpath-safe sehingga deployment seperti `https://<owner>.github.io/<repository>/` maupun custom domain dapat menggunakan build yang sama.

GitHub Pages hanya menyajikan file statis dan tidak menjalankan WebSocket relay Vite. BroadcastChannel tetap tersedia untuk sinkronisasi antar-tab; relay lintas perangkat dapat dikonfigurasi saat build melalui `VITE_AETHER_WS_URL` menuju endpoint `wss://` eksternal.

## Arsitektur Studio klasik

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
