import { NOISE, PLAYER } from '../config';
import { approach } from '../core/math';
import type { InputState } from '../core/Input';
import { bodyBox, moveAndCollide, overlaps, type Body } from '../physics/aabb';
import type { Level } from '../world/level';

export type NoiseEmitter = (x: number, y: number, radius: number, source: string) => void;

/**
 * Controlador de Itzel (§5.2 – §5.4). Lógica pura: no sabe nada de Three.js,
 * por eso se puede probar en Node sin navegador.
 */
export class Player {
  readonly body: Body;
  prevX: number;
  prevY: number;
  facing: 1 | -1 = 1;
  stamina = 1;
  exhausted = false;
  running = false;
  inWater = false;
  /** Último radio de ruido emitido (para HUD / depuración). */
  lastNoise = 0;

  private coyote = 0;
  private buffer = 0;
  private noiseTimer = 0;

  constructor(x: number, y: number) {
    this.body = { x, y, w: PLAYER.width, h: PLAYER.height, vx: 0, vy: 0, grounded: false };
    this.prevX = x;
    this.prevY = y;
  }

  get x(): number {
    return this.body.x;
  }
  /** Centro del cuerpo (lo que mide la distancia a La Llorona). */
  get centerY(): number {
    return this.body.y + this.body.h / 2;
  }

  respawn(x: number, y: number): void {
    Object.assign(this.body, { x, y, vx: 0, vy: 0, grounded: false });
    this.prevX = x;
    this.prevY = y;
    this.stamina = 1;
    this.exhausted = false;
    this.coyote = this.buffer = 0;
  }

  update(dt: number, input: InputState, jumpPressed: boolean, level: Level, emit: NoiseEmitter): void {
    const b = this.body;
    this.prevX = b.x;
    this.prevY = b.y;

    // --- Ventanas de tolerancia del salto ---
    this.buffer = jumpPressed ? PLAYER.jumpBuffer : this.buffer - dt;
    this.coyote = b.grounded ? PLAYER.coyoteTime : this.coyote - dt;

    // --- Movimiento horizontal ---
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir !== 0) this.facing = dir > 0 ? 1 : -1;
    const wantsRun = input.run && dir !== 0 && !this.exhausted;
    let maxSpeed: number = wantsRun ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (this.exhausted) maxSpeed = PLAYER.exhaustedSpeed;
    this.inWater = level.water.some((w) => overlaps(bodyBox(b), w));
    if (this.inWater) maxSpeed *= PLAYER.waterSpeedMult;
    const accel = b.grounded ? PLAYER.groundAccel : PLAYER.airAccel;
    b.vx = approach(b.vx, dir * maxSpeed, accel * dt);

    // --- Salto con coyote time, jump buffer y altura variable ---
    if (this.buffer > 0 && this.coyote > 0) {
      b.vy = PLAYER.jumpVelocity;
      this.buffer = 0;
      this.coyote = 0;
      this.stamina = Math.max(0, this.stamina - PLAYER.staminaJumpCost);
    }
    if (!input.jumpHeld && b.vy > PLAYER.jumpCutVelocity) b.vy = PLAYER.jumpCutVelocity;

    b.vy = Math.max(b.vy - PLAYER.gravity * dt, -PLAYER.maxFallSpeed);
    const fallSpeed = -b.vy;

    const hit = moveAndCollide(b, dt, level.solids, level.platforms);
    if (hit.landed && fallSpeed > PLAYER.hardLandingSpeed) {
      emit(b.x, b.y, NOISE.hardLanding, 'aterrizaje');
      this.lastNoise = NOISE.hardLanding;
    }

    // --- Aliento (§5.3) ---
    const moving = Math.abs(b.vx) > 0.3;
    this.running = wantsRun && Math.abs(b.vx) > PLAYER.walkSpeed + 0.2;
    if (this.running) this.stamina -= PLAYER.staminaRunDrain * dt;
    else this.stamina += (moving ? PLAYER.staminaRegenMoving : PLAYER.staminaRegenIdle) * dt;
    this.stamina = Math.min(1, this.stamina);
    if (this.stamina <= 0) {
      this.stamina = 0;
      this.exhausted = true;
    } else if (this.exhausted && this.stamina >= PLAYER.staminaRecoverThreshold) {
      this.exhausted = false;
    }

    // --- Ruido (§5.4) ---
    this.noiseTimer -= dt;
    if (this.noiseTimer <= 0) {
      this.noiseTimer = NOISE.interval;
      let r = 0;
      let src = '';
      if (moving && b.grounded) {
        r = NOISE.walk;
        src = 'pasos';
      }
      if (this.running && b.grounded) {
        r = NOISE.run;
        src = 'correr';
      }
      if (moving && this.inWater && r < NOISE.water) {
        r = NOISE.water;
        src = 'charco';
      }
      if (this.exhausted && r < NOISE.panting) {
        r = NOISE.panting;
        src = 'jadeo';
      }
      if (r > 0) emit(b.x, this.centerY, r, src);
      this.lastNoise = r;
    }
  }
}
