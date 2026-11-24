import * as THREE from 'three';
import { PALETTE, PLAYER } from '../config';

/** Itzel: silueta pequeña y clara, con rebozo, que se lee contra el fondo oscuro (§9.3). */
export class PlayerView {
  readonly group = new THREE.Group();
  private body: THREE.Mesh;
  private light: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    const dress = new THREE.MeshStandardMaterial({ color: PALETTE.aliento, roughness: 0.7 });
    const rebozo = new THREE.MeshStandardMaterial({ color: PALETTE.lunaFria, roughness: 0.9 });
    this.body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, PLAYER.height * 0.68, 10), dress);
    this.body.position.y = PLAYER.height * 0.34;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), dress);
    head.position.y = PLAYER.height * 0.82;
    const shawl = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 10, 1, true), rebozo);
    shawl.position.y = PLAYER.height * 0.67;
    this.group.add(this.body, head, shawl);
    // Pequeña luz para que el jugador nunca se pierda en la niebla
    this.light = new THREE.PointLight(PALETTE.velo, 5, 6, 2);
    this.light.position.set(0, 1.2, 1.2);
    this.group.add(this.light);
    scene.add(this.group);
  }

  sync(x: number, y: number, facing: number, vx: number, time: number, flicker: number): void {
    this.group.position.set(x, y, 0);
    this.group.rotation.y = facing > 0 ? 0.35 : -0.35;
    const bob = Math.abs(vx) > 0.3 ? Math.abs(Math.sin(time * 12)) * 0.05 : 0;
    this.body.position.y = PLAYER.height * 0.34 + bob;
    // Las luces parpadean cuando ella está encima (§4.1)
    this.light.intensity = 5 * (flicker > 0 ? (Math.random() < flicker * 0.35 ? 0.1 : 1) : 1);
  }
}

/** La Llorona: alta, vestido que se funde con la niebla, rostro nunca visible (§9.3). */
export class LloronaView {
  readonly group = new THREE.Group();
  private dressMat: THREE.MeshStandardMaterial;
  private hair: THREE.Mesh;

  constructor(scene: THREE.Scene) {
    this.dressMat = new THREE.MeshStandardMaterial({
      color: PALETTE.velo,
      emissive: PALETTE.velo,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const dress = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.4, 14, 1, true), this.dressMat);
    dress.position.y = 0.2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), this.dressMat);
    head.position.y = 1.55;
    const hairMat = new THREE.MeshStandardMaterial({ color: PALETTE.abismo, roughness: 1 });
    this.hair = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.3, 8, 1, true), hairMat);
    this.hair.position.y = 1.15;
    this.hair.rotation.x = Math.PI; // cabello cayendo y tapando el rostro
    const glow = new THREE.PointLight(PALETTE.velo, 6, 7, 2);
    glow.position.y = 1;
    this.group.add(dress, head, this.hair, glow);
    scene.add(this.group);
  }

  sync(x: number, y: number, time: number, facingPlayer: number): void {
    // y es el centro: el modelo se dibuja flotando, sin pies
    this.group.position.set(x, y - 0.6 + Math.sin(time * 1.7) * 0.12, 0.3);
    this.group.rotation.y = facingPlayer > 0 ? 0.4 : -0.4;
    this.hair.rotation.z = Math.sin(time * 0.9) * 0.15; // como si flotara bajo el agua
    this.dressMat.opacity = 0.55 + Math.sin(time * 2.3) * 0.12;
  }
}
