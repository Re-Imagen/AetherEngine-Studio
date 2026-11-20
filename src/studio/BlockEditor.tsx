import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  ChevronDown,
  CornerDownRight,
  GitBranch,
  Play,
  Plus,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  actionNames,
  directionNames,
  newAction,
  newRule,
  type Action,
  type Actor,
  type Direction,
  type GameKey,
  type Rule,
  type Trigger,
} from './model';
import { AssetArt } from './art/Sprites';

interface Props {
  actors: Actor[];
  actor?: Actor;
  playing: boolean;
  onSelect: (id: string) => void;
  onRules: (id: string, rules: Rule[]) => void;
}
const events: Record<Trigger, string> = {
  key: 'Saat tombol ditekan',
  start: 'Saat game dimulai',
  click: 'Saat objek diklik',
};
function Connector() {
  return (
    <div className="node-link" aria-hidden="true">
      <svg viewBox="0 0 32 16" preserveAspectRatio="none">
        <path d="M0 8H32" fill="none" stroke="#817989" strokeWidth="2" />
      </svg>
    </div>
  );
}
export function BlockEditor({
  actors,
  actor,
  playing,
  onSelect,
  onRules,
}: Props) {
  const [active, setActive] = useState<string | null>(null);
  const rule = actor?.rules.find((r) => r.id === active) || actor?.rules[0];
  const strip = useRef<HTMLDivElement>(null),
    scrollEnd = useRef(false);
  const change = (update: Partial<Rule>) => {
    if (actor && rule && !playing)
      onRules(
        actor.id,
        actor.rules.map((r) => (r.id === rule.id ? { ...r, ...update } : r)),
      );
  };
  const actionChange = (id: string, action: Action) => {
    if (rule)
      change({ actions: rule.actions.map((a) => (a.id === id ? action : a)) });
  };
  const addRule = () => {
    if (!actor || playing) return;
    const next = newRule(actor.rules.length ? 'start' : 'key');
    onRules(actor.id, [...actor.rules, next]);
    setActive(next.id);
  };
  const reorder = (from: number, to: number) => {
    if (
      !rule ||
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= rule.actions.length ||
      to >= rule.actions.length
    )
      return;
    const actions = rule.actions.slice();
    const [item] = actions.splice(from, 1);
    actions.splice(to, 0, item);
    change({ actions });
  };
  useEffect(() => {
    if (scrollEnd.current && strip.current) {
      strip.current.scrollLeft = strip.current.scrollWidth;
      scrollEnd.current = false;
    }
  }, [rule?.actions.length]);
  return (
    <section
      className="st-panel code-panel"
      id="island-blocks"
      aria-labelledby="code-heading"
    >
      <div className="panel-head">
        <span className="heading-icon t-lilac">
          <Blocks />
        </span>
        <h2 id="code-heading">Kode visual</h2>
        <div className="grow" />
        {actor && (
          <label className="actor-picker">
            <AssetArt kind={actor.kind} />
            <span>{actor.name}</span>
            <ChevronDown />
            <select
              aria-label="Objek untuk kode visual"
              value={actor.id}
              disabled={playing}
              onChange={(e) => onSelect(e.target.value)}
            >
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {actor && rule ? (
        <>
          <fieldset className="block-fieldset" disabled={playing}>
            <legend className="sr-only">Blok untuk {actor.name}</legend>
            <div className="block-scroll dot-paper" ref={strip}>
              <div className="block-row">
                <div className="code-node event-node">
                  <div className="node-cap">
                    <Zap size={13} fill="currentColor" /> PEMICU
                  </div>
                  <label className="block-title-select">
                    <span>{events[rule.trigger]}</span>
                    <ChevronDown />
                    <select
                      aria-label="Pilih pemicu"
                      value={rule.trigger}
                      onChange={(e) =>
                        change({ trigger: e.target.value as Trigger })
                      }
                    >
                      {Object.entries(events).map(([v, n]) => (
                        <option key={v} value={v}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="node-param">
                    {rule.trigger === 'key' ? (
                      <>
                        Tombol{' '}
                        <select
                          aria-label="Tombol pemicu"
                          value={rule.key}
                          onChange={(e) =>
                            change({ key: e.target.value as GameKey })
                          }
                        >
                          <option value="Space">Spasi</option>
                          <option value="KeyE">E</option>
                        </select>
                      </>
                    ) : rule.trigger === 'start' ? (
                      <>
                        <Play size={12} /> Sekali di awal
                      </>
                    ) : (
                      <>Klik atau ketuk objek</>
                    )}
                  </div>
                  <i className="socket out" />
                </div>
                {rule.actions.map((a, i) => (
                  <div key={a.id} className="linked-node">
                    <Connector />
                    <div
                      className={`code-node action-node action-${a.kind}`}
                      draggable={!playing}
                      onDragStart={(e) =>
                        e.dataTransfer.setData('application/aether-block', a.id)
                      }
                      onDragOver={(e) => {
                        if (
                          e.dataTransfer.types.includes(
                            'application/aether-block',
                          )
                        )
                          e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        reorder(
                          rule.actions.findIndex(
                            (v) =>
                              v.id ===
                              e.dataTransfer.getData(
                                'application/aether-block',
                              ),
                          ),
                          i,
                        );
                      }}
                    >
                      <i className="socket in" />
                      <div className="node-cap">
                        <WandSparkles size={13} /> AKSI <div className="grow" />
                        {i > 0 && (
                          <button
                            aria-label={`Geser aksi ${i + 1} ke kiri`}
                            title="Geser ke kiri"
                            onClick={() => reorder(i, i - 1)}
                          >
                            <ArrowLeft />
                          </button>
                        )}
                        <button
                          title="Hapus aksi"
                          aria-label={`Hapus aksi ${i + 1}`}
                          onClick={() =>
                            change({
                              actions: rule.actions.filter(
                                (v) => v.id !== a.id,
                              ),
                            })
                          }
                        >
                          <X />
                        </button>
                      </div>
                      <label className="block-title-select">
                        <span>{actionNames[a.kind]}</span>
                        <ChevronDown />
                        <select
                          aria-label={`Jenis aksi ${i + 1}`}
                          value={a.kind}
                          onChange={(e) =>
                            actionChange(a.id, {
                              ...newAction(e.target.value as Action['kind']),
                              id: a.id,
                            })
                          }
                        >
                          {Object.entries(actionNames).map(([v, n]) => (
                            <option key={v} value={v}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="node-param">
                        {a.kind === 'jump' ? (
                          <>
                            Tinggi{' '}
                            <select
                              aria-label="Tinggi lompatan"
                              value={a.height}
                              onChange={(e) =>
                                actionChange(a.id, {
                                  ...a,
                                  height: Number(e.target.value),
                                })
                              }
                            >
                              {[0.5, 1, 1.5, 2, 3].map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                            </select>{' '}
                            petak
                          </>
                        ) : a.kind === 'move' ? (
                          <>
                            <select
                              aria-label="Arah langkah"
                              value={a.direction}
                              onChange={(e) =>
                                actionChange(a.id, {
                                  ...a,
                                  direction: e.target.value as Direction,
                                })
                              }
                            >
                              {Object.entries(directionNames).map(([v, n]) => (
                                <option key={v} value={v}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <select
                              aria-label="Jumlah langkah"
                              value={a.steps}
                              onChange={(e) =>
                                actionChange(a.id, {
                                  ...a,
                                  steps: +e.target.value,
                                })
                              }
                            >
                              {[1, 2, 3, 4].map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                            </select>
                          </>
                        ) : a.kind === 'say' ? (
                          <select
                            className="say-param"
                            aria-label="Ucapan"
                            value={a.text}
                            onChange={(e) =>
                              actionChange(a.id, { ...a, text: e.target.value })
                            }
                          >
                            {[
                              'Halo, dunia!',
                              'Ayo jelajahi pulau!',
                              'Kamu menemukanku!',
                              'Hore!',
                            ].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        ) : (
                          <>Hadap sebaliknya</>
                        )}
                      </div>
                      <i className="socket out" />
                    </div>
                  </div>
                ))}
                <Connector />
                <button
                  className="add-block"
                  title="Tambah aksi"
                  aria-label="Tambah aksi"
                  onClick={() => {
                    scrollEnd.current = true;
                    change({ actions: [...rule.actions, newAction('move')] });
                  }}
                >
                  <Plus />
                </button>
              </div>
            </div>
          </fieldset>
          <div className="code-foot">
            <label className="rule-picker">
              <GitBranch />
              <span>
                Alur {String(actor.rules.indexOf(rule) + 1).padStart(2, '0')}
              </span>
              <ChevronDown />
              <select
                aria-label="Pilih alur"
                value={rule.id}
                disabled={playing}
                onChange={(e) => setActive(e.target.value)}
              >
                {actor.rules.map((r, i) => (
                  <option value={r.id} key={r.id}>
                    Alur {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={playing} onClick={addRule} title="Tambah alur">
              <Plus /> Alur
            </button>
            <button
              disabled={playing}
              title="Hapus alur ini"
              aria-label="Hapus alur ini"
              onClick={() =>
                onRules(
                  actor.id,
                  actor.rules.filter((r) => r.id !== rule.id),
                )
              }
            >
              <Trash2 />
            </button>
            <div className="grow" />
            <span className="code-help">
              Dibaca kiri ke kanan <ArrowRight />
            </span>
          </div>
        </>
      ) : (
        <div className="empty-code dot-paper">
          <CornerDownRight />
          <p>
            {actor
              ? `Apa yang akan ${actor.name} lakukan?`
              : 'Tambahkan objek untuk mulai merangkai blok.'}
          </p>
          {actor && (
            <button
              className="st-btn small"
              disabled={playing}
              onClick={addRule}
            >
              <Plus /> Tambah alur pertama
            </button>
          )}
        </div>
      )}
    </section>
  );
}
