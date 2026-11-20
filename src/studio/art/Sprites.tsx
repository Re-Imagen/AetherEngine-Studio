import { ASSETS, type AssetKind } from '../model';
import fox from './sprites/fox.webp';
import pine from './sprites/pine.webp';
import cottage from './sprites/cottage.webp';
import crystal from './sprites/crystal.webp';
import mushroom from './sprites/mushroom.webp';
import chest from './sprites/chest.webp';
import stone from './sprites/stone.webp';
import flowers from './sprites/flowers.webp';

// Each painting is anchored at the object's feet (0, 0), not at its center.
const frames: Record<
  AssetKind,
  { url: string; x: number; y: number; w: number; h: number }
> = {
  fox: { url: fox, x: -43, y: -66, w: 64, h: 68 },
  pine: { url: pine, x: -45, y: -114, w: 86, h: 117 },
  cottage: { url: cottage, x: -62, y: -114, w: 128, h: 124 },
  crystal: { url: crystal, x: -28, y: -62, w: 54, h: 67 },
  mushroom: { url: mushroom, x: -24, y: -42, w: 41, h: 47 },
  chest: { url: chest, x: -29, y: -46, w: 57, h: 51 },
  stone: { url: stone, x: -32, y: -31, w: 62, h: 39 },
  flowers: { url: flowers, x: -21, y: -35, w: 40, h: 39 },
};
export function Sprite({ kind }: { kind: AssetKind }) {
  const { url, x, y, w, h } = frames[kind];
  return (
    <image
      href={url}
      x={x}
      y={y}
      width={w}
      height={h}
      preserveAspectRatio="none"
    />
  );
}
export function AssetArt({
  kind,
  className = '',
}: {
  kind: AssetKind;
  className?: string;
}) {
  const { x, y, w, h } = frames[kind];
  const pad = Math.max(w, h) * 0.065;
  return (
    <svg
      className={className}
      viewBox={`${x - pad} ${y - pad} ${w + 2 * pad} ${h + 2 * pad}`}
      aria-hidden="true"
    >
      <ellipse
        cx="0"
        cy={y + h - 1.5}
        rx={w * 0.37}
        ry={Math.max(2, h * 0.037)}
        fill="#55573e"
        opacity=".14"
      />
      <Sprite kind={kind} />
    </svg>
  );
}
export function AssetIcon({ kind }: { kind: AssetKind }) {
  return (
    <span className="asset-mini" style={{ backgroundColor: ASSETS[kind].tint }}>
      <AssetArt kind={kind} />
    </span>
  );
}
export function StudioMark() {
  return (
    <svg viewBox="0 0 42 42" aria-hidden="true" className="studio-mark">
      <rect
        x="2"
        y="2.5"
        width="37"
        height="37"
        rx="10"
        fill="#fb9765"
        stroke="#37362f"
        strokeWidth="2.2"
      />
      <g stroke="#363830" strokeWidth="1.7" strokeLinejoin="round">
        <path d="m9 25 12-6 12 6-12 6Z" fill="#dce3ae" />
        <path d="m9 21 12-6 12 6-12 6Z" fill="#fff4cf" />
        <path d="m9 17 12-6 12 6-12 6Z" fill="#fff5dc" />
      </g>
    </svg>
  );
}
