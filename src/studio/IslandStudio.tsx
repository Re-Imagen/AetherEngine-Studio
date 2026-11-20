import { useCallback, useEffect, useReducer, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  BadgeCheck,
  CloudOff,
  FolderClosed,
  Keyboard,
  LayoutPanelTop,
  Pencil,
  Play,
  Redo2,
  RotateCcw,
  Share2,
  Sprout,
  Square,
  Undo2,
} from 'lucide-react';
import { Sprite, StudioMark } from './art/Sprites';
import { BlockEditor } from './BlockEditor';
import { AssetLibrary, ObjectList, Properties } from './EditorPanels';
import {
  Dialog,
  GuideDialog,
  NameDialog,
  ProjectsDialog,
  readSharedGame,
  ShareDialog,
} from './StudioDialogs';
import { SceneStage } from './SceneStage';
import {
  ASSETS,
  newActor,
  spawnPoint,
  uid,
  type Actor,
  type AssetKind,
} from './model';
import { editorReducer, initialEditor, STORAGE_KEY } from './workspace';
import './studio.css';

type Modal = 'projects' | 'new' | 'rename' | 'guide' | 'keys' | 'share' | null;
function Brand() {
  return (
    <span className="st-brand">
      <StudioMark />
      <strong>
        Aether<span>Engine</span>
      </strong>
      <span className="brand-studio">STUDIO</span>
    </span>
  );
}
export function IslandStudio() {
  const [state, dispatch] = useReducer(editorReducer, undefined, initialEditor);
  const project = state.library.projects.find(
    (p) => p.id === state.library.current,
  )!;
  const [selection, select] = useState<string | undefined>(),
    [playing, setPlaying] = useState(false),
    [modal, setModal] = useState<Modal>(null);
  const [stored, setStored] = useState(true),
    [toast, setToast] = useState<{ text: string } | null>(null);
  const actor =
    project.actors.find((a) => a.id === selection) || project.actors[0];
  const notify = useCallback((text: string) => setToast({ text }), []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.library));
      setStored(true);
    } catch {
      setStored(false);
    }
  }, [state.library]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (modal) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' && playing) {
        setPlaying(false);
        return;
      }
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input,select,textarea,[contenteditable="true"]')
      )
        return;
      if (mod && e.code === 'Enter') {
        e.preventDefault();
        setPlaying((v) => !v);
      } else if (!playing && mod && e.code === 'KeyZ') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
      } else if (!playing && mod && e.code === 'KeyY') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (!playing && e.key === '?') setModal('guide');
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [modal, playing]);
  const patch = (id: string, p: Partial<Actor>) => {
    if (!playing)
      dispatch({
        type: 'edit',
        apply: (doc) => ({
          ...doc,
          actors: doc.actors.map((a) => (a.id === id ? { ...a, ...p } : a)),
        }),
      });
  };
  const add = (kind: AssetKind) => {
    if (playing) return;
    const next = newActor(kind, spawnPoint(project.actors));
    let name = ASSETS[kind].name,
      n = 2;
    while (project.actors.some((a) => a.name === name))
      name = `${ASSETS[kind].name} ${n++}`;
    next.name = name;
    dispatch({
      type: 'edit',
      apply: (p) => ({ ...p, actors: [...p.actors, next] }),
    });
    select(next.id);
    notify(`${name} ditambahkan ke panggung.`);
  };
  const duplicate = () => {
    if (!actor || playing) return;
    const next = {
      ...structuredClone(actor),
      ...spawnPoint(project.actors),
      id: uid(),
      name: `${actor.name.slice(0, 21)} salinan`,
    };
    dispatch({
      type: 'edit',
      apply: (p) => ({ ...p, actors: [...p.actors, next] }),
    });
    select(next.id);
    notify('Salinan objek ditambahkan.');
  };
  const remove = () => {
    if (!actor || playing) return;
    dispatch({
      type: 'edit',
      apply: (p) => ({
        ...p,
        actors: p.actors.filter((a) => a.id !== actor.id),
      }),
    });
    select(undefined);
    notify(`${actor.name} dihapus. Gunakan Urungkan untuk memulihkan.`);
  };
  const show = (m: Modal) => {
    if (playing) setPlaying(false);
    setModal(m);
  };
  const close = () => setModal(null);
  return (
    <div className="island-studio">
      <header className="studio-header">
        <div className="header-inner">
          <Brand />
          <div className="header-divider" />
          <nav aria-label="Navigasi studio">
            <button
              className={
                modal !== 'projects' && modal !== 'new' && modal !== 'guide'
                  ? 'nav-active'
                  : ''
              }
              onClick={close}
            >
              <LayoutPanelTop /> Editor
            </button>
            <button
              className={
                modal === 'projects' || modal === 'new' ? 'nav-active' : ''
              }
              onClick={() => show('projects')}
            >
              <FolderClosed /> Proyek saya
            </button>
            <button
              className={modal === 'guide' ? 'nav-active' : ''}
              onClick={() => show('guide')}
            >
              <BookOpen /> Panduan
            </button>
          </nav>
          <div className="grow" />
          <span className={`save-indicator ${!stored ? 'save-fail' : ''}`}>
            {stored ? <BadgeCheck /> : <CloudOff />}
            <span>{stored ? 'Tersimpan lokal' : 'Belum tersimpan'}</span>
          </span>
          <span className="avatar" role="img" aria-label="Avatar Miko">
            <svg viewBox="-34 -63 66 63">
              <Sprite kind="fox" />
            </svg>
          </span>
        </div>
      </header>
      <main className="studio-main">
        <div className="project-bar">
          <div className="project-title">
            <div className="breadcrumb">
              <button onClick={() => show('projects')}>RUANG KERJA</button>
              <ChevronRight /> EDITOR GAME
            </div>
            <div className="title-line">
              <h1>{project.name}</h1>
              <button
                className="title-pencil"
                title="Ubah nama proyek"
                aria-label="Ubah nama proyek"
                disabled={playing}
                onClick={() => show('rename')}
              >
                <Pencil />
              </button>
              <span className="project-tag">
                <Sprout /> {playing ? 'Mode main' : 'Mode kreator'}
              </span>
            </div>
          </div>
          <div className="project-actions">
            <div className="history-btns">
              <button
                aria-label="Urungkan"
                title="Urungkan (Ctrl+Z)"
                disabled={!state.past.length || playing}
                onClick={() => dispatch({ type: 'undo' })}
              >
                <Undo2 />
              </button>
              <button
                aria-label="Ulangi"
                title="Ulangi (Ctrl+Shift+Z)"
                disabled={!state.future.length || playing}
                onClick={() => dispatch({ type: 'redo' })}
              >
                <Redo2 />
              </button>
            </div>
            <span className="action-separator" />
            <button
              className="st-btn share-button"
              onClick={() => show('share')}
            >
              <Share2 />
              <span>Bagikan</span>
            </button>
            <button
              className={`st-btn primary play-button ${playing ? 'stop-btn' : ''}`}
              title="Mainkan / Berhenti (Ctrl+Enter)"
              onClick={() => setPlaying((v) => !v)}
            >
              {playing ? (
                <Square fill="currentColor" />
              ) : (
                <Play fill="currentColor" />
              )}
              {playing ? 'Berhenti' : 'Mainkan'}
            </button>
          </div>
        </div>
        {!stored && (
          <p className="storage-warning" role="alert">
            Penyimpanan peramban tidak tersedia. Jangan tutup tab ini sebelum
            menyalin tautan permainan melalui Bagikan.
          </p>
        )}
        <div className="desk-grid">
          <AssetLibrary
            onAdd={add}
            playing={playing}
            onGuide={() => show('guide')}
          />
          <div className="stage-column">
            <SceneStage
              key={project.id}
              actors={project.actors}
              selectedId={actor?.id}
              playing={playing}
              onSelect={select}
              onMove={patch}
            />
            <BlockEditor
              actors={project.actors}
              actor={actor}
              playing={playing}
              onSelect={select}
              onRules={(id, rules) => patch(id, { rules })}
            />
          </div>
          <aside className="settings-column">
            <ObjectList
              actors={project.actors}
              selected={actor?.id}
              playing={playing}
              onSelect={select}
              onPatch={patch}
            />
            <Properties
              actor={actor}
              playing={playing}
              onPatch={patch}
              onDuplicate={duplicate}
              onRemove={remove}
              onHint={notify}
            />
          </aside>
        </div>
        <footer className="desk-footer">
          <span className="ready-dot" />
          {playing ? 'Sedang dimainkan' : 'Studio siap'}
          <span className="footer-sep" /> {project.actors.length} objek <b>·</b>{' '}
          {project.actors.reduce((n, a) => n + a.rules.length, 0)} alur visual
          <div className="grow" />
          <button onClick={() => show('keys')}>
            <Keyboard /> Pintasan
          </button>
          <span className="footer-sep" />
          <span>AetherEngine Studio</span>
        </footer>
      </main>
      {toast && (
        <div className="studio-toast" role="status">
          <Check />
          {toast.text}
        </div>
      )}
      {modal === 'projects' && (
        <ProjectsDialog
          library={state.library}
          onClose={close}
          onNew={() => setModal('new')}
          onOpen={(id) => {
            dispatch({ type: 'open', id });
            select(undefined);
            close();
          }}
        />
      )}
      {(modal === 'new' || modal === 'rename') && (
        <NameDialog
          projectName={modal === 'rename' ? project.name : undefined}
          onClose={close}
          onSave={(name, starter) => {
            if (modal === 'rename')
              dispatch({ type: 'edit', apply: (p) => ({ ...p, name }) });
            else {
              dispatch({ type: 'new', name, starter });
              select(undefined);
            }
            close();
          }}
        />
      )}
      {modal === 'guide' && (
        <GuideDialog
          onClose={close}
          onTry={() => {
            close();
            setPlaying(true);
          }}
        />
      )}
      {modal === 'share' && <ShareDialog project={project} onClose={close} />}
      {modal === 'keys' && (
        <Dialog title="Pintasan studio" eyebrow="KENDALI CEPAT" onClose={close}>
          <dl className="shortcut-list">
            {[
              ['Mainkan / berhenti', 'Ctrl / ⌘ + Enter'],
              ['Kembali mengedit', 'Esc'],
              ['Urungkan', 'Ctrl / ⌘ + Z'],
              ['Ulangi', 'Ctrl / ⌘ + Shift + Z'],
              ['Bergerak saat main', 'WASD / Panah'],
              ['Menjalankan pemicu tombol', 'Spasi / E'],
              ['Buka panduan', '?'],
            ].map(([n, k]) => (
              <div key={n}>
                <dt>{n}</dt>
                <dd>
                  <kbd>{k}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Dialog>
      )}
    </div>
  );
}
export function SharedPlayer() {
  const [project, setProject] = useState(readSharedGame);
  const [run, restart] = useState(0);
  useEffect(() => {
    const loadLink = () => {
      setProject(readSharedGame());
      restart((v) => v + 1);
    };
    window.addEventListener('hashchange', loadLink);
    return () => window.removeEventListener('hashchange', loadLink);
  }, []);
  return (
    <div className="island-studio shared-player">
      <header className="studio-header">
        <div className="header-inner">
          <Brand />
          <div className="grow" />
          <a className="st-btn" href={window.location.pathname}>
            Buka studio <ArrowRight />
          </a>
        </div>
      </header>
      {project ? (
        <main>
          <div className="project-bar">
            <div>
              <div className="eyebrow">PERMAINAN BERBAGI</div>
              <h1>{project.name}</h1>
            </div>
            <button className="st-btn" onClick={() => restart((v) => v + 1)}>
              <RotateCcw /> Ulangi
            </button>
          </div>
          <SceneStage
            key={run}
            actors={project.actors}
            playing
            onSelect={() => {}}
            onMove={() => {}}
          />
          <p>
            Gunakan tombol panah atau WASD untuk bergerak. Tekan Spasi, E, atau
            klik objek untuk menjalankan bloknya.
          </p>
        </main>
      ) : (
        <main>
          <h1>Tautan game tidak lengkap</h1>
          <p>
            Minta tautan baru dari pembuatnya atau buka studio untuk membuat
            pulaumu sendiri.
          </p>
        </main>
      )}
    </div>
  );
}
