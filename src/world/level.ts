import type { AABB } from '../physics/aabb';

export interface Point {
  x: number;
  y: number;
}

export interface Level {
  name: string;
  bounds: { x0: number; x1: number };
  spawn: Point;
  /** Suelo y muros: bloquean por todos lados. */
  solids: AABB[];
  /** Plataformas de un solo sentido: se atraviesan desde abajo y se pisan desde arriba. */
  platforms: AABB[];
  /** Agua poco profunda: frena al jugador, hace ruido y La Llorona puede salir de ahí. */
  water: AABB[];
  /** Ofrendas: puntos de guardado y zonas seguras (§3.3, §6.3). */
  ofrendas: Point[];
  /** Puntos de patrulla de La Llorona, cerca del agua (§6.1). */
  patrol: Point[];
}

const box = (x0: number, y0: number, x1: number, y1: number): AABB => ({ x0, y0, x1, y1 });

/**
 * M0 — "Sala gris": un tramo largo de La Orilla para probar movimiento, persecución
 * y el Lamento Invertido. Mide ~140 m para que existan todas las distancias del §4.1.
 */
export const LA_ORILLA_GRIS: Level = {
  name: 'La Orilla (prototipo gris)',
  bounds: { x0: -10, x1: 130 },
  spawn: { x: 2, y: 0 },
  solids: [
    // Muros de los extremos
    box(-12, -6, -10, 20),
    box(130, -6, 132, 20),
    // Suelo A (inicio y primera ofrenda)
    box(-10, -6, 30, 0),
    // Charco 1 (30–36): piso hundido
    box(30, -6, 36, -1),
    // Suelo B
    box(36, -6, 70, 0),
    box(64, 0, 65, 1.6), // escalón / obstáculo bajo
    // Suelo C (segunda ofrenda)
    box(70, -6, 90, 0),
    // Charco 2 (90–96)
    box(90, -6, 96, -1),
    // Suelo D
    box(96, -6, 130, 0),
  ],
  platforms: [
    box(12, 1.5, 16, 2),
    box(18, 3.3, 22, 3.8),
    box(24, 2, 27, 2.5),
    box(42, 1.5, 46, 2),
    box(50, 3.3, 54, 3.8),
    box(57, 5, 62, 5.5),
    box(80, 1.5, 84, 2),
    box(100, 1.3, 103, 1.8),
    box(105, 3.1, 108, 3.6),
    box(110, 4.9, 114, 5.4),
    box(117, 2.5, 121, 3),
  ],
  water: [box(30, -1, 36, -0.25), box(90, -1, 96, -0.25)],
  ofrendas: [
    { x: 2, y: 0 },
    { x: 76, y: 0 },
  ],
  patrol: [
    { x: 33, y: 0.6 },
    { x: 48, y: 1.2 },
    { x: 60, y: 1.0 },
    { x: 93, y: 0.6 },
    { x: 108, y: 1.2 },
    { x: 124, y: 1.0 },
  ],
};
