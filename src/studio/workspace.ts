import {
  actionNames,
  assetKinds,
  directionNames,
  firstWorkspace,
  newProject,
  onIsland,
} from './model.ts';
import type { Action, Actor, IslandProject, Workspace } from './model.ts';

export const STORAGE_KEY = 'aether:island-studio:v1';
const obj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object';
const numeric = (v: unknown, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
function validAction(v: unknown): v is Action {
  if (
    !obj(v) ||
    typeof v.id !== 'string' ||
    typeof v.kind !== 'string' ||
    !Object.hasOwn(actionNames, v.kind)
  )
    return false;
  return v.kind === 'jump'
    ? numeric(v.height, 0.5, 3)
    : v.kind === 'move'
      ? numeric(v.steps, 1, 4) &&
        typeof v.direction === 'string' &&
        Object.hasOwn(directionNames, v.direction)
      : v.kind === 'say'
        ? typeof v.text === 'string'
        : true;
}
function validActor(v: unknown): v is Actor {
  return (
    obj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    assetKinds.some((k) => k === v.kind) &&
    typeof v.x === 'number' &&
    typeof v.z === 'number' &&
    onIsland({ x: v.x, z: v.z }) &&
    numeric(v.scale, 0.5, 1.6) &&
    typeof v.flipped === 'boolean' &&
    typeof v.visible === 'boolean' &&
    Array.isArray(v.rules) &&
    v.rules.every(
      (r) =>
        obj(r) &&
        typeof r.id === 'string' &&
        ['start', 'key', 'click'].includes(String(r.trigger)) &&
        (r.key === 'Space' || r.key === 'KeyE') &&
        Array.isArray(r.actions) &&
        r.actions.every(validAction),
    )
  );
}
export function validProject(v: unknown): v is IslandProject {
  return (
    obj(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.updated === 'number' &&
    Array.isArray(v.actors) &&
    v.actors.every(validActor) &&
    new Set(v.actors.map((a) => a.id)).size === v.actors.length
  );
}
export function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (
        obj(v) &&
        v.version === 1 &&
        typeof v.current === 'string' &&
        Array.isArray(v.projects) &&
        v.projects.every(validProject) &&
        v.projects.some((p) => p.id === v.current)
      )
        return v as unknown as Workspace;
    }
  } catch {
    /* Private browsing or an older/invalid document. */
  }
  return firstWorkspace();
}
export interface EditorState {
  library: Workspace;
  past: IslandProject[];
  future: IslandProject[];
}
export const initialEditor = (): EditorState => ({
  library: loadWorkspace(),
  past: [],
  future: [],
});
export type Edit = (project: IslandProject) => IslandProject;
export type Operation =
  | { type: 'edit'; apply: Edit }
  | { type: 'undo' | 'redo' }
  | { type: 'open'; id: string }
  | { type: 'new'; name: string; starter: boolean };
export function editorReducer(state: EditorState, op: Operation): EditorState {
  const lib = state.library;
  const p = lib.projects.find((v) => v.id === lib.current)!;
  const replace = (doc: IslandProject): Workspace => ({
    ...lib,
    projects: lib.projects.map((v) =>
      v.id === p.id ? { ...doc, updated: Date.now() } : v,
    ),
  });
  if (op.type === 'open')
    return op.id !== lib.current && lib.projects.some((v) => v.id === op.id)
      ? { library: { ...lib, current: op.id }, past: [], future: [] }
      : state;
  if (op.type === 'new') {
    const doc = newProject(op.name, op.starter);
    return {
      library: { ...lib, current: doc.id, projects: [...lib.projects, doc] },
      past: [],
      future: [],
    };
  }
  if (op.type === 'edit') {
    const next = op.apply(p);
    return next === p
      ? state
      : {
          library: replace(next),
          past: [...state.past.slice(-49), p],
          future: [],
        };
  }
  if (op.type === 'undo' && state.past.length)
    return {
      library: replace(state.past.at(-1)!),
      past: state.past.slice(0, -1),
      future: [...state.future, p],
    };
  if (op.type === 'redo' && state.future.length)
    return {
      library: replace(state.future.at(-1)!),
      past: [...state.past, p],
      future: state.future.slice(0, -1),
    };
  return state;
}
