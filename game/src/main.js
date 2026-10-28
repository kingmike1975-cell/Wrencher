import './phaser-global.js';
import Phaser from 'phaser';
import { W, H, PXD } from './config.js';
import { Controls } from './input/Controls.js';
import { Factory } from './scenes/Factory.js';
import { Hud } from './scenes/Hud.js';
import { Legacy } from './scenes/Legacy.js';
import { LegacyPad } from './scenes/LegacyPad.js';

const params = new URLSearchParams(location.search);
const preBoot = g => g.registry.set('controls', new Controls());
let game;

if (params.has('native')) {
  // the levels already rebuilt in Phaser (so far: the factory floor), at /next/?native
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: W * PXD,
    height: H * PXD,
    backgroundColor: '#0e0c13',
    pixelArt: true,
    roundPixels: true,
    audio: { noAudio: true },
    input: { gamepad: true, activePointers: 3 },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [Factory, Hud],
    callbacks: { preBoot },
  });
  document.getElementById('hud').hidden = true;
  document.getElementById('mute').hidden = true;
} else {
  // the whole original game, running inside Phaser. Canvas renderer: the original draws with the 2D canvas API,
  // so its frames go on screen without being copied to the GPU every frame.
  // The canvas is sized in device pixels (capped at 2x, like the original) and shown at CSS size via zoom.
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'game',
    width: Math.round(innerWidth * dpr()),
    height: Math.round(innerHeight * dpr()),
    zoom: 1 / dpr(),
    backgroundColor: '#07060a',
    pixelArt: true,
    audio: { noAudio: true },   // the original has its own Web Audio mixer
    input: { gamepad: true, activePointers: 3 },
    scale: { mode: Phaser.Scale.NONE },
    scene: [Legacy, LegacyPad],
    callbacks: { preBoot },
  });
  addEventListener('resize', () => {
    game.scale.resize(Math.round(innerWidth * dpr()), Math.round(innerHeight * dpr()));
    game.scale.setZoom(1 / dpr());
  });
}

// read-only handle for the automated playtests
window.__wrencherNext = { game, factory: () => game.scene.getScene('factory') };
