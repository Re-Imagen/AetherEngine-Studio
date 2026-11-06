import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { QrCode, Smartphone, ExternalLink, Copy, Check, Wifi, Sparkles, X } from 'lucide-react';
import type { SceneEntity } from '../types/engine';

interface MobileLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  projectName: string;
  entities: SceneEntity[];
  onQuickTweakColor: (entityId: string, hex: string) => void;
}

export const MobileLiveModal: React.FC<MobileLiveModalProps> = ({
  isOpen,
  onClose,
  roomName,
  projectName,
  entities,
  onQuickTweakColor,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const mobileUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?mode=mobile&room=${encodeURIComponent(roomName)}&project=${encodeURIComponent(projectName)}`
      : '';

  useEffect(() => {
    if (!isOpen || !mobileUrl) return;
    QRCode.toDataURL(mobileUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#00f0ff',
        light: '#090d16',
      },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [isOpen, mobileUrl]);

  if (!isOpen) return null;

  const sampleEntity =
    entities.find((e) => e.id === 'aether-crystal') ||
    entities.find((e) => e.type === 'mesh' || e.type === 'character') ||
    entities[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#0e1525] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-[#090d16] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Instant Live-Testing on Mobile (Zero Build Time)
              </h3>
              <p className="text-xs text-slate-400">
                Scan QR Code dengan HP atau buka tab baru — perubahan warna & posisi di PC langsung berubah real-time!
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: QR Code + Live Synced Phone Companion Preview */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left: Scannable QR + URL + Instant Color Sync Demo */}
          <div className="space-y-4">
            <div className="flex flex-col items-center p-4 rounded-2xl bg-[#090d16] border border-slate-800">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Scan Mobile Live Test QR"
                  className="w-44 h-44 rounded-xl border border-cyan-500/30 p-2 bg-[#090d16]"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-500">
                  Generating QR...
                </div>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
                <Wifi className="w-3.5 h-3.5 animate-pulse" /> CRDT WebSocket Room: {roomName}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(mobileUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1800);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Link Tersalin!' : 'Salin Live URL'}
              </button>
              <a
                href={mobileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tab HP Live
              </a>
            </div>

            {/* Live PC-to-Phone Color Mutation Tester */}
            {sampleEntity && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="text-[11px] text-slate-300 flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Uji Perubahan Warna Real-Time ({sampleEntity.name}):
                </div>
                <div className="flex items-center gap-2">
                  {['#00f0ff', '#a855f7', '#10b981', '#f43f5e', '#f59e0b'].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => onQuickTweakColor(sampleEntity.id, hex)}
                      style={{ backgroundColor: hex }}
                      className="w-7 h-7 rounded-full ring-2 ring-slate-950 hover:scale-110 transition"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Synced Phone Screen Mirror */}
          <div className="flex flex-col items-center">
            <div className="w-64 h-96 rounded-[32px] border-4 border-slate-700 bg-[#070b14] p-3 flex flex-col justify-between shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-2">
                <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                  <Smartphone className="w-3 h-3" /> HP Live Mirror
                </span>
                <span className="text-emerald-400">60 FPS • Synced</span>
              </div>

              {/* Mini Isometric Live Scene Mirror */}
              <div className="my-2 flex-1 rounded-2xl bg-gradient-to-b from-[#0d162c] to-[#070b14] border border-slate-800/80 relative overflow-hidden flex items-center justify-center">
                {entities
                  .filter((e) => e.visible && e.type !== 'light' && e.type !== 'camera')
                  .slice(0, 10)
                  .map((ent) => {
                    const leftPct = Math.min(88, Math.max(12, 50 + ent.position[0] * 5.5));
                    const topPct = Math.min(86, Math.max(14, 52 + ent.position[2] * 4.5 - ent.position[1] * 4));
                    return (
                      <div
                        key={ent.id}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          backgroundColor: ent.material.albedo,
                          boxShadow: `0 0 14px ${ent.material.emissive || ent.material.albedo}`,
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-white/40 transition-all duration-150"
                        title={ent.name}
                      />
                    );
                  })}
                <div className="absolute bottom-2 inset-x-2 text-center text-[10px] text-slate-400 bg-slate-950/75 rounded py-0.5">
                  {projectName} ({entities.length} Nodes Live)
                </div>
              </div>

              <div className="text-[10px] text-center text-slate-500">
                Ubah warna di sebelah kiri — layar HP langsung tersinkronisasi!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
