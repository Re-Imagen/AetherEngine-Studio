import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Gamepad2,
  Plus,
  X,
} from 'lucide-react';
import { AssetArt } from './art/Sprites';
import type { IslandProject, Workspace } from './model';
import { validProject } from './workspace';

export function Dialog({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="studio-dialog"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const b = ref.current!.getBoundingClientRect();
          if (
            e.clientX < b.left ||
            e.clientX > b.right ||
            e.clientY < b.top ||
            e.clientY > b.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dlg-head">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h2 id={id}>{title}</h2>
        </div>
        <button
          className="icon-btn dlg-close"
          aria-label="Tutup dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ProjectsDialog({
  library,
  onOpen,
  onNew,
  onClose,
}: {
  library: Workspace;
  onOpen: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog title="Proyek saya" eyebrow="RUANG KERJA LOKAL" onClose={onClose}>
      <p className="dlg-desc">
        Pilih pulau untuk melanjutkan. Proyek tersimpan di peramban ini.
      </p>
      <div className="project-list">
        {[...library.projects]
          .sort((a, b) => b.updated - a.updated)
          .map((p) => (
            <button key={p.id} onClick={() => onOpen(p.id)}>
              <span className="project-thumb">
                <AssetArt kind="cottage" />
              </span>
              <span>
                <strong>{p.name}</strong>
                <small>
                  {p.actors.length} objek ·{' '}
                  {new Date(p.updated).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </small>
              </span>
              <div className="grow" />
              {p.id === library.current && (
                <span className="current-tag">Aktif</span>
              )}
              <ChevronRight />
            </button>
          ))}
      </div>
      <button className="st-btn primary" onClick={onNew}>
        <Plus /> Proyek baru
      </button>
      <div className="dlg-classic">
        Mencari proyek versi sebelumnya?{' '}
        <a href="?mode=classic">
          Buka Studio klasik <ExternalLink />
        </a>
      </div>
    </Dialog>
  );
}
export function NameDialog({
  projectName,
  onSave,
  onClose,
}: {
  projectName?: string;
  onSave: (name: string, starter: boolean) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(projectName ?? 'Pulau Baru'),
    [starter, setStarter] = useState(true);
  return (
    <Dialog
      title={projectName ? 'Ubah nama proyek' : 'Buat proyek baru'}
      eyebrow="PROYEK SAYA"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSave(name.trim(), starter);
        }}
      >
        <label className="dlg-label">
          Nama proyek
          <input
            autoFocus
            maxLength={40}
            required
            value={name}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama pulau kamu"
          />
        </label>
        {!projectName && (
          <fieldset className="template-choices">
            <legend>Mulai dengan</legend>
            {([true, false] as const).map((v) => (
              <label key={String(v)} className={starter === v ? 'chosen' : ''}>
                <input
                  type="radio"
                  name="starter"
                  checked={starter === v}
                  onChange={() => setStarter(v)}
                />
                <AssetArt kind={v ? 'cottage' : 'fox'} />
                <strong>{v ? 'Pulau lengkap' : 'Miko saja'}</strong>
                <small>{v ? 'Adegan siap dimainkan' : 'Susun dari awal'}</small>
              </label>
            ))}
          </fieldset>
        )}
        <div className="dlg-buttons">
          <button type="button" className="st-btn" onClick={onClose}>
            Batal
          </button>
          <button className="st-btn primary" disabled={!name.trim()}>
            {projectName ? <Check /> : <Plus />}
            {projectName ? 'Simpan nama' : 'Buat proyek'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function GuideDialog({
  onClose,
  onTry,
}: {
  onClose: () => void;
  onTry: () => void;
}) {
  return (
    <Dialog title="Game pertamamu" eyebrow="PANDUAN KREATOR" onClose={onClose}>
      <div className="guide-intro">
        <AssetArt kind="fox" />
        <p>Hai, aku Miko! Ayo buat pulaumu hidup dengan tiga langkah kecil.</p>
      </div>
      <ol className="guide-steps">
        <li>
          <span>01</span>
          <div>
            <strong>Pilih dan susun aset</strong>
            <p>
              Klik gambar di Pustaka aset, lalu geser objek ke tempat yang kamu
              mau di panggung.
            </p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Beri objek sebuah aksi</strong>
            <p>
              Pilih Miko. Di Kode visual, pasangkan pemicu “Saat tombol ditekan”
              dengan aksi “Lompat”. Klik + untuk menyambung aksi berikutnya.
            </p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Mainkan hasilnya</strong>
            <p>
              Gerakkan Miko dengan tombol panah, lalu tekan Spasi untuk mencoba
              bloknya. Di layar sentuh, gunakan tombol di panggung.
            </p>
          </div>
        </li>
      </ol>
      <p className="guide-hint">
        Berhenti bermain untuk kembali mengedit. Perubahan saat bermain tidak
        mengubah adegan aslimu.
      </p>
      <div className="dlg-buttons">
        <button className="st-btn" onClick={onClose}>
          Kembali
        </button>
        <button className="st-btn primary" onClick={onTry}>
          <Gamepad2 /> Coba mainkan
        </button>
      </div>
    </Dialog>
  );
}
export function gameLink(project: IslandProject) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set('mode', 'pulau');
  const bytes = new TextEncoder().encode(JSON.stringify(project));
  url.hash = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return url.href;
}
export function readSharedGame(): IslandProject | null {
  try {
    const str = location.hash.slice(1);
    if (!str || str.length > 1_000_000) return null;
    const json = new TextDecoder().decode(
      Uint8Array.from(
        atob(str.replaceAll('-', '+').replaceAll('_', '/')),
        (c) => c.charCodeAt(0),
      ),
    );
    const data: unknown = JSON.parse(json);
    return validProject(data) ? data : null;
  } catch {
    return null;
  }
}
export function ShareDialog({
  project,
  onClose,
}: {
  project: IslandProject;
  onClose: () => void;
}) {
  const url = gameLink(project),
    field = useRef<HTMLInputElement>(null),
    [status, setStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Tautan disalin.');
    } catch {
      field.current?.focus();
      field.current?.select();
      setStatus('Salin teks yang dipilih untuk membagikan tautan.');
    }
  };
  return (
    <Dialog
      title="Bagikan permainan"
      eyebrow="BUATANMU, SIAP DIMAINKAN"
      onClose={onClose}
    >
      <div className="share-card">
        <span className="project-thumb">
          <AssetArt kind="cottage" />
        </span>
        <div>
          <strong>{project.name}</strong>
          <p>{project.actors.length} objek · Game 2.5D</p>
        </div>
      </div>
      <p className="dlg-desc">
        Siapa pun yang memiliki tautan ini dapat memainkan salinan game saat
        ini, tanpa mengubah proyekmu.
      </p>
      <label className="dlg-label">
        Tautan permainan
        <input
          ref={field}
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
        />
      </label>
      <div className="dlg-buttons">
        <a className="st-btn" href={url} target="_blank" rel="noreferrer">
          <ExternalLink /> Buka game
        </a>
        <button className="st-btn primary" onClick={copy}>
          <Copy /> Salin tautan
        </button>
      </div>
      {status && (
        <p role="status" className="copy-status">
          {status}
        </p>
      )}
    </Dialog>
  );
}
