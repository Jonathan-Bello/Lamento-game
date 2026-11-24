import { LLORONA } from '../config';
import { clamp, dist2D, randRange } from '../core/math';
import type { Level, Point } from '../world/level';

export type LloronaState = 'Errante' | 'Acecho' | 'Persecución' | 'Búsqueda' | 'Atrapar';

export interface PlayerSnapshot {
  x: number;
  y: number; // centro del cuerpo
  facing: 1 | -1;
  safe: boolean;
}

/**
 * IA de La Llorona (§6.1, §6.2). Flota: se mueve libremente en XY y atraviesa
 * plataformas y paredes delgadas. Nunca entra en el radio de una ofrenda.
 */
export class Llorona {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  state: LloronaState = 'Errante';
  stateTime = 0;
  /** Mientras sea > 0 no puede ver al jugador (respiro tras una captura o del Director). */
  respite = 0;

  private target: Point;
  private lostTimer = 0;
  private searchTimer = 0;
  private lastSeen: Point = { x: 0, y: 0 };
  private teleportCooldown = 0;

  constructor(
    private readonly level: Level,
    x: number,
    y: number,
  ) {
    this.x = this.prevX = x;
    this.y = this.prevY = y;
    this.target = this.randomPatrol();
  }

  /** Un ruido del jugador en (x, y) con cierto radio (§5.4). */
  hear(x: number, y: number, radius: number): void {
    if (this.state === 'Persecución' || this.state === 'Atrapar' || this.respite > 0) return;
    if (dist2D(this.x, this.y, x, y) > radius * LLORONA.hearingMult) return;
    this.setState('Acecho');
    this.target = { x, y };
    this.lostTimer = LLORONA.lostTrailTime;
  }

  /** El AI Director la manda a acercarse a un punto. */
  lure(x: number, y: number): void {
    if (this.state !== 'Errante') return;
    this.setState('Acecho');
    this.target = { x, y };
    this.lostTimer = LLORONA.lostTrailTime;
  }

  /** La aleja y le da un respiro al jugador. */
  retreat(px: number, awayDir: number, respite: number): void {
    this.placeAt(px + awayDir * 45, 1);
    this.setState('Errante');
    this.target = this.randomPatrol();
    this.respite = respite;
  }

  placeAt(x: number, y: number): void {
    const { x0, x1 } = this.level.bounds;
    this.x = this.prevX = clamp(x, x0 + 1, x1 - 1);
    this.y = this.prevY = y;
  }

  /** Devuelve true si atrapó al jugador en este paso. */
  update(dt: number, p: PlayerSnapshot): boolean {
    this.prevX = this.x;
    this.prevY = this.y;
    this.stateTime += dt;
    this.respite = Math.max(0, this.respite - dt);
    this.teleportCooldown -= dt;

    const d = dist2D(this.x, this.y, p.x, p.y);
    const sees = d < LLORONA.sightRange && !p.safe && this.respite <= 0;

    switch (this.state) {
      case 'Errante': {
        if (this.moveTo(this.target, LLORONA.speed.errante, dt)) this.target = this.randomPatrol();
        if (sees) this.startChase();
        // Teletransporte por niebla (§6.2): reaparece "lejos" para que primero se oiga fuerte.
        if (d > LLORONA.teleportFarDistance && this.teleportCooldown <= 0) {
          this.placeAt(p.x + p.facing * randRange(LLORONA.teleportMin, LLORONA.teleportMax), 1);
          this.teleportCooldown = LLORONA.teleportCooldown;
        }
        break;
      }
      case 'Acecho': {
        this.moveTo(this.target, LLORONA.speed.acecho, dt);
        this.lostTimer -= dt;
        if (sees) this.startChase();
        else if (this.lostTimer <= 0) this.setState('Errante');
        break;
      }
      case 'Persecución': {
        this.moveTo({ x: p.x, y: p.y + 0.3 }, LLORONA.speed.persecucion, dt);
        if (dist2D(this.x, this.y, p.x, p.y) < LLORONA.catchRange) {
          this.setState('Atrapar');
          return true;
        }
        if (p.safe || d > LLORONA.loseRange) {
          this.lastSeen = { x: p.x, y: p.y };
          this.searchTimer = LLORONA.searchTime;
          this.target = this.searchPoint();
          this.setState('Búsqueda');
        }
        break;
      }
      case 'Búsqueda': {
        if (this.moveTo(this.target, LLORONA.speed.busqueda, dt)) this.target = this.searchPoint();
        this.searchTimer -= dt;
        if (sees) this.startChase();
        else if (this.searchTimer <= 0) this.setState('Errante');
        break;
      }
      case 'Atrapar':
        break;
    }

    this.keepOutOfSafeZones();
    return false;
  }

  private startChase(): void {
    this.setState('Persecución');
  }

  private setState(s: LloronaState): void {
    if (this.state !== s) this.stateTime = 0;
    this.state = s;
  }

  /** Mueve hacia `t`; devuelve true al llegar. */
  private moveTo(t: Point, speed: number, dt: number): boolean {
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const len = Math.hypot(dx, dy);
    const step = speed * dt;
    if (len <= step) {
      this.x = t.x;
      this.y = t.y;
      return true;
    }
    this.x += (dx / len) * step;
    this.y += (dy / len) * step;
    this.y = Math.max(this.y, -0.8); // no se hunde bajo el agua del nivel
    return false;
  }

  private keepOutOfSafeZones(): void {
    for (const o of this.level.ofrendas) {
      const dx = this.x - o.x;
      const dy = this.y - (o.y + 1);
      const len = Math.hypot(dx, dy);
      if (len < LLORONA.safeRadius) {
        const nx = len > 1e-3 ? dx / len : 1;
        const ny = len > 1e-3 ? dy / len : 0;
        this.x = o.x + nx * LLORONA.safeRadius;
        this.y = o.y + 1 + ny * LLORONA.safeRadius;
      }
    }
  }

  private randomPatrol(): Point {
    const pts = this.level.patrol;
    return { ...pts[Math.floor(Math.random() * pts.length)] };
  }

  private searchPoint(): Point {
    return {
      x: this.lastSeen.x + randRange(-LLORONA.searchRadius, LLORONA.searchRadius),
      y: Math.max(0.5, this.lastSeen.y + randRange(-1, 2)),
    };
  }
}
