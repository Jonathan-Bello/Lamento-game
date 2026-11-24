import { LAMENTO } from '../config';
import { clamp, randRange, smoothstep } from '../core/math';

/** Valores de mezcla que produce la fórmula del §4.2. */
export interface LamentoMix {
  d: number;
  lamento: number;
  reverb: number;
  ambiente: number;
  corazon: number;
}

/** La fórmula del GDD (§4.2), aislada para poder probarla y ajustarla. */
export function lamentoMix(distance: number): LamentoMix {
  const d = clamp(distance / LAMENTO.maxDistance, 0, 1);
  return {
    d,
    lamento: 0.02 + 0.98 * Math.pow(d, LAMENTO.exponent), // cerca = casi nada
    reverb: d, // lejos = mucho eco
    ambiente: smoothstep(0.1, 0.4, d), // el mundo se calla cerca de ella
    corazon: 1 - smoothstep(0.0, 0.3, d), // el corazón sube cuando está encima
  };
}

export type PhraseListener = (text: string) => void;

/**
 * Mezclador de Web Audio (§10.2). Todo el sonido es sintetizado para que el prototipo
 * no dependa de archivos: el lamento es una "voz" con formantes, el ambiente son
 * grillos + agua, y el corazón son golpes graves.
 *
 * AudioContext → buses por capa → (Convolver para reverb) → Compressor → salida
 */
export class LamentoMixer {
  readonly ctx: AudioContext;
  private master: GainNode;
  private lamentBus: GainNode;
  private ambientBus: GainNode;
  private heartBus: GainNode;
  private breathGain: GainNode;
  private dry: GainNode;
  private wet: GainNode;
  private panner: StereoPannerNode;
  private voiceOsc: OscillatorNode;
  private voiceOsc2: OscillatorNode;
  private voiceEnv: GainNode;
  private crickets: { gain: GainNode; next: number }[] = [];
  private nextPhrase = 0;
  private nextBeat = 0;
  private mix: LamentoMix = lamentoMix(LAMENTO.maxDistance);
  private pan = 0;
  private exhausted = false;
  private listener: PhraseListener | null = null;

  constructor() {
    const ctx = new AudioContext();
    this.ctx = ctx;
    const noise = this.makeNoise(2);

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    // ---------- Capa: Lamento ----------
    this.lamentBus = ctx.createGain();
    this.panner = ctx.createStereoPanner();
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    const reverb = ctx.createConvolver();
    reverb.buffer = this.makeImpulse(3.8, 2.8);
    this.dry.connect(this.panner);
    this.wet.connect(reverb).connect(this.panner);
    this.panner.connect(this.lamentBus).connect(this.master);

    this.voiceEnv = ctx.createGain();
    this.voiceEnv.gain.value = 0;
    this.voiceOsc = ctx.createOscillator();
    this.voiceOsc.type = 'sawtooth';
    this.voiceOsc.frequency.value = 500;
    this.voiceOsc2 = ctx.createOscillator();
    this.voiceOsc2.type = 'triangle';
    this.voiceOsc2.frequency.value = 503;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.3;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = 9;
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(this.voiceOsc.frequency);
    vibratoDepth.connect(this.voiceOsc2.frequency);

    const source = ctx.createGain();
    source.gain.value = 0.5;
    this.voiceOsc.connect(source);
    this.voiceOsc2.connect(source);
    // Aire en la voz
    const breathy = ctx.createBufferSource();
    breathy.buffer = noise;
    breathy.loop = true;
    const breathyGain = ctx.createGain();
    breathyGain.gain.value = 0.12;
    breathy.connect(breathyGain).connect(source);

    // Formantes de una vocal "a/u" abierta → suena a voz humana lejana
    const formantOut = ctx.createGain();
    for (const [f, q, g] of [
      [750, 6, 1],
      [1150, 8, 0.6],
      [2600, 10, 0.25],
    ] as const) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g * 2.2;
      source.connect(bp).connect(gg).connect(formantOut);
    }
    formantOut.connect(this.voiceEnv);
    this.voiceEnv.connect(this.dry);
    this.voiceEnv.connect(this.wet);

    // ---------- Capa: Ambiente ----------
    this.ambientBus = ctx.createGain();
    this.ambientBus.connect(this.master);
    const water = ctx.createBufferSource();
    water.buffer = this.makeNoise(4, true);
    water.loop = true;
    const waterLp = ctx.createBiquadFilter();
    waterLp.type = 'lowpass';
    waterLp.frequency.value = 520;
    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.45;
    water.connect(waterLp).connect(waterGain).connect(this.ambientBus);

