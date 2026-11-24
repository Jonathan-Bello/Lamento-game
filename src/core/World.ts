import { DIRECTOR, LLORONA } from '../config';
import { Director } from '../enemy/Director';
import { Llorona } from '../enemy/Llorona';
import { Player } from '../player/Player';
import type { Level, Point } from '../world/level';
import type { InputState } from './Input';
import { dist2D } from './math';

export type WorldEvent =
  | { type: 'capture' }
  | { type: 'ofrenda'; index: number; first: boolean }
  | { type: 'noise'; x: number; y: number; radius: number; source: string };

/**
 * Simulación completa del juego, sin render ni audio.
 * Avanza en pasos fijos (§12.4) y devuelve eventos para que la capa de
 * presentación reaccione (sonidos, textos, fundidos).
 */
export class World {
  readonly player: Player;
  readonly llorona: Llorona;
  readonly director = new Director();
  lastOfrenda = 0;
  private visited = new Set<number>();

  constructor(readonly level: Level) {
    this.player = new Player(level.spawn.x, level.spawn.y);
    this.llorona = new Llorona(level, 0, 1);
    this.placeLloronaFarFrom(level.spawn);
    this.llorona.respite = DIRECTOR.respawnGrace;
    this.visited.add(0);
  }

  /** Distancia real jugador–Llorona (centro a centro). */
  get distance(): number {
    return dist2D(this.player.x, this.player.centerY, this.llorona.x, this.llorona.y);
  }

  isSafe(x: number, y: number): boolean {
    return this.level.ofrendas.some((o) => dist2D(x, y, o.x, o.y + 1) < LLORONA.safeRadius - 0.5);
  }

  step(dt: number, input: InputState, jumpPressed: boolean): WorldEvent[] {
    const events: WorldEvent[] = [];
    const p = this.player;

    p.update(dt, input, jumpPressed, this.level, (x, y, radius, source) => {
      this.llorona.hear(x, y, radius);
      events.push({ type: 'noise', x, y, radius, source });
    });

    // Caída fuera del mundo: vuelve a la ofrenda sin contar como captura
    if (p.body.y < -12) this.respawnPlayer();

    // Ofrendas: guardado + zona segura
    this.level.ofrendas.forEach((o, i) => {
      if (dist2D(p.x, p.body.y, o.x, o.y) < 1.8) {
        const first = !this.visited.has(i);
        if (first || this.lastOfrenda !== i) events.push({ type: 'ofrenda', index: i, first });
        this.visited.add(i);
        this.lastOfrenda = i;
      }
    });

    const safe = this.isSafe(p.x, p.centerY);
    const caught = this.llorona.update(dt, { x: p.x, y: p.centerY, facing: p.facing, safe });
    this.director.update(dt, this.llorona, p.x, p.centerY, p.facing, safe);
    if (caught) events.push({ type: 'capture' });
    return events;
  }

  /** Tras la captura: volver a la última ofrenda (§5.6). */
  respawnPlayer(): void {
    const o = this.level.ofrendas[this.lastOfrenda];
    this.player.respawn(o.x, o.y);
    this.placeLloronaFarFrom(o);
    this.llorona.respite = DIRECTOR.respawnGrace;
    this.director.reset();
  }

  private placeLloronaFarFrom(p: Point): void {
    const { x0, x1 } = this.level.bounds;
    // Del lado con más espacio, a ~45 m: empieza "lejos" (lamento fuerte)
    const dir = x1 - p.x > p.x - x0 ? 1 : -1;
    this.llorona.placeAt(p.x + dir * 45, 1);
    this.llorona.state = 'Errante';
  }
}
