import { DIRECTOR } from '../config';
import type { Llorona } from './Llorona';

/**
 * AI Director mínimo (§6.3): evita que la persecución sea agobiante todo el tiempo
 * y provoca un acercamiento si el jugador lleva mucho tiempo tranquilo.
 */
export class Director {
  chaseTime = 0;
  calmTime = 0;

  update(dt: number, llorona: Llorona, px: number, py: number, pFacing: number, playerSafe: boolean): void {
    if (llorona.state === 'Persecución') {
      this.chaseTime += dt;
      this.calmTime = 0;
      if (this.chaseTime > DIRECTOR.maxChaseTime) {
        // Fase de respiro: se va lejos, a espaldas del jugador.
        llorona.retreat(px, -pFacing, DIRECTOR.respiteTime);
        this.chaseTime = 0;
      }
      return;
    }
    this.chaseTime = Math.max(0, this.chaseTime - dt * 0.5);
    if (llorona.state === 'Errante' && !playerSafe) this.calmTime += dt;
    if (this.calmTime > DIRECTOR.calmTimeBeforeApproach) {
      llorona.lure(px, py);
      this.calmTime = 0;
    }
  }

  reset(): void {
    this.chaseTime = 0;
    this.calmTime = 0;
  }
}
