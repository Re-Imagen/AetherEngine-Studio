import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Command, CornerDownLeft, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CommandAction {
  id: string;
  title: string;
  description: string;
  category: 'Workspace' | 'Create' | 'Simulation' | 'Tools';
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandAction[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) return commands;
    return commands.filter((command) =>
      `${command.title} ${command.description} ${command.category} ${command.keywords || ''}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [commands, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyK') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => filtered.length ? (index + 1) % filtered.length : 0);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => filtered.length ? (index - 1 + filtered.length) % filtered.length : 0);
      } else if (event.key === 'Enter' && filtered[activeIndex]) {
        event.preventDefault();
        filtered[activeIndex].action();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, filtered, activeIndex, onClose]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-command-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  let previousCategory: CommandAction['category'] | null = null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-3" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/35 bg-[#0d1422]/95 shadow-[0_24px_100px_rgba(0,0,0,.65)] overflow-hidden">
        <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800 bg-[#090e19]">
          <Search className="w-5 h-5 text-cyan-300 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            placeholder="Ketik perintah atau cari tools…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none"
            aria-label="Search commands"
          />
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-800"><X className="w-4 h-4" /></button>
          <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[9px] text-slate-500 font-mono-code">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Command className="w-7 h-7 text-slate-700 mx-auto mb-3" />
              <div className="text-xs font-medium text-slate-400">Tidak ada perintah untuk “{query}”</div>
              <div className="text-[10px] text-slate-600 mt-1">Coba “play”, “texture”, “mobile”, atau “snapshot”.</div>
            </div>
          ) : filtered.map((command, index) => {
            const Icon = command.icon;
            const showCategory = command.category !== previousCategory;
            previousCategory = command.category;
            return (
              <React.Fragment key={command.id}>
                {showCategory && <div className="px-3 pt-3 pb-1.5 text-[9px] uppercase tracking-[.16em] font-semibold text-slate-600">{command.category}</div>}
                <button
                  data-command-index={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => { command.action(); onClose(); }}
                  className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center gap-3 transition ${index === activeIndex ? 'bg-gradient-to-r from-cyan-500/15 to-purple-500/10 ring-1 ring-cyan-500/25' : 'hover:bg-slate-900'}`}
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${index === activeIndex ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold ${index === activeIndex ? 'text-cyan-100' : 'text-slate-200'}`}>{command.title}</div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{command.description}</div>
                  </div>
                  {command.shortcut ? (
                    <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[9px] text-slate-500 font-mono-code shrink-0">{command.shortcut}</kbd>
                  ) : (
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${index === activeIndex ? 'text-cyan-400' : 'text-slate-700'}`} />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-slate-800 bg-[#090e19] flex items-center justify-between text-[9px] text-slate-600">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="text-slate-400">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3 text-slate-400" /> Run command</span>
          </div>
          <span className="flex items-center gap-1.5"><Command className="w-3 h-3 text-purple-400" /> Aether Command Center</span>
        </div>
      </div>
    </div>
  );
};
