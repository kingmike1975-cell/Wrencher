import './phaser-global.js';
import Phaser from 'phaser';
import { W, H, PXD } from './config.js';
import { Controls } from './input/Controls.js';
import { Factory } from './scenes/Factory.js';
import { Hud } from './scenes/Hud.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W * PXD,
  height: H * PXD,
  backgroundColor: '#0e0c13',
  pixelArt: true,
  roundPixels: true,
  input: { gamepad: true, activePointers: 3 },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Factory, Hud],
  callbacks: { preBoot: g => g.registry.set('controls', new Controls()) },
});

// read-only handle for the automated playtests
window.__wrencherNext = { game, factory: () => game.scene.getScene('factory') };
