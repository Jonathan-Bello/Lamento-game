import { smoothstep } from '../core/math';
import type { LamentoMix } from '../audio/LamentoMixer';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta #${id} en index.html`);
  return el as T;
};

/** HUD y efectos de pantalla. Solo toca el DOM; no tiene lógica de juego. */
export class Hud {
  private vignette = $('vignette');
  private frost = $('frost');
  private waveL = $('wave-left');
  private waveR = $('wave-right');
  private stamina = $('stamina');
  private subtitle = $('subtitle');
  private toast = $('toast');
  private debug = $('debug');
  private fade = $('fade');
  readonly start = $('start');
  readonly playButton = $<HTMLButtonElement>('play');
  readonly pause = $('pause');

  visualMode = false;
  subtitles = true;
  private subtitleTimer = 0;
  private toastTimer = 0;

  /** Efectos por cercanía (§4.1, §9.4). */
  applyCloseness(mix: LamentoMix, pan: number): void {
    const d = mix.d;
    this.frost.style.opacity = String(1 - smoothstep(0.11, 0.27, d)); // cerca: 5–12 m
    this.vignette.style.opacity = String(0.35 + 0.65 * (1 - smoothstep(0.0, 0.2, d)));
    // Modo visual: ondas grandes = lejos, tenues = cerca (misma lógica invertida, §13)
    const vis = this.visualMode ? mix.lamento : 0;
    this.waveL.style.opacity = String(vis * (0.25 + 0.75 * Math.max(0, -pan)));
    this.waveR.style.opacity = String(vis * (0.25 + 0.75 * Math.max(0, pan)));
  }

  /** Aro de aliento alrededor de Itzel; solo aparece al gastarse (§11.1). */
  showStamina(screenX: number, screenY: number, stamina: number, exhausted: boolean): void {
    this.stamina.style.left = `${screenX}px`;
    this.stamina.style.top = `${screenY}px`;
    this.stamina.style.setProperty('--p', `${Math.round(stamina * 100)}%`);
    this.stamina.style.opacity = stamina < 0.98 ? '1' : '0';
    this.stamina.style.filter = exhausted ? 'sepia(1) hue-rotate(-30deg) saturate(3)' : 'none';
  }

  showSubtitle(text: string): void {
    if (!this.subtitles) return;
    this.subtitle.textContent = text;
    this.subtitle.style.opacity = '1';
    this.subtitleTimer = 2.8;
  }

  showToast(text: string, seconds = 3): void {
    this.toast.textContent = text;
    this.toast.style.opacity = '1';
    this.toastTimer = seconds;
  }

  setFade(opacity: number): void {
    this.fade.style.opacity = String(opacity);
  }

  toggleDebug(): void {
    this.debug.hidden = !this.debug.hidden;
  }

  setDebug(text: string): void {
    if (!this.debug.hidden) this.debug.textContent = text;
  }

  tick(dt: number): void {
    if (this.subtitleTimer > 0 && (this.subtitleTimer -= dt) <= 0) this.subtitle.style.opacity = '0';
    if (this.toastTimer > 0 && (this.toastTimer -= dt) <= 0) this.toast.style.opacity = '0';
  }
}
