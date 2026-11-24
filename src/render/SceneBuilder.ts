import * as THREE from 'three';
import { PALETTE } from '../config';
import type { AABB } from '../physics/aabb';
import type { Level } from '../world/level';

export interface WorldView {
  scene: THREE.Scene;
  fog: THREE.FogExp2;
  moonLight: THREE.DirectionalLight;
  ofrendaLights: THREE.PointLight[];
  waterMaterial: THREE.MeshStandardMaterial;
  backgroundGhost: THREE.Mesh;
}

const BASE_FOG = 0.028;

/**
 * Construye la escena 3D a partir del nivel 2D, en tres capas de profundidad (§8.3):
 * fondo (Z −20 a −5), juego (Z = 0) y frente (Z +2 a +6).
 */
export function buildWorld(level: Level): WorldView {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.nocheDeRio);
  const fog = new THREE.FogExp2(PALETTE.nocheDeRio, BASE_FOG);
  scene.fog = fog;

  // --- Luces: luna fría + cielo azul tenue ---
  scene.add(new THREE.HemisphereLight(PALETTE.lunaFria, PALETTE.abismo, 1.1));
  const moonLight = new THREE.DirectionalLight(PALETTE.lunaFria, 1.8);
  moonLight.position.set(-20, 30, 25);
  scene.add(moonLight);

  // --- Capa de juego (Z = 0) ---
  const groundMat = new THREE.MeshStandardMaterial({ color: PALETTE.aguaProfunda, roughness: 0.95 });
  const platformMat = new THREE.MeshStandardMaterial({ color: PALETTE.azulNeblina, roughness: 0.85 });
  const addBox = (b: AABB, mat: THREE.Material, depth: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, b.y1 - b.y0, depth), mat);
    m.position.set((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0);
    scene.add(m);
  };
  level.solids.forEach((b) => addBox(b, groundMat, 6));
  level.platforms.forEach((b) => addBox(b, platformMat, 2.5));

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.aguaProfunda,
    emissive: PALETTE.azulNeblina,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.75,
    roughness: 0.1,
    metalness: 0.3,
  });
  for (const w of level.water) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w.x1 - w.x0, w.y1 - w.y0, 6), waterMaterial);
    m.position.set((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, 0);
    scene.add(m);
  }
  // Río al fondo, a lo largo de todo el nivel
  const river = new THREE.Mesh(new THREE.PlaneGeometry(level.bounds.x1 - level.bounds.x0 + 80, 30), waterMaterial);
  river.rotation.x = -Math.PI / 2;
  river.position.set((level.bounds.x0 + level.bounds.x1) / 2, -0.6, -18);
  scene.add(river);

  // --- Ofrendas: la única luz cálida del juego (§9.2) ---
  const ofrendaLights: THREE.PointLight[] = [];
  const candleMat = new THREE.MeshStandardMaterial({
    color: PALETTE.veladora,
    emissive: PALETTE.veladora,
    emissiveIntensity: 2,
  });
  const altarMat = new THREE.MeshStandardMaterial({ color: 0x1b2a40, roughness: 1 });
  for (const o of level.ofrendas) {
    const altar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1), altarMat);
    altar.position.set(o.x, o.y + 0.4, -1.2);
    scene.add(altar);
    for (let i = -1; i <= 1; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8), candleMat);
      c.position.set(o.x + i * 0.45, o.y + 0.93, -1.2);
      scene.add(c);
    }
    const light = new THREE.PointLight(PALETTE.veladora, 28, 10, 1.6);
    light.position.set(o.x, o.y + 1.4, -0.4);
    scene.add(light);
    ofrendaLights.push(light);
  }

  // --- Capa de fondo ---
  const hillMat = new THREE.MeshStandardMaterial({ color: PALETTE.nocheDeRio, roughness: 1 });
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x0a1830, roughness: 1 });
  const rng = mulberry32(7);
  for (let x = level.bounds.x0 - 30; x < level.bounds.x1 + 30; x += 14) {
    const h = 6 + rng() * 10;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(10 + rng() * 6, h, 5), hillMat);
    hill.position.set(x + rng() * 6, h / 2 - 2, -24 - rng() * 6);
    scene.add(hill);
  }
  for (let x = level.bounds.x0 - 10; x < level.bounds.x1 + 10; x += 3.5 + rng() * 4) {
    const z = -6 - rng() * 7;
    const h = 4 + rng() * 5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, h, 5), treeMat);
    trunk.position.set(x, h / 2 - 0.5, z);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1 + rng(), h * 0.7, 6), treeMat);
    crown.position.set(x, h - 0.2, z);
    scene.add(trunk, crown);
  }
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(3, 24, 16),
    new THREE.MeshBasicMaterial({ color: PALETTE.velo, fog: false }),
  );
  moon.position.set(40, 28, -60);
  scene.add(moon);

  // Silueta de La Llorona errante a lo lejos: se ve pasar sin llegar al plano de juego.
  const backgroundGhost = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 2.6, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: PALETTE.velo, transparent: true, opacity: 0.35 }),
  );
  backgroundGhost.position.set(level.bounds.x0, 0.9, -15);
  scene.add(backgroundGhost);

  // --- Capa frontal: carrizos que tapan parte de la vista (§8.3) ---
  const reedMat = new THREE.MeshStandardMaterial({ color: PALETTE.abismo, roughness: 1 });
  for (let x = level.bounds.x0; x < level.bounds.x1; x += 1.2 + rng() * 5) {
    const clump = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < clump; i++) {
      const h = 1.5 + rng() * 2.5;
      const reed = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, 0.06), reedMat);
      reed.position.set(x + rng() * 0.8, h / 2 - 0.3, 3 + rng() * 3);
      reed.rotation.z = (rng() - 0.5) * 0.25;
      scene.add(reed);
    }
  }

  return { scene, fog, moonLight, ofrendaLights, waterMaterial, backgroundGhost };
}

export function setFogCloseness(fog: THREE.FogExp2, closeness: number): void {
  fog.density = BASE_FOG + 0.02 * closeness;
}

/** PRNG determinista para que el escenario sea igual en cada carga. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
