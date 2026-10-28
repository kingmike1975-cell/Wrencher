// Screen-space layer over the game: the on-screen stick and WRENCH button (touch only), plus the clock.
import Phaser from 'phaser';
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

export class Hud extends Phaser.Scene {
  constructor() { super('hud'); }

  create() {
    const controls = this.registry.get('controls');
    const { width: w, height: h } = this.scale;
    const touch = this.sys.game.device.input.touch || new URLSearchParams(location.search).has('touch');
    this.input.addPointer(2);   // stick thumb + button thumb + one spare

    if (touch) {
      const R = 46;
      const base = this.add.circle(0, 0, R, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.35);
      const thumb = this.add.circle(0, 0, 20, 0xffffff, 0.35);
      this.stick = new VirtualJoystick(this, { x: 72, y: h - 72, radius: R, base, thumb, dir: '8dir', forceMin: 0, fixed: true });
      this.stick.on('update', () => {
        controls.stick = { x: this.stick.forceX / R, y: this.stick.forceY / R };
        if (!this.stick.force) controls.stick = { x: 0, y: 0 };
      });
      this.stick.on('pointerup', () => { controls.stick = { x: 0, y: 0 }; });

      const btn = this.add.circle(w - 70, h - 72, 38, 0xc8323a, 0.55).setStrokeStyle(3, 0xe8c547, 0.9).setInteractive();
      this.add.text(w - 70, h - 72, 'WRENCH', { fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: '#fff3d6' }).setOrigin(0.5);
      const down = () => { controls.buttonDown(); btn.setFillStyle(0xe0464f, 0.8); };
      const up = () => { controls.buttonUp(); btn.setFillStyle(0xc8323a, 0.55); };
      btn.on('pointerdown', down); btn.on('pointerup', up); btn.on('pointerout', up);
      // all fingers up: release both, so a lost touch can never leave him running
      this.input.on('pointerup', () => { if (!this.input.manager.pointers.some(p => p.isDown)) { up(); controls.stick = { x: 0, y: 0 }; } });
    }

    this.clock = this.add.text(w / 2, 6, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '12px', color: '#ffffff' }).setOrigin(0.5, 0);
    this.label = this.add.text(8, 6, 'PHASER PREVIEW', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#a59eb2' });
  }

  update() {
    const g = this.registry.get('state');
    if (g) this.clock.setText(`0:${String(Math.max(0, Math.ceil(g.time))).padStart(2, '0')}`);
  }
}
