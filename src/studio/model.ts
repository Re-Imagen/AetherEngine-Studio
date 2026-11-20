// The stage is an orthographic X/Z plane. Height is independent of ground depth.
export type Point = { x: number; z: number };
export type AssetKind =
  | 'fox'
  | 'pine'
  | 'cottage'
  | 'crystal'
  | 'mushroom'
  | 'chest'
  | 'stone'
  | 'flowers';
export type Category = 'Karakter' | 'Alam' | 'Properti';
export type Trigger = 'key' | 'start' | 'click';
export type GameKey = 'Space' | 'KeyE';
export type Direction = 'right' | 'left' | 'up' | 'down';
export type Action =
  | { id: string; kind: 'jump'; height: number }
  | { id: string; kind: 'move'; direction: Direction; steps: number }
  | { id: string; kind: 'say'; text: string }
  | { id: string; kind: 'flip' };
export type Rule = {
  id: string;
  trigger: Trigger;
  key: GameKey;
  actions: Action[];
};
export interface Actor extends Point {
  id: string;
  kind: AssetKind;
  name: string;
  scale: number;
  visible: boolean;
  flipped: boolean;
  rules: Rule[];
}
export interface IslandProject {
  id: string;
  name: string;
  updated: number;
  actors: Actor[];
}
export interface Workspace {
  version: 1;
  current: string;
  projects: IslandProject[];
}

export const ASSETS: Record<
  AssetKind,
  { name: string; category: Category; tint: string }
> = {
  fox: { name: 'Miko', category: 'Karakter', tint: '#ffe2c5' },
  pine: { name: 'Pohon pinus', category: 'Alam', tint: '#d8e9d7' },
  cottage: { name: 'Pondok', category: 'Properti', tint: '#f8e2bd' },
  crystal: { name: 'Kristal', category: 'Alam', tint: '#e2dcf3' },
  mushroom: { name: 'Jamur', category: 'Alam', tint: '#f7dcd4' },
  chest: { name: 'Peti harta', category: 'Properti', tint: '#faeab9' },
  stone: { name: 'Batu lumut', category: 'Alam', tint: '#dce6ea' },
  flowers: { name: 'Bunga liar', category: 'Alam', tint: '#e1e9c9' },
};
export const assetKinds = Object.keys(ASSETS) as AssetKind[];
export const actionNames = {
  jump: 'Lompat',
  move: 'Melangkah',
  say: 'Bicara',
  flip: 'Balik arah',
} as const;
export const directionNames: Record<Direction, string> = {
  right: 'kanan',
  left: 'kiri',
  up: 'atas',
  down: 'bawah',
};
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
export const tenth = (v: number) => Math.round(v * 10) / 10;
export const projectPoint = (p: Point, height = 0) => ({
  x: 350 + (p.x - p.z) * 44,
  y: 176 + (p.x + p.z) * 17 - height * 36,
});
export const unprojectDelta = (dx: number, dy: number): Point => ({
  x: (dx / 44 + dy / 17) / 2,
  z: (dy / 17 - dx / 44) / 2,
});

// Clockwise boundary shared by rendering, authoring and play-mode movement.
export const coast: [number, number][] = [
  [-3.2, -2.4],
  [-2.6, -2.4],
  [-2.6, -3.1],
  [-1.1, -3.1],
  [-1.1, -3.5],
  [0.8, -3.5],
  [0.8, -3.2],
  [2.45, -3.2],
  [2.45, -2.65],
  [3.15, -2.65],
  [3.15, -1.2],
  [3.65, -1.2],
  [3.65, 0.75],
  [3.25, 0.75],
  [3.25, 2.15],
  [2.65, 2.15],
  [2.65, 2.85],
  [1.45, 2.85],
  [1.45, 3.45],
  [-0.35, 3.45],
  [-0.35, 3.15],
  [-1.9, 3.15],
  [-1.9, 2.65],
  [-2.85, 2.65],
  [-2.85, 1.3],
  [-3.55, 1.3],
  [-3.55, -0.65],
  [-3.2, -0.65],
];
export function onIsland(p: Point) {
  let inside = false;
  for (let i = 0, j = coast.length - 1; i < coast.length; j = i++) {
    const [ax, az] = coast[i],
      [bx, bz] = coast[j];
    if (
      az > p.z !== bz > p.z &&
      p.x < ((bx - ax) * (p.z - az)) / (bz - az) + ax
    )
      inside = !inside;
  }
  return inside;
}
export function newAction(kind: Action['kind']): Action {
  const id = uid();
  switch (kind) {
    case 'jump':
      return { id, kind, height: 1 };
    case 'move':
      return { id, kind, direction: 'right', steps: 1 };
    case 'say':
      return { id, kind, text: 'Halo, dunia!' };
    case 'flip':
      return { id, kind };
  }
}
export function newRule(
  trigger: Trigger = 'key',
  kind: Action['kind'] = 'jump',
): Rule {
  return { id: uid(), trigger, key: 'Space', actions: [newAction(kind)] };
}
export function newActor(kind: AssetKind, p: Point = { x: 0, z: 0 }): Actor {
  return {
    id: uid(),
    kind,
    name: ASSETS[kind].name,
    ...p,
    scale: 1,
    flipped: false,
    visible: true,
    rules: kind === 'fox' ? [newRule()] : [],
  };
}
export function newProject(
  name = 'Pulau Rimbun',
  starter = true,
): IslandProject {
  const add = (
    kind: AssetKind,
    x: number,
    z: number,
    scale = 1,
    label?: string,
  ) => ({
    ...newActor(kind, { x, z }),
    scale,
    name: label || ASSETS[kind].name,
  });
  const actors = starter
    ? [
        add('fox', 0.65, 1.1, 1),
        add('cottage', -1.4, -1.55, 1),
        add('pine', -2.6, 0.8, 1.12),
        add('crystal', 2.3, -0.8, 0.85),
        add('mushroom', -0.75, 2.45, 0.72),
        add('chest', 1, -1.5, 0.79),
        add('pine', -0.2, -2.95, 0.94, 'Pinus kecil'),
        add('stone', 2.35, 1.25, 0.79),
        add('flowers', 0.55, 2.55, 0.83),
      ]
    : [add('fox', 0, 0)];
  if (starter)
    actors[0].rules[0].actions.push({ id: uid(), kind: 'say', text: 'Hore!' });
  const chest = actors.find((a) => a.kind === 'chest');
  if (chest) chest.rules = [newRule('click', 'say')];
  return { id: uid(), name, updated: Date.now(), actors };
}
export const firstWorkspace = (): Workspace => {
  const project = newProject();
  return { version: 1, current: project.id, projects: [project] };
};
export function spawnPoint(actors: Actor[]): Point {
  for (let i = 0; i < 120; i++) {
    const angle = i * 2.39996,
      r = 0.24 * Math.sqrt(i);
    const p = { x: tenth(Math.cos(angle) * r), z: tenth(Math.sin(angle) * r) };
    if (
      onIsland(p) &&
      actors.every((a) => !a.visible || Math.hypot(a.x - p.x, a.z - p.z) > 0.64)
    )
      return p;
  }
  return { x: 0, z: 0 };
}