    for (const [freq, pan] of [
      [4300, -0.6],
      [4700, 0.5],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 12;
      const g = ctx.createGain();
      g.gain.value = 0;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      osc.connect(bp).connect(g).connect(p).connect(this.ambientBus);
      osc.start();
      this.crickets.push({ gain: g, next: 0 });
    }

    // ---------- Capa: Jugador (corazón y respiración) ----------
    this.heartBus = ctx.createGain();
    this.heartBus.gain.value = 0;
    this.heartBus.connect(this.master);

    const breath = ctx.createBufferSource();
    breath.buffer = noise;
    breath.loop = true;
    const breathBp = ctx.createBiquadFilter();
    breathBp.type = 'bandpass';
    breathBp.frequency.value = 900;
    breathBp.Q.value = 0.8;
    this.breathGain = ctx.createGain();
    this.breathGain.gain.value = 0;
    breath.connect(breathBp).connect(this.breathGain).connect(this.master);

    for (const n of [this.voiceOsc, this.voiceOsc2, vibrato]) n.start();
    for (const n of [breathy, water, breath]) n.start();
    this.applyMix(0);
  }

  onPhrase(fn: PhraseListener): void {
    this.listener = fn;
  }

  async resume(): Promise<void> {
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  async suspend(): Promise<void> {
    if (this.ctx.state === 'running') await this.ctx.suspend();
  }

  get currentMix(): LamentoMix {
    return this.mix;
  }

  /**
   * @param distance distancia real jugador–Llorona en metros
   * @param dx       posición X de ella menos la del jugador (dirección real del sonido)
   */
  update(distance: number, dx: number, exhausted: boolean): void {
    this.mix = lamentoMix(distance);
    this.pan = clamp(dx / LAMENTO.panWidth, -1, 1);
    this.exhausted = exhausted;
    this.applyMix(0.15);
    this.schedule();
  }

  private applyMix(smoothing: number): void {
    const t = this.ctx.currentTime;
    const set = (p: AudioParam, v: number) =>
      smoothing > 0 ? p.setTargetAtTime(v, t, smoothing) : p.setValueAtTime(v, t);
    const m = this.mix;
    set(this.lamentBus.gain, m.lamento);
    set(this.wet.gain, m.reverb * 1.4);
    set(this.dry.gain, 1 - m.reverb * 0.65);
    set(this.panner.pan, this.pan);
    set(this.ambientBus.gain, m.ambiente);
    set(this.heartBus.gain, m.corazon);
    const breathTarget = this.exhausted ? 0.28 : m.corazon * 0.16;
    const breathRate = this.exhausted ? 2.2 : 1.1;
    set(this.breathGain.gain, breathTarget * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * breathRate)));
  }

  /** Programa eventos de audio con anticipación (frases del lamento, grillos, latidos). */
  private schedule(): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // --- Frases del lamento ---
    if (now >= this.nextPhrase) {
      const t = now + 0.05;
      const f0 = randRange(470, 560);
      const dur = randRange(2.6, 3.6);
      // Intermitente a media distancia (§4.1): algunas frases casi no salen.
      const d = this.mix.d;
      const broken = d < 0.55 && Math.random() < (1 - d / 0.55) * 0.7;
      const peak = broken ? 0.25 : 1;
      for (const osc of [this.voiceOsc, this.voiceOsc2]) {
        const fp = osc.frequency;
        fp.cancelScheduledValues(t);
        fp.setValueAtTime(f0, t);
        fp.linearRampToValueAtTime(f0 * 1.09, t + 0.45);
        fp.exponentialRampToValueAtTime(f0 * 0.66, t + dur);
      }
      const g = this.voiceEnv.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0, t);
      g.linearRampToValueAtTime(peak, t + 0.35);
      g.setValueAtTime(peak, t + dur * 0.55);
      g.linearRampToValueAtTime(0, t + dur);
      this.nextPhrase = t + dur + randRange(1.2, 3.2);
      this.listener?.(this.subtitle());
    }

    // --- Grillos: ráfagas de 3 chirridos ---
    for (const c of this.crickets) {
      if (now < c.next) continue;
      const t = now + 0.02;
      for (let i = 0; i < 3; i++) {
        const s = t + i * 0.07;
        c.gain.gain.setValueAtTime(0, s);
        c.gain.gain.linearRampToValueAtTime(0.05, s + 0.01);
        c.gain.gain.linearRampToValueAtTime(0, s + 0.045);
      }
      c.next = t + randRange(0.5, 1.4);
    }

    // --- Corazón: "lub-dub", más rápido cuanto más cerca ---
    if (this.mix.corazon > 0.02 && now >= this.nextBeat) {
      const bpm = 70 + 80 * this.mix.corazon;
      const t = now + 0.02;
      this.thump(t, 1);
      this.thump(t + 0.16, 0.7);
      this.nextBeat = t + 60 / bpm;
    }
  }

  private thump(t: number, amp: number): void {
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(62, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.15);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g).connect(this.heartBus);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  private subtitle(): string {
    const arrow = this.pan < -0.2 ? '← ' : '';
    const arrowR = this.pan > 0.2 ? ' →' : '';
    const d = this.mix.d;
    if (d > 0.85) return `[${arrow}lamento lejano${arrowR}] ¡Ay, mis hijos!`;
    if (d > 0.55) return `[${arrow}lamento${arrowR}] ¡Ay, mis hijos!`;
    if (d > 0.27) return `[${arrow}lamento entrecortado${arrowR}]`;
    if (d > 0.11) return `[${arrow}susurro${arrowR}]`;
    return '[… silencio]';
  }

  private makeNoise(seconds: number, brown = false): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else data[i] = white;
    }
    return buf;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
}
