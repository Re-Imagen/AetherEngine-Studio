import { useEffect, useRef, useState, type PointerEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Grid2X2,
  Hand,
  Maximize,
  Minimize,
  Minus,
  MousePointer2,
  Plus,
  Scan,
} from 'lucide-react';
import { Sprite } from './art/Sprites';
import { Terrain } from './art/WorldArt';
import {
  clamp,
  onIsland,
  projectPoint,
  tenth,
  unprojectDelta,
  type Actor,
  type Point,
} from './model';
import { IslandRuntime } from './runtime';

interface Props {
  actors: Actor[];
  selectedId?: string;
  playing: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, p: Point) => void;
}
type Drag = {
  id?: string;
  pointer: number;
  start: DOMPoint;
  position: Point;
  initialPan: { x: number; y: number };
  moved: boolean;
  last?: Point;
};
const playKeys = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'Space',
  'KeyE',
];
export function SceneStage({
  actors,
  selectedId,
  playing,
  onSelect,
  onMove,
}: Props) {
  const stage = useRef<SVGSVGElement>(null);
  const runtime = useRef<IslandRuntime | null>(null);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<({ id: string } & Point) | null>(null);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [grid, setGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  const [, frame] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const sim = new IslandRuntime(actors);
    runtime.current = sim;
    stage.current?.focus({ preventScroll: true });
    let raf = 0,
      last = performance.now();
    const tick = (now: number) => {
      sim.tick((now - last) / 1000);
      last = now;
      frame((n) => n + 1);
      raf = requestAnimationFrame(tick);
    };
    const press = (e: KeyboardEvent) => {
      if (
        !playKeys.includes(e.code) ||
        e.altKey ||
        e.metaKey ||
        e.ctrlKey ||
        (e.target instanceof HTMLElement &&
          e.target.closest('input,select,textarea,dialog'))
      )
        return;
      e.preventDefault();
      sim.keys.add(e.code);
      if (!e.repeat && (e.code === 'Space' || e.code === 'KeyE'))
        sim.fire('key', e.code);
    };
    const release = (e: KeyboardEvent) => {
      sim.keys.delete(e.code);
    };
    const blur = () => sim.keys.clear();
    window.addEventListener('keydown', press);
    window.addEventListener('keyup', release);
    window.addEventListener('blur', blur);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      runtime.current = null;
      window.removeEventListener('keydown', press);
      window.removeEventListener('keyup', release);
      window.removeEventListener('blur', blur);
    };
  }, [playing, actors]);
  useEffect(() => {
    if (!expanded) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [expanded]);
  const svgPoint = (e: PointerEvent): DOMPoint =>
    new DOMPoint(e.clientX, e.clientY).matrixTransform(
      stage.current!.getScreenCTM()!.inverse(),
    );
  const begin = (e: PointerEvent, id?: string) => {
    if (e.button !== 0 || !e.isPrimary) return;
    if (playing) {
      if (id) runtime.current?.fire('click', undefined, id);
      return;
    }
    if (tool === 'select' && !id) return;
    const actor = actors.find((a) => a.id === id);
    if (tool === 'select' && actor) onSelect(actor.id);
    drag.current = {
      id: tool === 'select' ? id : undefined,
      pointer: e.pointerId,
      start: svgPoint(e),
      position: actor ? { x: actor.x, z: actor.z } : { x: 0, z: 0 },
      initialPan: pan,
      moved: false,
    };
    stage.current?.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const p = svgPoint(e),
      dx = p.x - d.start.x,
      dy = p.y - d.start.y;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !d.moved) return;
    d.moved = true;
    if (!d.id) {
      setPan({
        x: clamp(d.initialPan.x + dx, -240, 240),
        y: clamp(d.initialPan.y + dy, -150, 150),
      });
      return;
    }
    const delta = unprojectDelta(dx / zoom, dy / zoom);
    const next = {
      x: tenth(d.position.x + delta.x),
      z: tenth(d.position.z + delta.z),
    };
    if (onIsland(next)) {
      d.last = next;
      setPreview({ id: d.id, ...next });
    }
  };
  const finish = (e: PointerEvent, commit: boolean) => {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    if (
      commit &&
      d.id &&
      d.moved &&
      d.last &&
      (d.position.x !== d.last.x || d.position.z !== d.last.z)
    )
      onMove(d.id, d.last);
    drag.current = null;
    setPreview(null);
    if (stage.current?.hasPointerCapture(e.pointerId))
      stage.current.releasePointerCapture(e.pointerId);
  };
  const draw = actors
    .filter((a) => a.visible)
    .map((a) => {
      const body = playing ? runtime.current?.bodies.get(a.id) : undefined;
      const pos = body || (!playing && preview?.id === a.id ? preview : a);
      return { a, pos, body };
    })
    .sort((a, b) => a.pos.x + a.pos.z - (b.pos.x + b.pos.z));
  return (
    <section
      className={`st-panel stage-panel${expanded ? ' stage-expanded' : ''}`}
      aria-label="Panggung permainan"
    >
      <div className="panel-head">
        <span className="heading-icon t-sky">
          <Box />
        </span>
        <h2>Panggung</h2>
        <span className="mode-chip">2.5D</span>
        <div className="grow" />
        <button
          className="icon-btn"
          title={expanded ? 'Perkecil panggung' : 'Perbesar panggung'}
          aria-label={expanded ? 'Perkecil panggung' : 'Perbesar panggung'}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <Minimize /> : <Maximize />}
        </button>
      </div>
      <div
        className={`stage-surface ${tool === 'pan' && !playing ? 'is-panning' : ''}`}
      >
        <svg
          ref={stage}
          viewBox="0 0 700 360"
          className="stage-svg"
          tabIndex={-1}
          aria-label="Pulau terapung dengan kamera isometrik"
          onPointerDown={(e) => begin(e)}
          onPointerMove={move}
          onPointerUp={(e) => finish(e, true)}
          onPointerCancel={(e) => finish(e, false)}
        >
          <g
            transform={`translate(${350 + pan.x} ${178 + pan.y}) scale(${zoom}) translate(-350 -178)`}
          >
            <Terrain grid={grid && !playing} />
            {draw.map(({ a, pos, body }) => {
              const p = projectPoint(pos),
                selected = a.id === selectedId && !playing,
                h = (body?.height || 0) * 36;
              const s = a.scale,
                big = a.kind === 'cottage',
                sw = (big ? 53 : a.kind === 'pine' ? 29 : 21) * s;
              return (
                <g
                  key={a.id}
                  data-actor={a.id}
                  data-x={pos.x}
                  data-z={pos.z}
                  data-height={body?.height || 0}
                  transform={`translate(${p.x} ${p.y})`}
                  className="scene-sprite"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    begin(e, a.id);
                  }}
                >
                  <ellipse
                    cx={4 * s}
                    cy=".5"
                    rx={sw * (1 - 0.23 * Math.min(1, h / 60))}
                    ry={(big ? 13 : 7) * s}
                    fill="#526e49"
                    opacity={big ? 0.21 : 0.24}
                  />
                  {selected && (
                    <g pointerEvents="none">
                      <ellipse
                        cy="0"
                        rx={sw + 5}
                        ry={sw * 0.41 + 2}
                        fill="#ffde9d"
                        fillOpacity=".34"
                        stroke="#fffcdf"
                        strokeWidth="3.5"
                      />
                      <ellipse
                        cy="0"
                        rx={sw + 5}
                        ry={sw * 0.41 + 2}
                        fill="none"
                        stroke="#6c5841"
                        strokeWidth="1.2"
                        strokeDasharray="3.5 4"
                      />
                    </g>
                  )}
                  <g
                    transform={`translate(0 ${-h}) scale(${(body?.flipped ?? a.flipped) ? -s : s} ${s})`}
                  >
                    <Sprite kind={a.kind} />
                  </g>
                  {selected && (
                    <g
                      transform={`translate(0 ${sw * 0.42 + 6})`}
                      pointerEvents="none"
                    >
                      <rect
                        x={-Math.min(62, 10 + a.name.length * 3)}
                        width={Math.min(124, 20 + a.name.length * 6)}
                        y="0"
                        height="16"
                        rx="5"
                        fill="#fff7df"
                        stroke="#665444"
                        strokeWidth="1.3"
                      />
                      <text
                        y="11.5"
                        textAnchor="middle"
                        fontSize="10.3"
                        fontWeight="750"
                        fill="#4b4238"
                      >
                        {a.name.length > 17
                          ? a.name.slice(0, 16) + '…'
                          : a.name}
                      </text>
                    </g>
                  )}
                  {body?.message && (
                    <g
                      transform={`translate(0 ${-(a.kind === 'pine' || big ? 114 : 64) * s - h})`}
                      pointerEvents="none"
                    >
                      <rect
                        x={-Math.min(110, 9 + body.message.length * 2.9)}
                        width={Math.min(220, 18 + body.message.length * 5.8)}
                        y="-18"
                        height="20"
                        rx="7"
                        fill="#fffbee"
                        stroke="#554d40"
                        strokeWidth="1.4"
                      />
                      <path
                        d="m-3 2 2 5 6-5"
                        fill="#fffbee"
                        stroke="#554d40"
                        strokeWidth="1.3"
                      />
                      <text
                        y="-4.5"
                        textAnchor="middle"
                        fontSize="10.8"
                        fill="#423f36"
                      >
                        {body.message}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        <div className={`stage-label ${playing ? 'now-playing' : ''}`}>
          <i />
          {playing ? 'MODE MAIN' : 'ADEGAN 01'}
        </div>
        <svg viewBox="0 0 44 41" className="axis-glyph" aria-hidden="true">
          <g strokeWidth="2.3" strokeLinecap="round">
            <path d="M20 24V9" stroke="#729352" />
            <path d="m20 24 15 7" stroke="#bd7055" />
            <path d="m20 24-13 7" stroke="#4a899b" />
          </g>
          <g fontSize="8" fontWeight="800">
            <text x="17" y="8" fill="#466939">
              Y
            </text>
            <text x="36" y="37" fill="#92543f">
              X
            </text>
            <text x="0" y="37" fill="#3a6c81">
              Z
            </text>
          </g>
        </svg>
        {!playing ? (
          <>
            <div className="stage-tools">
              <button
                className={tool === 'select' ? 'on' : ''}
                aria-label="Pilih dan geser objek"
                title="Pilih dan geser objek"
                aria-pressed={tool === 'select'}
                onClick={() => setTool('select')}
              >
                <MousePointer2 />
              </button>
              <button
                className={tool === 'pan' ? 'on' : ''}
                aria-label="Geser kamera"
                title="Geser kamera"
                aria-pressed={tool === 'pan'}
                onClick={() => setTool('pan')}
              >
                <Hand />
              </button>
              <span />
              <button
                className={grid ? 'on' : ''}
                aria-label="Tampilkan kisi"
                title="Tampilkan kisi"
                aria-pressed={grid}
                onClick={() => setGrid((v) => !v)}
              >
                <Grid2X2 />
              </button>
            </div>
            <div className="stage-zoom">
              <button
                title="Perkecil tampilan"
                aria-label="Perkecil tampilan"
                disabled={zoom <= 0.75}
                onClick={() => setZoom((v) => v - 0.25)}
              >
                <Minus />
              </button>
              <button
                title="Atur ulang kamera"
                aria-label="Atur ulang kamera"
                onClick={() => {
                  setPan({ x: 0, y: 0 });
                  setZoom(1);
                }}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                title="Perbesar tampilan"
                aria-label="Perbesar tampilan"
                disabled={zoom >= 1.75}
                onClick={() => setZoom((v) => v + 0.25)}
              >
                <Plus />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="stage-dpad">
              {(
                [
                  [ArrowLeft, 'ArrowLeft', 'Kiri'],
                  [ArrowUp, 'ArrowUp', 'Atas'],
                  [ArrowDown, 'ArrowDown', 'Bawah'],
                  [ArrowRight, 'ArrowRight', 'Kanan'],
                ] as const
              ).map(([Icon, key, label]) => (
                <button
                  key={key}
                  aria-label={`Gerak ${label.toLowerCase()}`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    runtime.current?.keys.add(key);
                  }}
                  onLostPointerCapture={() => runtime.current?.keys.delete(key)}
                >
                  <Icon />
                </button>
              ))}
            </div>
            <div className="stage-keys">
              <button onClick={() => runtime.current?.fire('key', 'Space')}>
                Spasi
              </button>
              {actors.some((a) =>
                a.rules.some((r) => r.trigger === 'key' && r.key === 'KeyE'),
              ) && (
                <button onClick={() => runtime.current?.fire('key', 'KeyE')}>
                  E
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="stage-caption">
        <span>
          <Scan />
          {playing
            ? 'Panah untuk bergerak · Spasi untuk aksi'
            : 'Kamera isometrik'}
        </span>
        {!playing && (
          <span className="stage-hint">
            {tool === 'select'
              ? 'Geser objek untuk memindahkannya.'
              : 'Seret panggung untuk menggeser kamera.'}
          </span>
        )}
        <span>
          <i className={playing ? 'playing' : ''} />
          {playing ? 'Simulasi berjalan' : 'Mode edit'}
        </span>
      </div>
    </section>
  );
}
