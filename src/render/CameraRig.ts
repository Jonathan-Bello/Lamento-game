import * as THREE from 'three';
import { CAMERA } from '../config';
import { clamp, damp } from '../core/math';

/**
 * Cámara 2.5D (§12.2): perspectiva con FOV bajo para un efecto casi ortográfico
 * pero con paralaje real. Zona muerta + look-ahead + límites de la sala.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private focusX: number;
  private focusY: number;
  private lookAhead = 0;
  private extraDistance = 0;

  constructor(
    aspect: number,
    startX: number,
    startY: number,
    private readonly bounds: { x0: number; x1: number },
  ) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, 0.1, 400);
    this.focusX = startX;
    this.focusY = startY + CAMERA.height;
    this.place();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, px: number, py: number, facing: number, chasing: boolean): void {
    this.lookAhead = damp(this.lookAhead, facing * CAMERA.lookAhead, 2.5, dt);
    const tx = px + this.lookAhead;
    const ty = py + CAMERA.height;
    // Zona muerta: la cámara solo se mueve cuando el objetivo sale de ella
    if (tx - this.focusX > CAMERA.deadZoneX) this.focusX = damp(this.focusX, tx - CAMERA.deadZoneX, CAMERA.followLerp, dt);
    if (this.focusX - tx > CAMERA.deadZoneX) this.focusX = damp(this.focusX, tx + CAMERA.deadZoneX, CAMERA.followLerp, dt);
    if (Math.abs(ty - this.focusY) > CAMERA.deadZoneY) this.focusY = damp(this.focusY, ty, CAMERA.followLerp * 0.6, dt);
    // En persecución se aleja un poco para mostrarla detrás
    this.extraDistance = damp(this.extraDistance, chasing ? CAMERA.chaseExtraDistance : 0, 1.5, dt);
    this.place();
  }

  snapTo(px: number, py: number): void {
    this.focusX = px;
    this.focusY = py + CAMERA.height;
    this.lookAhead = 0;
    this.place();
  }

  private place(): void {
    const dist = CAMERA.distance + this.extraDistance;
    // Límites: medio ancho visible a la distancia del plano de juego
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * dist;
    const halfW = halfH * this.camera.aspect;
    const x =
      this.bounds.x1 - this.bounds.x0 > halfW * 2
        ? clamp(this.focusX, this.bounds.x0 + halfW, this.bounds.x1 - halfW)
        : (this.bounds.x0 + this.bounds.x1) / 2;
    this.camera.position.set(x, this.focusY + 1, dist);
    this.camera.lookAt(x, this.focusY, 0);
  }
}
