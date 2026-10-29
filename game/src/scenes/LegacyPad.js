// The on-screen stick and action button (WRENCH, or TURBO on the moped post) for the original game, sized and placed like the original's
// (128px stick bottom-left, 104px button bottom-right, clear of the iPhone's rounded corners and home bar).
// Touch screens only, and hidden while a controller is plugged in.
import Phaser from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

// the safe-area insets in CSS px, read from a probe element
function insets() {
  const el = document.getElementById('safe');
  const cs = getComputedStyle(el);
  return { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0 };
}

export class LegacyPad extends Phaser.Scene {
  constructor() { super('legacy-pad'); }

  create() {
    const controls = this.registry.get('controls');
    this.controls = controls;
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || new URLSearchParams(location.search).has('touch');
    if (!this.touch) return;
    this.input.addPointer(2);

    this.base = this.add.circle(0, 0, 10, 0xf3e9d2, 0.07);
    this.knob = this.add.circle(0, 0, 10, 0xf3e9d2, 0.32);
    this.stick = new VirtualJoystick(this, { x: 0, y: 0, radius: 10, base: this.base, thumb: this.knob, forceMin: 0, fixed: true });
    this.stick.on('update', () => {
      const r = this.stick.radius;
      controls.stick = this.stick.force ? { x: this.stick.forceX / r, y: this.stick.forceY / r } : { x: 0, y: 0 };
    });

    this.btn = this.add.circle(0, 0, 10, 0xc8323a, 0.5).setInteractive();
    this.label = this.add.text(0, 0, 'WRENCH', { fontFamily: '"Press Start 2P", monospace', color: '#f3e9d2' }).setOrigin(0.5);
    const down = () => { controls.buttonDown(); this.btn.setFillStyle(0xc8323a, 0.9).setScale(0.94); };
    const up = () => { controls.buttonUp(); this.btn.setFillStyle(0xc8323a, 0.5).setScale(1); };
    this.btn.on('pointerdown', down);
    this.btn.on('pointerup', up);
    this.btn.on('pointerout', up);
    // once every finger is up nothing can stay held (iOS can lose a touch between the two thumbs)
    this.input.on('pointerup', () => {
      if (!this.input.manager.pointers.some(p => p.isDown)) { up(); controls.stick = { x: 0, y: 0 }; }
    });

    this.layout();
    this.scale.on('resize', () => this.layout());
  }

  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), h = this.scale.height, w = this.scale.width, s = insets();
    const R = 64 * dpr;
    this.stick.setPosition((s.l + 18) * dpr + R, h - (s.b + 14) * dpr - R);
    this.stick.radius = R;
    this.base.setRadius(R).setStrokeStyle(2 * dpr, 0xf3e9d2, 0.25);
    // the stick listens for touches on its base, so its touch area has to grow with it
    if (this.base.input) { this.base.input.hitArea = new Phaser.Geom.Circle(R, R, R); this.base.input.hitAreaCallback = Phaser.Geom.Circle.Contains; }
    this.knob.setRadius(26 * dpr).setStrokeStyle(2 * dpr, 0xf3e9d2, 0.5);
    const B = 52 * dpr, bx = w - (s.r + 22) * dpr - B, by = h - (s.b + 22) * dpr - B;
    this.btn.setPosition(bx, by).setRadius(B).setStrokeStyle(3 * dpr, 0xe8c547, 0.9);
    this.btn.input.hitArea = new Phaser.Geom.Circle(B, B, B);
    this.btn.input.hitAreaCallback = Phaser.Geom.Circle.Contains;
    this.label.setPosition(bx, by).setFontSize(10 * dpr);
  }

  update() {
    if (!this.touch) return;
    const show = !this.controls.padConnected;
    for (const o of [this.base, this.knob, this.btn, this.label]) o.setVisible(show);
    // the original game names the button for the level (TURBO on the moped post)
    const l = window.__wrencher?.actLabel?.() || 'WRENCH';
    if (this.label.text !== l) this.label.setText(l);
    this.stick.setEnable(show);
  }
}
