import test from 'node:test';
import assert from 'node:assert/strict';
import {
  firstWorkspace,
  newAction,
  newActor,
  newProject,
  newRule,
  onIsland,
  projectPoint,
  spawnPoint,
  unprojectDelta,
} from '../src/studio/model.ts';
import { IslandRuntime } from '../src/studio/runtime.ts';
import { editorReducer, validProject } from '../src/studio/workspace.ts';

const advance = (sim, frames) => {
  for (let i = 0; i < frames; i++) sim.tick(1 / 60);
};

test('isometric picking inverts ground projection; elevation does not move the contact point', () => {
  const a = { x: -1.2, z: 0.8 },
    b = { x: 0.7, z: 1.1 };
  const start = projectPoint(a),
    end = projectPoint(b);
  const delta = unprojectDelta(end.x - start.x, end.y - start.y);
  assert.ok(
    Math.abs(a.x + delta.x - b.x) < 1e-9 &&
      Math.abs(a.z + delta.z - b.z) < 1e-9,
  );
  const high = projectPoint(b, 2);
  assert.equal(high.x, end.x);
  assert.ok(high.y < end.y);
});

test('starter objects and newly placed objects are on the playable ground', () => {
  for (const starter of [false, true]) {
    const p = newProject('Kebun', starter);
    assert.ok(validProject(p));
    assert.ok(p.actors.every(onIsland));
    const at = spawnPoint(p.actors);
    assert.ok(onIsland(at));
    assert.ok(p.actors.every((a) => Math.hypot(at.x - a.x, at.z - a.z) > 0.64));
  }
  assert.equal(onIsland({ x: 9, z: -9 }), false);
});

test('the starter interprets its key blocks in order on a separate play state', () => {
  const p = newProject();
  const before = structuredClone(p);
  const sim = new IslandRuntime(p.actors);
  const actor = sim.bodies.get(p.actors[0].id);
  sim.fire('key', 'KeyE');
  advance(sim, 2);
  assert.equal(actor.height, 0);
  sim.fire('key', 'Space');
  advance(sim, 18);
  assert.ok(actor.height > 0.9);
  assert.equal(actor.message, '');
  advance(sim, 28);
  assert.equal(actor.height, 0);
  assert.equal(actor.message, 'Hore!');
  advance(sim, 155);
  assert.equal(actor.message, '');
  assert.deepEqual(p, before);
});

test('start, key and object-tap rules only run matching programs; hidden actors do not run', () => {
  const a = newActor('fox'),
    b = newActor('chest'),
    hidden = newActor('pine');
  a.rules = [newRule('start', 'move')];
  b.rules = [
    newRule('click', 'flip'),
    { ...newRule('key', 'jump'), key: 'KeyE' },
  ];
  hidden.visible = false;
  const sim = new IslandRuntime([a, b, hidden]);
  advance(sim, 30);
  const player = sim.bodies.get(a.id),
    chest = sim.bodies.get(b.id);
  assert.ok(player.x > 0.6 && player.z < -0.6);
  assert.equal(sim.bodies.has(hidden.id), false);
  sim.fire('click', undefined, a.id);
  advance(sim, 1);
  assert.equal(chest.flipped, false);
  sim.fire('click', undefined, b.id);
  advance(sim, 1);
  assert.equal(chest.flipped, true);
  sim.fire('key', 'KeyE');
  advance(sim, 10);
  assert.ok(chest.height > 0 && player.height === 0);
});

test('movement stays on the island and stopping/restarting restores authored poses', () => {
  const a = newActor('fox');
  const sim = new IslandRuntime([a]);
  sim.keys.add('ArrowRight');
  advance(sim, 240);
  const moved = sim.bodies.get(a.id);
  assert.ok(onIsland(moved));
  assert.notEqual(moved.x, a.x);
  const fresh = new IslandRuntime([a]).bodies.get(a.id);
  assert.deepEqual(
    [fresh.x, fresh.z, fresh.height, fresh.flipped],
    [a.x, a.z, 0, false],
  );
});

test('block edits take part in undo and redo and histories never cross projects', () => {
  let state = { library: firstWorkspace(), past: [], future: [] };
  const original = structuredClone(state.library.projects[0]);
  state = editorReducer(state, {
    type: 'edit',
    apply: (p) => ({
      ...p,
      actors: p.actors.map((a, i) =>
        i
          ? a
          : {
              ...a,
              rules: [{ ...newRule('click'), actions: [newAction('flip')] }],
            },
      ),
    }),
  });
  const edited = structuredClone(state.library.projects[0]);
  state = editorReducer(state, { type: 'undo' });
  assert.deepEqual(state.library.projects[0].actors, original.actors);
  state = editorReducer(state, { type: 'redo' });
  assert.deepEqual(state.library.projects[0].actors, edited.actors);
  state = editorReducer(state, {
    type: 'new',
    name: 'Pulau uji',
    starter: false,
  });
  assert.notEqual(state.library.current, original.id);
  assert.deepEqual([state.past.length, state.future.length], [0, 0]);
  state = editorReducer(state, { type: 'open', id: original.id });
  assert.deepEqual(state.library.projects[0].actors, edited.actors);
  assert.deepEqual(
    state.library.projects[1].actors.map((a) => a.kind),
    ['fox'],
  );
});

test('serialized projects round-trip; incomplete or unrecognized instructions are rejected', () => {
  const p = newProject('Pulau 🌱');
  assert.ok(validProject(JSON.parse(JSON.stringify(p))));
  assert.equal(validProject(null), false);
  assert.equal(validProject({ ...p, actors: [null] }), false);
  p.actors[0].rules[0].actions[0] = { id: 'bad', kind: 'unknown' };
  assert.equal(validProject(p), false);
});
