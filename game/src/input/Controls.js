// One input state for keyboard, controller and the on-screen stick + WRENCH button.
// The deadzone and hysteresis numbers are the ones tuned on the phone in the original build (2026-10-27).
import Phaser from 'phaser';

const ACT_KEYS = ['SPACE', 'J', 'K', 'X', 'ENTER'];

// one small radial deadzone, rescaled so the stick goes live right past it (no dead band, then a lurch)
export function deadzone(x, y, dz) {
  const m = Math.hypot(x, y);
  if (m <= dz) return [0, 0];
  const k = Math.min(1, (m - dz) / (1 - dz)) / m;
  return [x * k, y * k];
}
// digital direction with hysteresis: press in past `on`, let go below `off`, so a resting thumb doesn't flicker
export const dirOf = (v, prev, on, off) => (Math.abs(v) > (Math.sign(v) === prev ? off : on) ? Math.sign(v) : 0);

export class Controls {
  constructor() {
    this.vx = 0; this.vy = 0; this.dx = 0; this.dy = 0;
    this.act = false;      // held
    this.pressed = false;  // went down this frame
    this.stick = { x: 0, y: 0 };   // set by the HUD's virtual joystick, -1..1
    this.touchAct = false;         // set by the HUD's WRENCH button
    this.keys = null; this.scene = null;
    this._queued = false;      // a press that came and went between two frames still counts
    this.startPressed = false; this.selectPressed = false;   // controller Start / Select, the frame they go down
    this._prevAct = false; this._prevStart = false; this._prevSel = false;
  }

  attach(scene) {
    this.scene = scene;
    const kb = scene.input.keyboard;
    this.keys = kb.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,' + ACT_KEYS.join(','));
    // drop everything when the page is hidden, so nothing is stuck held on return
    const drop = () => { kb.resetKeys(); this.stick = { x: 0, y: 0 }; this.touchAct = false; };
    scene.game.events.on(Phaser.Core.Events.BLUR, drop);
    scene.game.events.on(Phaser.Core.Events.HIDDEN, drop);
  }

  // the on-screen WRENCH button calls these
  buttonDown() { this.touchAct = true; this._queued = true; }
  buttonUp() { this.touchAct = false; }

  pad() {
    const gp = this.scene.input.gamepad;
    const p = gp && gp.total ? gp.getPad(0) : null;
    if (!p) return { x: 0, y: 0, act: false, start: false, select: false };
    let [x, y] = deadzone(p.leftStick.x, p.leftStick.y, 0.15);
    if (p.left) x = -1; if (p.right) x = 1; if (p.up) y = -1; if (p.down) y = 1;
    const act = [0, 1, 2, 3, 4, 5, 6, 7].some(i => p.buttons[i] && p.buttons[i].pressed);
    const btn = i => !!(p.buttons[i] && p.buttons[i].pressed);
    return { x, y, act, start: btn(9), select: btn(8) };
  }

  // call once per frame before the game reads it
  update() {
    const k = this.keys, down = n => k[n].isDown;
    const kx = (down('RIGHT') || down('D') ? 1 : 0) - (down('LEFT') || down('A') ? 1 : 0);
    const ky = (down('DOWN') || down('S') ? 1 : 0) - (down('UP') || down('W') ? 1 : 0);
    const pad = this.pad();
    const [sx, sy] = deadzone(this.stick.x, this.stick.y, 0.1);
    // whichever source is pushed hardest wins, so a stuck key can't lock out the stick or pad
    const big = (...v) => v.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    this.vx = big(kx, pad.x, sx); this.vy = big(ky, pad.y, sy);
    this.dx = dirOf(this.vx, this.dx, 0.12, 0.06);
    this.dy = dirOf(this.vy, this.dy, 0.35, 0.22);
    this.act = this.touchAct || pad.act || ACT_KEYS.some(down);
    const tapped = ACT_KEYS.some(n => Phaser.Input.Keyboard.JustDown(k[n]));
    this.pressed = (this.act && !this._prevAct) || tapped || this._queued;
    this._queued = false;
    this._prevAct = this.act;
    this.startPressed = pad.start && !this._prevStart; this._prevStart = pad.start;
    this.selectPressed = pad.select && !this._prevSel; this._prevSel = pad.select;
  }

  // a controller is plugged in: the on-screen controls hide, as in the original
  get padConnected() { const gp = this.scene && this.scene.input.gamepad; return !!(gp && gp.total); }
}
