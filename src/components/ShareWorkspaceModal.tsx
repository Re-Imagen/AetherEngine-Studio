import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  GitBranch,
  Globe,
  Link2,
  MessageSquare,
  Play,
  Radio,
  Share2,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { CollaboratorPresence, PinComment3D, SceneEntity } from '../types/engine';

interface ShareWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  templateId: string;
  roomName: string;
  currentBranch: string;
  collaborators: CollaboratorPresence[];
  comments: PinComment3D[];
  entities: SceneEntity[];
  onSelectEntity: (entityId: string) => void;
  onOpenMobileTest: () => void;
}

type InviteMode = 'editor' | 'play';

export const ShareWorkspaceModal: React.FC<ShareWorkspaceModalProps> = ({
  isOpen,
  onClose,
  projectName,
  templateId,
  roomName,
  currentBranch,
  collaborators,
  comments,
  entities,
  onSelectEntity,
  onOpenMobileTest,
}) => {
  const [inviteMode, setInviteMode] = useState<InviteMode>('editor');
  const [copied, setCopied] = useState<InviteMode | null>(null);

  const createInviteUrl = (mode: InviteMode) => {
    const params = new URLSearchParams({
      mode,
      room: roomName,
      project: projectName,
      template: templateId,
    });
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  const inviteUrl = useMemo(() => createInviteUrl(inviteMode), [inviteMode, roomName, projectName, templateId]);
  const activeComments = comments.filter((comment) => !comment.resolved);

  if (!isOpen) return null;

  const copyLink = async (mode: InviteMode) => {
    try {
      await navigator.clipboard.writeText(createInviteUrl(mode));
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = createInviteUrl(mode);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-4xl max-h-[92vh] bg-[#0d1422] border border-cyan-500/35 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-[#090d16] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Share collaborative workspace</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Undang tim ke scene yang sama — seperti Google Docs untuk game development.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" title="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-[1fr_290px] gap-5">
          <div className="space-y-5">
            {/* Invitation link builder */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-100">Invite via live link</h3>
                  <p className="text-[10px] text-slate-500 mt-1">Pilih pengalaman untuk orang yang Anda undang.</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[9px] text-emerald-300 flex items-center gap-1">
                  <Radio className="w-3 h-3" /> Room online
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setInviteMode('editor')}
                  className={`p-3 rounded-xl border text-left transition ${inviteMode === 'editor' ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-[#090e19] border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <Edit3 className={`w-4 h-4 ${inviteMode === 'editor' ? 'text-cyan-300' : 'text-slate-500'}`} />
                    {inviteMode === 'editor' && <Check className="w-3.5 h-3.5 text-cyan-300" />}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200 mt-2">Can edit together</div>
                  <div className="text-[9px] text-slate-500 mt-1">Full Studio + live CRDT scene sync</div>
                </button>
                <button
                  onClick={() => setInviteMode('play')}
                  className={`p-3 rounded-xl border text-left transition ${inviteMode === 'play' ? 'bg-purple-500/10 border-purple-500/40' : 'bg-[#090e19] border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <Eye className={`w-4 h-4 ${inviteMode === 'play' ? 'text-purple-300' : 'text-slate-500'}`} />
                    {inviteMode === 'play' && <Check className="w-3.5 h-3.5 text-purple-300" />}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-200 mt-2">Playtest only</div>
                  <div className="text-[9px] text-slate-500 mt-1">Instant game runtime + touch controls</div>
                </button>
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#070b14] p-2 flex items-center gap-2 focus-within:border-cyan-500/50">
                <Link2 className="w-4 h-4 text-slate-500 ml-1 shrink-0" />
                <input
                  readOnly
                  value={inviteUrl}
                  onFocus={(event) => event.target.select()}
                  className="flex-1 min-w-0 bg-transparent text-[10px] text-slate-300 font-mono-code focus:outline-none"
                  aria-label="Collaboration invite URL"
                />
                <button
                  onClick={() => copyLink(inviteMode)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shrink-0 transition ${copied === inviteMode ? 'bg-emerald-500 text-slate-950' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'}`}
                >
                  {copied === inviteMode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === inviteMode ? 'Copied!' : 'Copy invite'}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open second {inviteMode === 'editor' ? 'editor' : 'player'} tab
                </a>
                <button
                  onClick={() => copyLink('play')}
                  className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 flex items-center gap-1.5"
                >
                  {copied === 'play' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5 text-purple-300" />}
                  Copy player link
                </button>
              </div>
            </section>

            {/* Workspace metadata */}
            <section className="rounded-2xl border border-slate-800 bg-[#090e19] p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1.5">Project</div>
                  <div className="text-[11px] font-semibold text-slate-200 truncate">{projectName}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1.5">Branch</div>
                  <div className="text-[11px] font-mono-code text-purple-300 flex items-center gap-1"><GitBranch className="w-3 h-3" />{currentBranch}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-[9px] uppercase tracking-wider text-slate-600 mb-1.5">CRDT room</div>
                  <div className="text-[10px] font-mono-code text-cyan-300 truncate">{roomName}</div>
                </div>
              </div>
              <div className="border-t border-slate-800 mt-4 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-slate-500">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-400" /> Lamport conflict resolution</span>
                <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-cyan-400" /> WebSocket + local peer relay</span>
                <span className="flex items-center gap-1.5"><Smartphone className="w-3 h-3 text-purple-400" /> Desktop & mobile</span>
              </div>
            </section>

            {/* Pinned team discussion */}
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-purple-300" /> Scene discussions</h3>
                <span className="text-[9px] text-slate-500">{activeComments.length} open threads</span>
              </div>
              <div className="space-y-2">
                {activeComments.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-[10px] text-slate-500">
                    Belum ada komentar. Tekan <strong className="text-cyan-300">C</strong> lalu klik objek untuk memulai diskusi 3D.
                  </div>
                ) : activeComments.slice(0, 3).map((comment) => (
                  <button
                    key={comment.id}
                    onClick={() => onSelectEntity(comment.entityId)}
                    className="w-full p-3 rounded-xl bg-[#090e19] border border-slate-800 hover:border-purple-500/30 text-left flex items-center gap-3 group"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-950 shrink-0" style={{ backgroundColor: comment.authorColor }}>
                      {comment.author.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400 truncate"><span className="text-slate-200 font-semibold">{comment.author}</span> on {entities.find((entity) => entity.id === comment.entityId)?.name || 'Scene node'}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-1">{comment.text}</div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-700 group-hover:text-purple-300 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Live team rail */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-[#090e19] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5"><Users className="w-4 h-4 text-cyan-300" /> In this world</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[9px] font-bold ring-2 ring-cyan-400/15">YOU</div>
                  <div className="min-w-0"><div className="text-[11px] font-semibold text-slate-200">You (Lead Dev)</div><div className="text-[9px] text-emerald-400">Editing now</div></div>
                </div>
                {collaborators.map((peer) => (
                  <div key={peer.peerId} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full text-slate-950 flex items-center justify-center text-[9px] font-bold ring-2 ring-white/5" style={{ backgroundColor: peer.color }}>
                      {peer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-slate-200 truncate">{peer.name}</div><div className="text-[9px] text-slate-500 truncate">{peer.role}</div></div>
                    {peer.isMobileTester && <Smartphone className="w-3.5 h-3.5 text-amber-300" />}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-800 text-[9px] text-slate-500 leading-relaxed">
                Kursor dan pilihan objek tim terlihat langsung di viewport. Perubahan entity direplikasi dengan conflict-free sync.
              </div>
            </div>

            <button
              onClick={onOpenMobileTest}
              className="w-full p-4 rounded-2xl bg-gradient-to-br from-purple-500/15 to-cyan-500/10 border border-purple-500/25 hover:border-purple-400/50 text-left group"
            >
              <Smartphone className="w-5 h-5 text-purple-300 mb-3" />
              <div className="text-[11px] font-bold text-slate-100 flex items-center justify-between">Test on your phone <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300" /></div>
              <p className="text-[9px] text-slate-500 leading-relaxed mt-1.5">Pindai QR untuk live playtest tanpa build atau instalasi.</p>
            </button>

            <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-[9px] text-slate-500 leading-relaxed">
              <Share2 className="w-3.5 h-3.5 text-cyan-400 mb-2" />
              Siapa pun dengan <strong className="text-slate-300">editor link</strong> dapat mengubah scene bersama. Bagikan hanya kepada anggota tim yang dipercaya.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
