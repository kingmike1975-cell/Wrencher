// Runs the original game (src/legacy/game.js, generated from public/index.html) inside Phaser.
// The original draws its world into a 2x buffer and its text into the screen canvas (#hud, above Phaser);
// Phaser runs the loop, reads the controls, and puts the world buffer on screen through its camera.
import Phaser from 'phaser';
import { startLegacy } from '../legacy/game.js';

export class Legacy extends Phaser.Scene {
  constructor() { super('legacy'); }

  create() {
    this.controls = this.registry.get('controls');
    this.controls.attach(this);
    this.worldCanvas = document.createElement('canvas');
    this.game$ = startLegacy({ screenCanvas: document.getElementById('hud'), worldCanvas: this.worldCanvas, controls: this.controls, assetBase: '../' });
    this.makeWorldTexture();
    this.cameras.main.setBackgroundColor('#07060a');
    this.scene.launch('legacy-pad');
  }

  // the P key flips the original between 1x and 2x pixels, which resizes its buffer
  makeWorldTexture() {
    if (this.textures.exists('world')) { this.world.destroy(); this.textures.remove('world'); }
    this.tex = this.textures.addCanvas('world', this.worldCanvas);
    this.texW = this.worldCanvas.width;
    this.world = this.add.image(0, 0, 'world').setOrigin(0);
  }

  update() {
    const g = this.game$;
    g.frame(performance.now());
    if (this.worldCanvas.width !== this.texW) this.makeWorldTexture();
    this.tex.refresh();

    // the original's camera, applied by Phaser: the world fits the screen (letterboxed), zoomed by cam.z around cam.cx/cy
    const v = g.view(), cam = g.cam, c = this.cameras.main;
    this.world.setScale(1 / v.PXD);
    c.setViewport(Math.round(v.dx0 * v.dpr), Math.round(v.dy0 * v.dpr), Math.round(v.dw * v.dpr), Math.round(v.dh * v.dpr));
    c.setZoom(v.fit * cam.z * v.dpr);
    c.centerOn(cam.cx, cam.cy);
  }
}
