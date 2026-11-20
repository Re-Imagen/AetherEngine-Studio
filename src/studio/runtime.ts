import { onIsland } from './model.ts';
import type { Action, Actor, Direction, GameKey, Trigger } from './model.ts';

export interface Pose {
  x: number;
  z: number;
  height: number;
  flipped: boolean;
  message: string;
}
interface Task {
  action: Action;
  elapsed: number;
  fromX: number;
  fromZ: number;
}
interface Body extends Pose {
  queue: Action[];
  task?: Task;
}
const vectors: Record<Direction, [number, number]> = {
  right: [1, -1],
  left: [-1, 1],
  up: [-1, -1],
  down: [1, 1],
};

/** Each play session interprets data blocks on transient bodies, never on the authored actors. */
export class IslandRuntime {
  readonly bodies = new Map<string, Body>();
  readonly keys = new Set<string>();
  readonly player?: Actor;
  private actors: Actor[];
  constructor(actors: Actor[]) {
    this.actors = actors.filter((a) => a.visible);
    for (const a of this.actors)
      this.bodies.set(a.id, {
        x: a.x,
        z: a.z,
        height: 0,
        flipped: a.flipped,
        message: '',
        queue: [],
      });
    this.player = this.actors.find((a) => a.kind === 'fox');
    this.fire('start');
  }
  fire(trigger: Trigger, key?: GameKey, target?: string) {
    for (const a of this.actors) {
      if (target && a.id !== target) continue;
      const body = this.bodies.get(a.id)!;
      for (const rule of a.rules) {
        if (
          rule.trigger === trigger &&
          (trigger !== 'key' || rule.key === key) &&
          body.queue.length < 64
        )
          body.queue.push(...rule.actions);
      }
    }
  }
  private move(body: Body, dx: number, dz: number) {
    const next = { x: body.x + dx, z: body.z + dz };
    if (onIsland(next)) Object.assign(body, next);
  }
  tick(seconds: number) {
    const dt = Math.min(0.05, Math.max(0, seconds));
    if (this.player) {
      const b = this.bodies.get(this.player.id)!;
      const held = (a: string, k: string) =>
        Number(this.keys.has(a) || this.keys.has(k));
      const dx = held('ArrowRight', 'KeyD') - held('ArrowLeft', 'KeyA');
      const dy = held('ArrowDown', 'KeyS') - held('ArrowUp', 'KeyW');
      if (dx || dy) {
        const step = (dt * 1.9) / Math.hypot(dx, dy);
        this.move(b, (dx + dy) * step, (dy - dx) * step);
        if (dx) b.flipped = dx < 0;
      }
    }
    for (const b of this.bodies.values()) {
      if (!b.task) {
        const action = b.queue.shift();
        if (!action) continue;
        b.task = { action, elapsed: 0, fromX: b.x, fromZ: b.z };
      }
      const task = b.task;
      const a = task.action;
      task.elapsed += dt;
      let duration = 0;
      if (a.kind === 'jump') {
        duration = 0.65;
        const t = Math.min(1, task.elapsed / duration);
        b.height = 4 * a.height * t * (1 - t);
      } else if (a.kind === 'move') {
        duration = 0.42 * a.steps;
        const [vx, vz] = vectors[a.direction];
        const dist = Math.min(a.steps, task.elapsed / 0.42) / Math.SQRT2;
        this.move(
          b,
          task.fromX + vx * dist - b.x,
          task.fromZ + vz * dist - b.z,
        );
        if (a.direction === 'right' || a.direction === 'left')
          b.flipped = a.direction === 'left';
      } else if (a.kind === 'say') {
        duration = 2.1;
        b.message = a.text;
      } else if (a.kind === 'flip') b.flipped = !b.flipped;
      if (task.elapsed >= duration) {
        b.height = 0;
        b.message = '';
        b.task = undefined;
      }
    }
  }
}
