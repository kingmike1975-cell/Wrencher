// Wrencher on screen: four stacked layer images plus his drawn wrench and arm.
// World units are the original 320x180 pixels; his 2x sprite layers are shown at half scale.
import Phaser from 'phaser';
import { layerKey } from './parts.js';

const ORDER = ['backArm', 'body', 'frontArm', 'hat'];

export class WrencherView {
  constructor(scene) {
    this.scene = scene;
    this.outfit = 'coveralls'; this.hat = false; this.hot = false;
    this.root = scene.add.container(0, 0).setDepth(10);
    this.img = {};
    for (const l of ORDER) {
      this.img[l] = scene.add.image(0, 0, layerKey(scene, l === 'body' ? 'body' : l, this.outfit, false)).setOrigin(0.5, 1).setScale(0.5);
      this.root.add(this.img[l]);
    }
    this.tool = scene.add.graphics().setDepth(11);
  }

  setLook({ outfit = this.outfit, hat = this.hat, hot = this.hot }) {
    this.outfit = outfit; this.hat = hat; this.hot = hot;
  }

  // P: the player state from the level (x, y, face, walking, walkT, brandT, repairing, climb)
  draw(P, t) {
    const s = this.scene, flip = P.climb ? (Math.floor(P.walkT * 6) % 2 === 0) : P.face < 0;
    const walkFrame = P.walking && (Math.floor(P.walkT * 8) % 2);
    const armUp = P.brandT > 0;
    this.img.body.setTexture(layerKey(s, walkFrame ? 'bodyWalk' : 'body', this.outfit, this.hot));
    this.img.backArm.setTexture(layerKey(s, 'backArm', this.outfit, this.hot));
    this.img.frontArm.setTexture(layerKey(s, 'frontArm', this.outfit, this.hot)).setVisible(!armUp);
    this.img.hat.setTexture(layerKey(s, 'hat', this.outfit, this.hot)).setVisible(this.hat);
    for (const l of ORDER) this.img[l].setFlipX(flip);
    // the 2x sprite is 20 wide with his centre at 10; the original placed him at x-5 for a 10-wide sprite
    this.root.setPosition(Math.round(P.x), Math.round(P.y));

    const g = this.tool; g.clear();
    const x = Math.round(P.x), y = Math.round(P.y), f = P.face;
    if (armUp) {
      // raised clear of his nose, wrench shaking overhead
      const sleeve = Phaser.Display.Color.HexStringToColor(this.sleeveColour()).color;
      this.arm(g, x + (f > 0 ? 2.5 : -2.5), y - 5.5, x + f * 5, y - 6.5, sleeve);
      this.arm(g, x + f * 5, y - 6.5, x + f * 5, y - 12, sleeve);
      this.wrench(g, x + f * 5, y - 13, -Math.PI / 2 + f * (0.3 + Math.sin(t * 30) * 0.6), 7);
    } else if (P.repairing) {
      this.wrench(g, x + f * 4, y - 6, (f > 0 ? 0 : Math.PI) + Math.sin(t * 18) * 0.6 * f, 6);
    } else if (!P.climb) {
      this.wrench(g, x + f * 4, y - 5, Math.PI / 2 - f * 0.3, 5);
    }
  }

  sleeveColour() { return this.outfit === 'tracksuit' ? '#2a4ab0' : '#5a7340'; }

  arm(g, sx, sy, hx, hy, colour, w = 1.5) {
    const n = Math.max(2, Math.ceil(Math.hypot(hx - sx, hy - sy) * 2));
    g.fillStyle(colour);
    for (let i = 0; i <= n; i++) { const k = i / n; g.fillRect(sx + (hx - sx) * k - w / 2, sy + (hy - sy) * k - w / 2, w, w); }
  }

  wrench(g, x0, y0, ang, len) {
    const cx = Math.cos(ang), sy = Math.sin(ang);
    g.fillStyle(0xa7acb6);
    for (let i = 0; i < len; i++) g.fillRect(Math.round(x0 + cx * i), Math.round(y0 + sy * i), 1, 1);
    const hx = Math.round(x0 + cx * len), hy = Math.round(y0 + sy * len);
    g.fillStyle(0xd6d9df); g.fillRect(hx - 1, hy - 1, 3, 3);
    g.fillStyle(0x4a4f58); g.fillRect(Math.round(hx + cx), Math.round(hy + sy), 1, 1);
  }
}
