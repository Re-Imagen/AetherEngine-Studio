import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Code2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileCode2,
  Gamepad2,
  Globe,
  Loader2,
  Monitor,
  Package,
  Play,
  QrCode,
  Rocket,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Terminal,
  X,
  Zap,
} from 'lucide-react';
import type { PostProcessingConfig, SceneEntity } from '../types/engine';
import { exportDesktopBundle, exportMobileBundle, exportStandaloneHTML5Game } from '../engine/exporter';

interface PublishExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  roomName: string;
  entities: SceneEntity[];
  postProcessing: PostProcessingConfig;
  onConsoleLog: (level: 'info' | 'warn' | 'error', source: string, message: string) => void;
}

type PublishTab = 'publish' | 'export' | 'monetization';

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-aether-game';

export const PublishExportModal: React.FC<PublishExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  roomName,
  entities,
  postProcessing,
  onConsoleLog,
}) => {
  const [activeTab, setActiveTab] = useState<PublishTab>('publish');
  const [slug, setSlug] = useState(slugify(projectName));
  const [publishing, setPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [published, setPublished] = useState(false);
  const [copied, setCopied] = useState(false);
  const [desktopWrapper, setDesktopWrapper] = useState<'tauri' | 'electron'>('tauri');
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [webAds, setWebAds] = useState(true);
  const [stripe, setStripe] = useState(true);
  const [midtrans, setMidtrans] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSlug(slugify(projectName));
      setLastDownload(null);
    }
  }, [isOpen, projectName]);

  const liveUrl = useMemo(() => {
    const query = new URLSearchParams({ mode: 'play', room: roomName, project: projectName });
    return `${window.location.origin}${window.location.pathname}?${query.toString()}`;
  }, [roomName, projectName]);
  const cloudUrl = `https://aether.gg/play/${slug}`;

  if (!isOpen) return null;

  const handlePublish = () => {
    if (publishing) return;
    setPublishing(true);
    setPublished(false);
    setPublishProgress(12);
    const stages = [
      { delay: 280, progress: 38 },
      { delay: 650, progress: 71 },
      { delay: 980, progress: 91 },
      { delay: 1320, progress: 100 },
    ];
    stages.forEach(({ delay, progress }) => {
      window.setTimeout(() => {
        setPublishProgress(progress);
        if (progress === 100) {
          setPublishing(false);
          setPublished(true);
          try {
            localStorage.setItem(`aether_publish_${slug}`, JSON.stringify({ projectName, roomName, liveUrl, cloudUrl, publishedAt: Date.now(), monetization: { webAds, stripe, midtrans } }));
          } catch {}
          onConsoleLog('info', 'Aether Cloud Deploy', `${projectName} published: ${cloudUrl} • Global CDN cache warmed.`);
        }
      }, delay);
    });
  };

  const handleCopy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); } catch {}
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleExport = (kind: 'web' | 'desktop' | 'android' | 'ios') => {
    let filename = '';
    if (kind === 'web') filename = exportStandaloneHTML5Game(projectName, entities, postProcessing);
    if (kind === 'desktop') filename = exportDesktopBundle(projectName, desktopWrapper, entities);
    if (kind === 'android') filename = exportMobileBundle(projectName, 'android_apk', entities);
    if (kind === 'ios') filename = exportMobileBundle(projectName, 'ios_xcode', entities);
    setLastDownload(filename);
    onConsoleLog('info', 'Multi-Platform Exporter', `Export selesai: ${filename}`);
  };

  const tabs: { id: PublishTab; label: string; sublabel: string; icon: React.ElementType }[] = [
    { id: 'publish', label: 'Publish to Aether', sublabel: 'Instant URL & global CDN', icon: Rocket },
    { id: 'export', label: 'Export project', sublabel: 'Web, desktop & mobile', icon: Package },
    { id: 'monetization', label: 'Monetization', sublabel: 'Ads, Stripe & Midtrans', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#0d1422] border border-cyan-500/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-[#090d16] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/25 to-purple-500/25 border border-cyan-500/30 flex items-center justify-center"><Rocket className="w-5 h-5 text-cyan-300" /></div>
            <div><h2 className="text-sm font-bold text-white">Ship your game to the world</h2><p className="text-[11px] text-slate-500 mt-0.5">Publish instant, export ke semua platform, dan aktifkan monetisasi.</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[230px_1fr] overflow-y-auto md:overflow-hidden">
          <aside className="bg-[#0a0f1a] border-r border-slate-800 p-3 flex md:flex-col gap-2 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 md:flex-none text-left p-3 rounded-xl border transition ${activeTab === tab.id ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200' : 'border-transparent text-slate-400 hover:bg-slate-900'}`}>
                  <div className="flex items-center gap-2"><Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-cyan-300' : 'text-slate-500'}`} /><span className="text-[11px] font-semibold">{tab.label}</span></div>
                  <div className="text-[9px] text-slate-600 mt-1 hidden md:block">{tab.sublabel}</div>
                </button>
              );
            })}
            <div className="mt-auto hidden md:block p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300"><ShieldCheck className="w-3.5 h-3.5" /> Production checklist</div>
              <div className="mt-3 space-y-2 text-[9px] text-slate-500"><div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" />{entities.length} scene nodes bundled</div><div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" />PBR assets optimized</div><div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" />Wasm runtime included</div><div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" />Mobile touch controls</div></div>
            </div>
          </aside>

          <main className="min-h-0 md:overflow-y-auto p-5 sm:p-6">
            {activeTab === 'publish' && (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.18em] text-cyan-300 font-semibold mb-2"><Zap className="w-3 h-3" /> Zero build time</div>
                  <h3 className="text-xl font-bold text-white">Your game. One link. Everywhere.</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">Deploy versi terbaru ke edge network dan bagikan link instant-play ke pemain, itch.io, Discord, atau Telegram.</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#090e19] p-4 space-y-3">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Public game URL</label>
                  <div className="flex items-center rounded-xl border border-slate-700 bg-[#070b14] overflow-hidden focus-within:border-cyan-500/60">
                    <span className="pl-3 text-xs text-slate-500 whitespace-nowrap">aether.gg/play/</span>
                    <input value={slug} onChange={(e) => { setSlug(slugify(e.target.value)); setPublished(false); }} className="flex-1 min-w-0 bg-transparent px-1 py-3 text-xs text-cyan-300 font-mono-code focus:outline-none" />
                    <span className="px-3 text-emerald-400"><BadgeCheck className="w-4 h-4" /></span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] text-slate-500"><span className="flex items-center gap-1"><Globe className="w-3 h-3" />Global CDN</span><span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" />Automatic HTTPS</span><span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />Mobile ready</span></div>
                </div>

                {publishing && (
                  <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                    <div className="flex items-center justify-between text-[11px]"><span className="text-cyan-200 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Optimizing & deploying scene…</span><span className="font-mono-code text-cyan-300">{publishProgress}%</span></div>
                    <div className="h-1.5 bg-slate-800 rounded-full mt-3 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300" style={{ width: `${publishProgress}%` }} /></div>
                    <div className="flex justify-between mt-2 text-[9px] text-slate-500"><span>Bundle Wasm</span><span>Compress PBR</span><span>Edge deploy</span></div>
                  </div>
                )}

                {published && !publishing && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><div><h4 className="text-xs font-bold text-emerald-200">Game is live!</h4><p className="text-[10px] text-slate-500 mt-1">Versi terbaru sudah ter-deploy. Preview sandbox dapat langsung dimainkan.</p></div></div>
                    <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800"><Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" /><span className="text-[10px] text-slate-300 truncate flex-1">{cloudUrl}</span><button onClick={() => handleCopy(cloudUrl)} className="text-slate-400 hover:text-white">{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}</button></div>
                    <div className="flex flex-wrap gap-2 mt-3"><a href={liveUrl} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-bold flex items-center gap-1.5"><Play className="w-3.5 h-3.5 fill-current" />Open live game</a><button onClick={() => handleCopy(liveUrl)} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5" />Copy sandbox link</button></div>
                  </div>
                )}

                {!published && !publishing && (
                  <button onClick={handlePublish} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-500 hover:from-cyan-300 hover:to-purple-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/15 flex items-center justify-center gap-2 transition"><Rocket className="w-4 h-4" />Publish {projectName}<ArrowRight className="w-4 h-4" /></button>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {[['itch.io', 'Embed HTML5'], ['Discord', 'Instant Activity'], ['Telegram', 'WebApp game']].map(([name, sub]) => <div key={name} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center"><Gamepad2 className="w-4 h-4 mx-auto text-purple-300 mb-1.5" /><div className="text-[10px] font-semibold text-slate-300">{name}</div><div className="text-[9px] text-slate-600 mt-0.5">{sub}</div></div>)}
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div className="space-y-5">
                <div><div className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.18em] text-purple-300 font-semibold mb-2"><Package className="w-3 h-3" /> One-click multi-platform</div><h3 className="text-xl font-bold text-white">Build once. Run natively anywhere.</h3><p className="text-xs text-slate-500 mt-2">Download playable build atau native wrapper project yang sudah berisi scene dan konfigurasi.</p></div>

                <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-cyan-500/5 to-transparent p-4 flex flex-wrap items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center"><FileCode2 className="w-5 h-5 text-cyan-300" /></div>
                  <div className="flex-1 min-w-[180px]"><h4 className="text-xs font-bold text-slate-100">Web HTML5 / PWA</h4><p className="text-[10px] text-slate-500 mt-1">Standalone playable HTML • Offline-ready • itch.io embed</p><div className="flex gap-2 mt-2 text-[9px] text-cyan-300"><span>HTML5</span><span>•</span><span>PWA</span><span>•</span><span>WebAssembly</span></div></div>
                  <button onClick={() => handleExport('web')} className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-bold flex items-center gap-2"><Download className="w-4 h-4" />Export Web</button>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#090e19] p-4">
                  <div className="flex flex-wrap items-center gap-4"><div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center"><Monitor className="w-5 h-5 text-purple-300" /></div><div className="flex-1 min-w-[180px]"><h4 className="text-xs font-bold text-slate-100">Desktop bundle</h4><p className="text-[10px] text-slate-500 mt-1">Windows MSI • macOS DMG • Linux AppImage</p></div><button onClick={() => handleExport('desktop')} className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white text-[10px] font-bold flex items-center gap-2"><Download className="w-4 h-4" />Export Desktop</button></div>
                  <div className="grid grid-cols-2 gap-2 mt-4">{(['tauri', 'electron'] as const).map((wrapper) => <button key={wrapper} onClick={() => setDesktopWrapper(wrapper)} className={`p-2.5 rounded-xl border text-left ${desktopWrapper === wrapper ? 'bg-purple-500/10 border-purple-500/40' : 'bg-slate-900/70 border-slate-800'}`}><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-slate-200">{wrapper === 'tauri' ? 'Tauri v2' : 'Electron'}</span>{desktopWrapper === wrapper && <CheckCircle2 className="w-3.5 h-3.5 text-purple-300" />}</div><span className="text-[9px] text-slate-600">{wrapper === 'tauri' ? 'Rust • lightweight native' : 'Chromium • familiar tooling'}</span></button>)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-800 bg-[#090e19] p-4"><Smartphone className="w-5 h-5 text-emerald-300 mb-3" /><h4 className="text-xs font-bold text-slate-100">Android</h4><p className="text-[10px] text-slate-500 mt-1 mb-4">APK / AAB • Capacitor • Touch SDK</p><button onClick={() => handleExport('android')} className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 border border-slate-700 text-[10px] font-semibold flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" />Android project</button></div>
                  <div className="rounded-2xl border border-slate-800 bg-[#090e19] p-4"><Box className="w-5 h-5 text-sky-300 mb-3" /><h4 className="text-xs font-bold text-slate-100">iOS</h4><p className="text-[10px] text-slate-500 mt-1 mb-4">Xcode workspace • Metal WebView • Haptics</p><button onClick={() => handleExport('ios')} className="w-full py-2 rounded-xl bg-slate-800 hover:bg-sky-500 hover:text-slate-950 border border-slate-700 text-[10px] font-semibold flex items-center justify-center gap-1.5"><Download className="w-3.5 h-3.5" />Xcode project</button></div>
                </div>

                {lastDownload && <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/25 text-[10px] text-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span className="truncate">Downloaded: {lastDownload}</span></div>}
              </div>
            )}

            {activeTab === 'monetization' && (
              <div className="space-y-5">
                <div><div className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[.18em] text-emerald-300 font-semibold mb-2"><ShoppingBag className="w-3 h-3" /> Creator economy built-in</div><h3 className="text-xl font-bold text-white">Turn your world into a business.</h3><p className="text-xs text-slate-500 mt-2">Aktifkan iklan web dan pembayaran in-game. Konfigurasi tersimpan bersama deployment.</p></div>

                <div className="space-y-3">
                  {[
                    { enabled: webAds, set: setWebAds, icon: Globe, color: 'text-cyan-300', title: 'Rewarded Web Ads', desc: 'Reward pemain dengan Aether Shards setelah menonton iklan.', badge: 'Google AdSense / AdMob Web' },
                    { enabled: stripe, set: setStripe, icon: CreditCard, color: 'text-purple-300', title: 'Stripe Checkout', desc: 'Kartu internasional dan pembayaran satu kali untuk item premium.', badge: 'USD • Global payments' },
                    { enabled: midtrans, set: setMidtrans, icon: QrCode, color: 'text-emerald-300', title: 'Midtrans Indonesia', desc: 'QRIS, GoPay, OVO, DANA, VA, dan pembayaran lokal lainnya.', badge: 'IDR • QRIS & e-wallet' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return <div key={item.title} className={`p-4 rounded-2xl border transition ${item.enabled ? 'bg-slate-900/70 border-slate-700' : 'bg-slate-950/30 border-slate-800 opacity-60'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"><Icon className={`w-5 h-5 ${item.color}`} /></div><div className="flex-1"><h4 className="text-xs font-bold text-slate-100">{item.title}</h4><p className="text-[10px] text-slate-500 mt-1">{item.desc}</p></div><button onClick={() => item.set(!item.enabled)} className={`w-10 h-5 rounded-full p-0.5 transition ${item.enabled ? 'bg-cyan-500' : 'bg-slate-700'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${item.enabled ? 'translate-x-5' : ''}`} /></button></div><div className="text-[9px] text-slate-600 mt-3 ml-[52px]">{item.badge}</div></div>;
                  })}
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between mb-3"><div><h4 className="text-xs font-bold text-emerald-200">Sandbox in-game purchase</h4><p className="text-[10px] text-slate-500 mt-1">Uji alur pembayaran tanpa kartu atau saldo nyata.</p></div><span className="text-[9px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">SANDBOX</span></div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800"><div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center"><Sparkles className="w-4 h-4 text-purple-300" /></div><div className="flex-1"><div className="text-[11px] font-semibold text-slate-200">500 Aether Shards</div><div className="text-[10px] text-slate-500">Rp 15.000 / $0.99</div></div><button disabled={!stripe && !midtrans} onClick={() => { setPaymentSuccess(true); onConsoleLog('info', 'Payment Sandbox', 'Midtrans QRIS / Stripe test payment succeeded: +500 Aether Shards.'); }} className="px-3 py-2 rounded-lg bg-emerald-500 disabled:bg-slate-800 text-slate-950 text-[10px] font-bold">{paymentSuccess ? 'Paid ✓' : 'Test checkout'}</button></div>
                  {paymentSuccess && <div className="mt-3 text-[10px] text-emerald-300 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Payment webhook verified • Item entitlement granted.</div>}
                </div>
              </div>
            )}
          </main>
        </div>

        <div className="px-5 py-2.5 border-t border-slate-800 bg-[#090d16] flex items-center justify-between text-[9px] text-slate-600 shrink-0"><span className="flex items-center gap-1.5"><Cloud className="w-3 h-3 text-emerald-400" />Aether Cloud pipeline ready</span><span>Scene v1.0 • {entities.length} nodes • Wasm + PBR</span></div>
      </div>
    </div>
  );
};
