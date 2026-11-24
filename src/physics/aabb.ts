/**
 * Colisiones AABB 2D propias en el plano XY (§12.1).
 * Toda la jugabilidad ocurre en Z = 0; el 3D es solo presentación.
 */

export interface AABB {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Cuerpo dinámico. (x, y) es el centro de los pies. */
export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  grounded: boolean;
}

export const bodyBox = (b: Body, dx = 0, dy = 0): AABB => ({
  x0: b.x - b.w / 2 + dx,
  y0: b.y + dy,
  x1: b.x + b.w / 2 + dx,
  y1: b.y + b.h + dy,
});

export const overlaps = (a: AABB, b: AABB): boolean =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export const containsPoint = (a: AABB, x: number, y: number): boolean =>
  x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1;

const EPS = 1e-4;

export interface MoveResult {
  hitWall: boolean;
  landed: boolean;
  hitCeiling: boolean;
}

/**
 * Mueve el cuerpo eje por eje (primero X, luego Y) y resuelve contra sólidos estáticos.
 * Con velocidad máxima 22 m/s a 60 Hz el paso es < 0.4 m, menor que el grosor mínimo de
 * plataforma (0.5 m), así que no hay túneles.
 */
export function moveAndCollide(
  body: Body,
  dt: number,
  solids: readonly AABB[],
  platforms: readonly AABB[] = [],
): MoveResult {
  const result: MoveResult = { hitWall: false, landed: false, hitCeiling: false };
  const wasGrounded = body.grounded;

  // Eje X
  const dx = body.vx * dt;
  if (dx !== 0) {
    body.x += dx;
    for (const s of solids) {
      if (!overlaps(bodyBox(body), s)) continue;
      body.x = dx > 0 ? s.x0 - body.w / 2 - EPS : s.x1 + body.w / 2 + EPS;
      body.vx = 0;
      result.hitWall = true;
    }
  }

  // Eje Y
  const dy = body.vy * dt;
  const prevY = body.y;
  body.grounded = false;
  if (dy !== 0) {
    body.y += dy;
    // Plataformas de un sentido: solo si veníamos desde arriba y vamos cayendo.
    if (dy < 0) {
      for (const p of platforms) {
        if (prevY >= p.y1 - EPS && overlaps(bodyBox(body), p)) {
          body.y = p.y1;
          body.vy = 0;
          body.grounded = true;
        }
      }
    }
    for (const s of solids) {
      if (!overlaps(bodyBox(body), s)) continue;
      if (dy < 0) {
        body.y = s.y1;
        body.grounded = true;
      } else {
        body.y = s.y0 - body.h - EPS;
        result.hitCeiling = true;
      }
      body.vy = 0;
    }
  }

  // Sonda: ¿hay suelo justo debajo? (cubre el caso vy = 0)
  if (!body.grounded) {
    const probe = bodyBox(body, 0, -0.02);
    const onTop = (s: AABB) => overlaps(probe, s) && body.y >= s.y1 - 0.02;
    body.grounded = solids.some(onTop) || (body.vy <= 0 && platforms.some(onTop));
  }

  result.landed = body.grounded && !wasGrounded;
  return result;
}
