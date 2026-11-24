import * as THREE from 'three';
import { FIXED_DT } from '../config';
import { LamentoMixer } from '../audio/LamentoMixer';
import { CameraRig } from '../render/CameraRig';
import { LloronaView, PlayerView } from '../render/Characters';
import { buildWorld, setFogCloseness, type WorldView } from '../render/SceneBuilder';
import { Hud } from '../ui/Hud';
import { LA_ORILLA_GRIS } from '../world/level';
import { Input } from './Input';
import { lerp, smoothstep } from './math';
import { World } from './World';

type Mode = 'start' | 'playing' | 'paused' | 'captured';

const CAPTURE_DURATION = 2.4;

/** Une simulación, render, audio y HUD, y corre el game loop. */
export class Game {
  private renderer: THREE.WebGLRenderer;
  private view: WorldView;
  private rig: CameraRig;
  private playerView: PlayerView;
  private lloronaView: LloronaView;
  private world = new World(LA_ORILLA_GRIS);
  private input = new Input();
  private hud = new Hud();
  private audio: LamentoMixer | null = null;

  private mode: Mode = 'start';
  private accumulator = 0;
  private lastTime = 0;
  private elapsed = 0;
  private captureTimer = 0;
  private fps = 60;
  private tmp = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.view = buildWorld(this.world.level);
    const p = this.world.player;
    this.rig = new CameraRig(window.innerWidth / window.innerHeight, p.x, p.body.y, this.world.level.bounds);
    this.playerView = new PlayerView(this.view.scene);
    this.lloronaView = new LloronaView(this.view.scene);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing') this.setPaused(true);
    });
    this.hud.playButton.addEventListener('click', () => void this.begin());

    requestAnimationFrame((t) => this.frame(t));
  }

  /** El AudioContext solo puede arrancar tras un gesto del usuario (§15). */
  private async begin(): Promise<void> {
    if (!this.audio) {
      this.audio = new LamentoMixer();
      this.audio.onPhrase((text) => this.hud.showSubtitle(text));
    }
    await this.audio.resume();
    this.hud.start.hidden = true;
    this.mode = 'playing';
    this.input.clear();
    this.hud.showToast('La Orilla', 3);
  }

  private setPaused(paused: boolean): void {
    this.mode = paused ? 'paused' : 'playing';
    this.hud.pause.hidden = !paused;
    void (paused ? this.audio?.suspend() : this.audio?.resume());
    this.input.clear();
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig.setAspect(w / h);
  }

  private frame(timeMs: number): void {
    const t = timeMs / 1000;
    const dt = Math.min(0.1, this.lastTime ? t - this.lastTime : FIXED_DT);
    this.lastTime = t;
    this.fps = lerp(this.fps, 1 / Math.max(dt, 1e-3), 0.05);
    this.input.pollGamepad();

    if (this.input.consume('debug')) this.hud.toggleDebug();
    if (this.input.consume('visualMode')) {
      this.hud.visualMode = !this.hud.visualMode;
      this.hud.showToast(`Modo visual del lamento: ${this.hud.visualMode ? 'sí' : 'no'}`, 1.8);
    }
    if (this.input.consume('subtitles')) {
      this.hud.subtitles = !this.hud.subtitles;
      this.hud.showToast(`Subtítulos: ${this.hud.subtitles ? 'sí' : 'no'}`, 1.8);
    }
    if (this.input.consume('pause') && (this.mode === 'playing' || this.mode === 'paused')) {
      this.setPaused(this.mode === 'playing');
    }

    if (this.mode === 'playing') this.simulate(dt);
    else if (this.mode === 'captured') this.updateCapture(dt);

    this.elapsed += this.mode === 'paused' ? 0 : dt;
    this.present(dt);
    requestAnimationFrame((tt) => this.frame(tt));
  }

  /** Física a paso fijo con acumulador (§12.4). */
  private simulate(dt: number): void {
    this.accumulator += dt;
    while (this.accumulator >= FIXED_DT) {
      const jump = this.input.consume('jump');
      const events = this.world.step(FIXED_DT, this.input.state, jump);
      this.accumulator -= FIXED_DT;
      for (const e of events) {
        if (e.type === 'ofrenda') {
          this.hud.showToast(e.first ? 'Ofrenda — aquí ella no entra' : 'Ofrenda', 2.5);
        } else if (e.type === 'capture') {
          this.mode = 'captured';
          this.captureTimer = CAPTURE_DURATION;
          this.hud.setFade(1);
          this.hud.showToast('Te encontró…', 2);
          this.accumulator = 0;
          return;
        }
      }
    }
  }

  private updateCapture(dt: number): void {
    this.captureTimer -= dt;
    if (this.captureTimer <= 0) {
      this.world.respawnPlayer();
      const p = this.world.player;
      this.rig.snapTo(p.x, p.body.y);
      this.hud.setFade(0);
      this.mode = 'playing';
      this.input.clear();
    }
  }

  /** Interpola entre pasos de física y dibuja. */
  private present(dt: number): void {
    const w = this.world;
    const p = w.player;
    const l = w.llorona;
    const alpha = this.mode === 'playing' ? this.accumulator / FIXED_DT : 1;
    const px = lerp(p.prevX, p.body.x, alpha);
    const py = lerp(p.prevY, p.body.y, alpha);
    const lx = lerp(l.prevX, l.x, alpha);
    const ly = lerp(l.prevY, l.y, alpha);

    const distance = w.distance;
    const audioActive = this.mode === 'playing' || this.mode === 'captured';
    if (this.audio && audioActive) this.audio.update(distance, l.x - p.x, p.exhausted);
    const mix = this.audio?.currentMix;
    const d = mix?.d ?? 1;
    const closeness = 1 - smoothstep(0.25, 0.6, d);
    const onTop = 1 - smoothstep(0.0, 0.11, d);

    this.playerView.sync(px, py, p.facing, p.body.vx, this.elapsed, onTop);
    this.lloronaView.sync(lx, ly, this.elapsed, p.x - l.x);
    setFogCloseness(this.view.fog, closeness);
    for (const light of this.view.ofrendaLights) {
      light.intensity = 28 * (0.85 + 0.15 * Math.sin(this.elapsed * 7 + light.position.x)) * (onTop > 0.3 && Math.random() < 0.2 ? 0.3 : 1);
    }
    // Silueta lejana que cruza el fondo de vez en cuando
    const g = this.view.backgroundGhost;
    const { x0, x1 } = w.level.bounds;
    g.position.x = x0 + ((this.elapsed * 1.6) % (x1 - x0 + 40)) - 20;
    g.position.y = 0.9 + Math.sin(this.elapsed * 1.3) * 0.15;

    this.rig.update(dt, px, py, p.facing, l.state === 'Persecución');
    this.renderer.render(this.view.scene, this.rig.camera);

    // HUD
    if (mix) this.hud.applyCloseness(mix, Math.max(-1, Math.min(1, (l.x - p.x) / 15)));
    this.tmp.set(px, py + p.body.h / 2, 0).project(this.rig.camera);
    const sx = (this.tmp.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-this.tmp.y * 0.5 + 0.5) * window.innerHeight;
    this.hud.showStamina(sx, sy, p.stamina, p.exhausted);
    this.hud.tick(dt);
    this.hud.setDebug(
      [
        `FPS        ${this.fps.toFixed(0)}`,
        `Llorona    ${l.state}${l.respite > 0 ? ` (respiro ${l.respite.toFixed(1)} s)` : ''}`,
        `Distancia  ${distance.toFixed(1)} m   d=${d.toFixed(2)}`,
        `Lamento    ${(mix?.lamento ?? 0).toFixed(2)}   reverb ${(mix?.reverb ?? 0).toFixed(2)}`,
        `Ambiente   ${(mix?.ambiente ?? 0).toFixed(2)}   corazón ${(mix?.corazon ?? 0).toFixed(2)}`,
        `Aliento    ${(p.stamina * 100).toFixed(0)}%${p.exhausted ? ' (agotada)' : ''}`,
        `Ruido      ${p.lastNoise} m${p.inWater ? ' (agua)' : ''}`,
        `Zona segura ${w.isSafe(p.x, p.centerY) ? 'sí' : 'no'}`,
        `Director   persecución ${w.director.chaseTime.toFixed(0)} s · calma ${w.director.calmTime.toFixed(0)} s`,
      ].join('\n'),
    );
  }
}
