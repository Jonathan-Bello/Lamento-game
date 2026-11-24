// Todos los números de diseño en un solo lugar para ajustarlos en playtests.
// Las referencias (§) apuntan a secciones de docs/GDD.md.

export const PALETTE = {
  abismo: 0x050b1a,
  nocheDeRio: 0x0b1d3a,
  aguaProfunda: 0x123a63,
  azulNeblina: 0x2c5f8a,
  lunaFria: 0x6fa3c7,
  velo: 0xb8d8eb,
  aliento: 0xe6f3fa,
  veladora: 0xe8a84a,
  herida: 0x8c2f3a,
} as const;

/** Paso fijo de física (§12.4). */
export const FIXED_DT = 1 / 60;

/** Jugador (§5.2, §5.3). */
export const PLAYER = {
  width: 0.6,
  height: 1.4,
  walkSpeed: 3.5,
  runSpeed: 6.5,
  exhaustedSpeed: 2.6,
  waterSpeedMult: 0.7,
  groundAccel: 45,
  airAccel: 22,
  gravity: 32,
  maxFallSpeed: 22,
  jumpVelocity: 12.4, // altura máx ≈ v²/2g ≈ 2.4 m
  jumpCutVelocity: 4, // al soltar el salto antes de tiempo
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  staminaRunDrain: 0.18,
  staminaJumpCost: 0.06,
  staminaRegenMoving: 0.16,
  staminaRegenIdle: 0.3,
  staminaRecoverThreshold: 0.4,
  hardLandingSpeed: 15,
} as const;

/** Radios de ruido en metros (§5.4). */
export const NOISE = {
  walk: 2,
  run: 10,
  hardLanding: 14,
  water: 8,
  panting: 6,
  interval: 0.3,
} as const;

/** La Llorona (§6). */
export const LLORONA = {
  speed: { errante: 2, acecho: 4, persecucion: 5.5, busqueda: 3 },
  sightRange: 13,
  loseRange: 17,
  catchRange: 1.2,
  hearingMult: 1.5,
  lostTrailTime: 8,
  searchTime: 15,
  searchRadius: 6,
  teleportFarDistance: 60,
  teleportMin: 30,
  teleportMax: 40,
  teleportCooldown: 10,
  safeRadius: 5,
} as const;

/** Lamento Invertido (§4). */
export const LAMENTO = {
  maxDistance: 45, // DIST_MAX: d = clamp(dist / maxDistance, 0, 1)
  exponent: 1.6,
  panWidth: 15, // metros para paneo completo izquierda/derecha
} as const;

/** AI Director (§6.3). */
export const DIRECTOR = {
  maxChaseTime: 20, // persecución continua antes de dar respiro
  respiteTime: 12,
  calmTimeBeforeApproach: 35,
  respawnGrace: 8,
} as const;

/** Cámara 2.5D (§12.2). */
export const CAMERA = {
  fov: 32,
  distance: 18,
  chaseExtraDistance: 4,
  height: 2.2,
  lookAhead: 2.5,
  deadZoneX: 1.0,
  deadZoneY: 1.2,
  followLerp: 4,
} as const;
