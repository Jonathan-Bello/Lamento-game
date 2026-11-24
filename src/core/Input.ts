/**
 * Entrada de teclado + Gamepad API (§5.5).
 * Las pulsaciones "de un solo toque" se guardan hasta que el juego las consume,
 * así no se pierden aunque caigan entre dos pasos de física.
 */

export interface InputState {
  left: boolean;
  right: boolean;
  down: boolean;
  run: boolean;
  jumpHeld: boolean;
}

type Action = 'jump' | 'pause' | 'debug' | 'visualMode' | 'subtitles';

const KEYMAP: Record<string, keyof InputState | undefined> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyS: 'down',
  ArrowDown: 'down',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jumpHeld',
  KeyW: 'jumpHeld',
  ArrowUp: 'jumpHeld',
};

const ACTION_KEYS: Record<string, Action | undefined> = {
  Space: 'jump',
  KeyW: 'jump',
  ArrowUp: 'jump',
  Escape: 'pause',
  KeyI: 'debug',
  KeyV: 'visualMode',
  KeyC: 'subtitles',
};

export class Input {
  private keys: InputState = { left: false, right: false, down: false, run: false, jumpHeld: false };
  private pad: InputState = { left: false, right: false, down: false, run: false, jumpHeld: false };
  private pending = new Set<Action>();
  private prevPadJump = false;
  private prevPadStart = false;

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      const k = KEYMAP[e.code];
      if (k) this.keys[k] = true;
      const a = ACTION_KEYS[e.code];
      if (a && !e.repeat) this.pending.add(a);
      if (k || a) e.preventDefault();
    });
    target.addEventListener('keyup', (e) => {
      const k = KEYMAP[e.code];
      if (k) this.keys[k] = false;
    });
    target.addEventListener('blur', () => {
      this.keys = { left: false, right: false, down: false, run: false, jumpHeld: false };
    });
  }

  /** Lee el mando; llamar una vez por frame. */
  pollGamepad(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    const gp = Array.from(pads).find((p) => p && p.connected);
    if (!gp) {
      this.pad = { left: false, right: false, down: false, run: false, jumpHeld: false };
      return;
    }
    const ax = gp.axes[0] ?? 0;
    const ay = gp.axes[1] ?? 0;
    const btn = (i: number) => !!gp.buttons[i]?.pressed;
    this.pad = {
      left: ax < -0.35 || btn(14),
      right: ax > 0.35 || btn(15),
      down: ay > 0.5 || btn(13),
      run: btn(7) || btn(5),
      jumpHeld: btn(0),
    };
    if (this.pad.jumpHeld && !this.prevPadJump) this.pending.add('jump');
    if (btn(9) && !this.prevPadStart) this.pending.add('pause');
    this.prevPadJump = this.pad.jumpHeld;
    this.prevPadStart = btn(9);
  }

  get state(): InputState {
    return {
      left: this.keys.left || this.pad.left,
      right: this.keys.right || this.pad.right,
      down: this.keys.down || this.pad.down,
      run: this.keys.run || this.pad.run,
      jumpHeld: this.keys.jumpHeld || this.pad.jumpHeld,
    };
  }

  /** Devuelve true una sola vez por pulsación. */
  consume(action: Action): boolean {
    return this.pending.delete(action);
  }

  clear(): void {
    this.pending.clear();
  }
}
