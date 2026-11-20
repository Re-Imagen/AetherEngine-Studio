import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Layers,
  Lightbulb,
  MousePointer2,
  Pencil,
  Plus,
  Search,
  Shapes,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { AssetArt, AssetIcon } from './art/Sprites';
import {
  ASSETS,
  assetKinds,
  onIsland,
  tenth,
  type Actor,
  type AssetKind,
  type Category,
} from './model';

export function AssetLibrary({
  onAdd,
  playing,
  onGuide,
}: {
  onAdd: (kind: AssetKind) => void;
  playing: boolean;
  onGuide: () => void;
}) {
  const [search, setSearch] = useState(''),
    [category, setCategory] = useState<Category | 'Semua'>('Semua');
  const items = assetKinds.filter(
    (k) =>
      (category === 'Semua' || ASSETS[k].category === category) &&
      `${ASSETS[k].name} ${ASSETS[k].category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <aside className="asset-column">
      <section
        className="st-panel library-panel"
        id="island-assets"
        aria-labelledby="library-heading"
      >
        <div className="panel-head">
          <span className="heading-icon t-peach">
            <Shapes />
          </span>
          <h2 id="library-heading">Pustaka aset</h2>
          <div className="grow" />
          <span className="count-pill">{assetKinds.length}</span>
        </div>
        <div className="library-body">
          <label className="asset-search">
            <Search />
            <input
              type="search"
              placeholder="Cari aset…"
              aria-label="Cari aset"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="collection-label">
            <span>KOLEKSI DASAR</span>
            <label>
              {category}
              <ChevronDown />
              <select
                aria-label="Filter kategori aset"
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
              >
                {['Semua', 'Karakter', 'Alam', 'Properti'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="asset-grid">
            {items.map((kind) => (
              <button
                key={kind}
                className="asset-card"
                disabled={playing}
                title={`Tambahkan ${ASSETS[kind].name} ke panggung`}
                aria-label={`Tambah ${ASSETS[kind].name}`}
                onClick={() => onAdd(kind)}
              >
                <span
                  className="art-tile"
                  style={{ backgroundColor: ASSETS[kind].tint }}
                >
                  <AssetArt kind={kind} />
                  <span className="tile-plus">
                    <Plus />
                  </span>
                </span>
                <span className="asset-name">{ASSETS[kind].name}</span>
              </button>
            ))}
          </div>
          {items.length === 0 && (
            <div className="no-assets">
              <Search />
              <p>Aset tidak ditemukan.</p>
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('Semua');
                }}
              >
                Hapus filter
              </button>
            </div>
          )}
        </div>
        <div className="library-note">
          <MousePointer2 /> Klik aset untuk menambahkannya.
        </div>
      </section>
      <button className="tip-card" onClick={onGuide}>
        <div>
          <Lightbulb />
          <strong>Tips kreator</strong>
          <span>✧</span>
        </div>
        <p>Mulai dari satu objek dan satu aksi. Coba, lalu ubah sesukamu!</p>
        <span className="tip-link">
          Buka panduan <BookOpen />
        </span>
      </button>
    </aside>
  );
}
export function ObjectList({
  actors,
  selected,
  playing,
  onSelect,
  onPatch,
}: {
  actors: Actor[];
  selected?: string;
  playing: boolean;
  onSelect: (id: string) => void;
  onPatch: (id: string, p: Partial<Actor>) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  // Reveal newly added/selected actors without scrolling the entire editor on phones.
  useEffect(() => {
    const el = list.current,
      row = el?.querySelector<HTMLElement>('.chosen');
    if (!el || !row) return;
    const box = el.getBoundingClientRect(),
      item = row.getBoundingClientRect();
    if (item.bottom > box.bottom) el.scrollTop += item.bottom - box.bottom;
    else if (item.top < box.top) el.scrollTop -= box.top - item.top;
  }, [selected]);
  return (
    <section
      className="st-panel objects-panel"
      aria-labelledby="objects-heading"
    >
      <div className="panel-head">
        <span className="heading-icon t-sage">
          <Layers />
        </span>
        <h2 id="objects-heading">Objek adegan</h2>
        <div className="grow" />
        <span className="count-pill">{actors.length}</span>
      </div>
      <div className="scene-object-list" ref={list}>
        {actors.map((a) => (
          <div
            key={a.id}
            className={`object-row ${a.id === selected ? 'chosen' : ''} ${!a.visible ? 'object-hidden' : ''}`}
          >
            <button
              className="object-name"
              disabled={playing}
              aria-pressed={a.id === selected}
              onClick={() => onSelect(a.id)}
            >
              <AssetIcon kind={a.kind} />
              <span>{a.name}</span>
            </button>
            <button
              className="visibility-toggle"
              disabled={playing}
              title={a.visible ? 'Sembunyikan objek' : 'Tampilkan objek'}
              aria-label={`${a.visible ? 'Sembunyikan' : 'Tampilkan'} ${a.name}`}
              onClick={() => onPatch(a.id, { visible: !a.visible })}
            >
              {a.visible ? <Eye /> : <EyeOff />}
            </button>
          </div>
        ))}
        {!actors.length && (
          <p className="empty-note">
            Panggung masih kosong. Pilih aset dari pustaka.
          </p>
        )}
      </div>
    </section>
  );
}
function Coordinate({
  axis,
  actor,
  onPatch,
  onHint,
}: {
  axis: 'x' | 'z';
  actor: Actor;
  onPatch: (id: string, p: Partial<Actor>) => void;
  onHint: (s: string) => void;
}) {
  const value = actor[axis];
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value, actor.id]);
  const commit = () => {
    if (draft === String(value)) return;
    const n = tenth(Number(draft));
    if (
      draft.trim() !== '' &&
      Number.isFinite(n) &&
      onIsland({ ...actor, [axis]: n })
    ) {
      if (value !== n) onPatch(actor.id, { [axis]: n });
      setDraft(String(n));
    } else {
      setDraft(String(value));
      onHint('Posisi harus berada di atas permukaan pulau.');
    }
  };
  return (
    <label className={`coordinate coordinate-${axis}`}>
      <span>{axis.toUpperCase()}</span>
      <input
        aria-label={`Posisi ${axis.toUpperCase()}`}
        type="number"
        step="0.1"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
function SizeControl({
  actor,
  onPatch,
}: {
  actor: Actor;
  onPatch: (id: string, p: Partial<Actor>) => void;
}) {
  const current = Math.round(actor.scale * 100);
  const [size, setSize] = useState(current);
  useEffect(() => setSize(current), [current, actor.id]);
  const commit = (value: number) => {
    if (value !== current) onPatch(actor.id, { scale: value / 100 });
  };
  return (
    <div className="prop-group">
      <label className="prop-label" htmlFor="object-size">
        Ukuran <span>{size}%</span>
      </label>
      <input
        id="object-size"
        className="size-range"
        aria-label="Ukuran objek"
        type="range"
        min="50"
        max="160"
        step="1"
        value={size}
        style={{
          background: `linear-gradient(to right, #e98f67 ${((size - 50) / 110) * 100}%, #e3dfd3 ${((size - 50) / 110) * 100}%)`,
        }}
        onChange={(e) => setSize(+e.target.value)}
        onPointerUp={(e) => commit(+e.currentTarget.value)}
        onKeyUp={(e) => commit(+e.currentTarget.value)}
        onBlur={(e) => commit(+e.currentTarget.value)}
      />
    </div>
  );
}
export function Properties({
  actor,
  playing,
  onPatch,
  onDuplicate,
  onRemove,
  onHint,
}: {
  actor?: Actor;
  playing: boolean;
  onPatch: (id: string, p: Partial<Actor>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onHint: (s: string) => void;
}) {
  const [renaming, setRenaming] = useState(false),
    [name, setName] = useState('');
  useEffect(() => setRenaming(false), [actor?.id]);
  const rename = () => {
    if (actor && name.trim() && name.trim() !== actor.name)
      onPatch(actor.id, { name: name.trim() });
    setRenaming(false);
  };
  return (
    <section
      className="st-panel properties-panel"
      aria-labelledby="properties-heading"
    >
      <div className="panel-head">
        <span className="heading-icon t-butter">
          <SlidersHorizontal />
        </span>
        <h2 id="properties-heading">Properti</h2>
      </div>
      {actor ? (
        <fieldset className="properties-body" disabled={playing}>
          <legend className="sr-only">Properti {actor.name}</legend>
          <div className="object-id">
            <AssetIcon kind={actor.kind} />
            <div className="object-id-text">
              {renaming ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename();
                  }}
                >
                  <input
                    autoFocus
                    aria-label="Nama objek"
                    maxLength={28}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setRenaming(false);
                      }
                    }}
                  />
                  <button title="Simpan nama" aria-label="Simpan nama objek">
                    <Check />
                  </button>
                  <button
                    type="button"
                    title="Batal"
                    onClick={() => setRenaming(false)}
                  >
                    <X />
                  </button>
                </form>
              ) : (
                <button
                  className="rename-object"
                  title="Ubah nama objek"
                  onClick={() => {
                    setName(actor.name);
                    setRenaming(true);
                  }}
                >
                  <strong>{actor.name}</strong>
                  <Pencil />
                </button>
              )}
              <span>{ASSETS[actor.kind].category}</span>
            </div>
          </div>
          <div className="prop-group">
            <div className="prop-label">Posisi</div>
            <div className="coords">
              <Coordinate
                axis="x"
                actor={actor}
                onPatch={onPatch}
                onHint={onHint}
              />
              <Coordinate
                axis="z"
                actor={actor}
                onPatch={onPatch}
                onHint={onHint}
              />
            </div>
          </div>
          <SizeControl actor={actor} onPatch={onPatch} />
          <div className="prop-direction">
            <span>Arah hadap</span>
            <button
              aria-label="Balik arah objek"
              title="Balik arah objek"
              onClick={() => onPatch(actor.id, { flipped: !actor.flipped })}
            >
              <FlipHorizontal2 />
              {actor.flipped ? 'Kiri' : 'Kanan'}
            </button>
          </div>
          <div className="obj-actions">
            <button onClick={onDuplicate}>
              <Copy /> Duplikat
            </button>
            <button
              title="Hapus objek"
              aria-label="Hapus objek"
              onClick={onRemove}
            >
              <Trash2 />
            </button>
          </div>
        </fieldset>
      ) : (
        <p className="empty-note">
          Pilih objek untuk mengatur posisi dan ukurannya.
        </p>
      )}
    </section>
  );
}
