// The factory floor, first Phaser port: girders, ladders, pipes, the six big machines,
// and Wrencher's movement (walk, double-tap run, skid, ladders, repair, brandish) with the original numbers.
// Bureaucrats, the dog, drinks, oil, seesaws and rats come over in the next step.
import Phaser from 'phaser';
import { FY, LADDERS, PIPES, MPOS, GIRDER_PALS } from '../sprites/data.js';
import { W, H, RUN, RUN_ACCEL, SKID_DECEL, DTAP, WALK, CLIMB, REPAIR_RATE, DRIFT, ZOOM_IN, SHIFT_LEN, PXD } from '../config.js';
import { WrencherView } from '../wrencher/Wrencher.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function hopAt(f, x) {
  for (const p of PIPES) if (p.f === f && Math.abs(x - p.x) < 7) return -Math.round(Math.sin((x - (p.x - 7)) / 14 * Math.PI) * 5);
  return 0;
}

// the static room, painted once with the same canvas calls as the original renderWorld()
function paintRoom(c, shift) {
  c.fillStyle = '#14121b'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#1b1824';
  for (let y = 28, r = 0; y < H; y += 6, r++) { c.fillRect(0, y, W, 1); for (let x = (r % 2) * 6; x < W; x += 12) c.fillRect(x, y, 1, 6); }
  for (let f = 0; f < 3; f++) {
    const wy = FY[f] - 40;
    for (const wx of [146, 282]) {
      c.fillStyle = '#262236'; c.fillRect(wx, wy, 18, 24);
      c.fillStyle = '#1c2640'; c.fillRect(wx + 1, wy + 1, 16, 22);
      c.fillStyle = '#262236'; c.fillRect(wx + 8, wy, 1, 24); c.fillRect(wx, wy + 11, 18, 1);
    }
    const cy = f === 2 ? 28 : FY[f + 1] + 6;
    for (const lx of [30, 186, 300]) {
      c.fillStyle = 'rgba(255,214,140,0.06)';
      c.beginPath(); c.moveTo(lx - 2, cy + 3); c.lineTo(lx + 2, cy + 3); c.lineTo(lx + 22, FY[f]); c.lineTo(lx - 22, FY[f]); c.closePath(); c.fill();
      c.fillStyle = '#3a3530'; c.fillRect(lx - 3, cy, 6, 3);
      c.fillStyle = '#ffe3a0'; c.fillRect(lx - 1, cy + 3, 2, 1);
    }
    c.fillStyle = '#2a2433'; c.fillRect(0, FY[f] - 18, 7, 18); c.fillRect(W - 7, FY[f] - 18, 7, 18);
    c.fillStyle = '#09080c'; c.fillRect(0, FY[f] - 17, 6, 17); c.fillRect(W - 6, FY[f] - 17, 6, 17);
  }
  c.fillStyle = '#6d6560'; c.fillRect(114, 28, 1, 4); c.fillRect(205, 28, 1, 4);
  c.fillStyle = '#9e2a2b'; c.fillRect(104, 31, 112, 13);
  c.fillStyle = '#6e1c1e'; c.fillRect(104, 43, 112, 1);
  for (const fx of [106, 205]) {
    c.fillStyle = '#2f55a8'; c.fillRect(fx, 33, 9, 3);
    c.fillStyle = '#e8e2d0'; c.fillRect(fx, 36, 9, 3);
    c.fillStyle = '#c8323a'; c.fillRect(fx, 39, 9, 3);
    c.fillStyle = '#e8c547'; c.fillRect(fx + 3, 35, 3, 3);
    c.fillStyle = '#c8323a'; c.fillRect(fx + 4, 36, 1, 1);
  }
  const gp = GIRDER_PALS[(shift - 1) % GIRDER_PALS.length];
  const girder = (y, h) => {
    c.fillStyle = gp.base; c.fillRect(0, y, W, h);
    c.fillStyle = gp.hi; c.fillRect(0, y, W, 1);
    c.fillStyle = gp.lo; c.fillRect(0, y + h - 1, W, 1);
    c.fillStyle = gp.x;
    for (let x = 0; x < W; x += 8) for (let k = 0; k < h - 2; k++) { c.fillRect(x + k, y + 1 + k, 1, 1); c.fillRect(x + 7 - k, y + 1 + k, 1, 1); }
  };
  girder(24, 4);
  for (const y of FY) girder(y, 6);
  c.fillStyle = '#0e0c13'; c.fillRect(0, FY[0] + 6, W, H - FY[0] - 6);
  c.fillStyle = '#3ccfd0';
  for (const l of LADDERS) {
    const top = FY[l.b], bot = FY[l.a];
    c.fillRect(l.x - 4, top, 1, bot - top); c.fillRect(l.x + 3, top, 1, bot - top);
    for (let y = top + 2; y < bot; y += 4) c.fillRect(l.x - 4, y, 8, 1);
  }
  for (const p of PIPES) {
    const y = FY[p.f];
    c.fillStyle = '#55604a'; c.fillRect(p.x - 3, y - 4, 7, 4);
    c.fillStyle = '#7d8b6c'; c.fillRect(p.x - 3, y - 4, 7, 1);
    c.fillStyle = '#c8323a'; c.fillRect(p.x, y - 6, 1, 2); c.fillRect(p.x - 1, y - 6, 3, 1);
  }
}

export class Factory extends Phaser.Scene {
  constructor() { super('factory'); }

  init(data) { this.shift = (data && data.shift) || 1; }

  create() {
    this.controls = this.registry.get('controls');
    this.controls.attach(this);

    const key = `room:${this.shift}`;
    if (!this.textures.exists(key)) {
      const tex = this.textures.createCanvas(key, W * PXD, H * PXD), c = tex.getContext();
      c.imageSmoothingEnabled = false; c.scale(PXD, PXD); paintRoom(c, this.shift); tex.refresh();
    }
    this.add.image(0, 0, key).setOrigin(0).setScale(1 / PXD);
    this.machineGfx = this.add.graphics().setDepth(5);

    this.state = { time: SHIFT_LEN, repairs: 0, strikes: 0 };
    this.registry.set('state', this.state);
    this.machines = MPOS.map(p => ({ x: p.x, f: p.f, health: 62 + Math.random() * 38, rate: 100 / (100 / (1.6 + Math.random() * 0.8) - 5), broken: false, dirty: false }));
    this.P = { x: 150, f: 0, y: FY[0], face: 1, climb: null, walkT: 0, walking: false, brandT: 0, brandDir: 1, repairing: false, mach: null,
      clock: 0, lastDx: 0, tapDir: 0, tapTime: -9, runDir: 0, runV: 0, skidDir: 0, skidV: 0 };
    this.wren = new WrencherView(this);
    const look = new URLSearchParams(location.search);
    this.wren.setLook({ outfit: look.get('outfit') || 'coveralls', hat: look.has('hat') });

    // dynamic zoom: base zoom maps the 320x180 world onto the 640x360 canvas, cam.z adds the repair zoom
    this.cam = { z: 1, cx: W / 2, cy: H / 2 };
    this.cameras.main.setRoundPixels(true);
    this.applyCamera();
    if (!this.scene.isActive('hud')) this.scene.launch('hud');
  }

  nearMachine() {
    let best = null, bd = 13;
    for (const m of this.machines) if (m.f === this.P.f && Math.abs(m.x - this.P.x) < bd) { bd = Math.abs(m.x - this.P.x); best = m; }
    return best;
  }

  update(_, ms) {
    const dt = Math.min(ms / 1000, 0.1);
    this.controls.update();
    // fixed small steps, so a slow frame never slows the game down (same as the original's substeps)
    for (let left = dt; left > 1e-6; left -= 0.05) this.step(Math.min(0.05, left));
    this.updateCamera(dt);
    this.P.walking = this.P.walkT > 0 && (this.controls.dx !== 0 || (this.P.climb && this.controls.dy !== 0));
    this.wren.draw({ ...this.P, y: this.P.y + (this.P.climb ? 0 : hopAt(this.P.f, this.P.x)) }, this.time.now / 1000);
    this.drawMachines(this.time.now / 1000);
  }

  step(dt) {
    const P = this.P, inp = this.controls;
    if (this.state.time > 0) this.state.time -= dt;
    P.repairing = false; P.mach = null;
    const { dx, dy, act, pressed } = inp;
    if (P.brandT > 0) { P.brandT -= dt; P.x += P.brandDir * (DRIFT / 0.32) * dt; }

    if (P.climb) {
      P.runDir = 0; P.runV = 0; P.skidV = 0; P.lastDx = 0;
      if (dy !== 0) {
        P.y += dy * CLIMB * dt; P.walkT += dt;
        const top = FY[P.climb.b], bot = FY[P.climb.a];
        if (P.y <= top) { P.y = top; P.f = P.climb.b; P.climb = null; }
        else if (P.y >= bot) { P.y = bot; P.f = P.climb.a; P.climb = null; }
      }
      this.decay(dt);
      return;
    }
    if (dy !== 0 && Math.abs(inp.vy) >= Math.abs(inp.vx)) {
      for (const l of LADDERS) {
        if (Math.abs(P.x - l.x) < 6 && ((dy < 0 && l.a === P.f) || (dy > 0 && l.b === P.f))) {
          P.climb = l; P.y = FY[P.f] + dy * 0.5; P.x = l.x; this.decay(dt); return;
        }
      }
    }

    const m = this.nearMachine(), work = m && m.health < 100;
    if (pressed) { if (dx !== 0) this.brandish(dx); else if (!work) this.brandish(P.face); }
    if (act && dx === 0 && work) {
      P.face = m.x >= P.x ? 1 : -1;
      P.repairing = true; P.mach = m;
      m.health = Math.min(100, m.health + REPAIR_RATE * dt);
      if (m.health > 0) m.broken = false;
      if (m.health >= 100 && m.dirty) { m.dirty = false; this.state.repairs++; }
    } else if (act && dx !== 0) {
      P.face = dx;
      if (P.runDir) { P.runDir = 0; P.runV = 0; }
    } else if (P.skidV > 0) {
      P.x += P.skidDir * P.skidV * dt; P.skidV = Math.max(0, P.skidV - SKID_DECEL * dt);
    } else if (dx !== 0 && P.brandT <= 0) {
      if (P.runDir === dx) { P.runV = Math.min(RUN, P.runV + RUN_ACCEL * dt); P.walkT += dt * P.runV / WALK; }
      else P.walkT += dt;
      P.x += dx * (P.runDir === dx ? P.runV : WALK) * dt; P.face = dx;
    }
    // a fresh press in the same direction within DTAP starts a run; letting go or turning skids
    P.clock += dt;
    if (dx !== 0 && P.lastDx === 0 && !act) {
      if (dx === P.tapDir && P.clock - P.tapTime < DTAP) { P.runDir = dx; P.runV = WALK; }
      P.tapDir = dx; P.tapTime = P.clock;
    }
    if (P.runDir && dx === -P.runDir && !act) { P.runDir = dx; P.runV = Math.max(WALK, P.runV * 0.7); }
    else if (P.runDir && dx !== P.runDir) {
      if (P.runV > WALK + 15) { P.skidDir = P.runDir; P.skidV = P.runV * 0.8; }
      P.runDir = 0; P.runV = 0;
    }
    P.lastDx = dx;
    if (P.x < -4) P.x += W + 8; else if (P.x > W + 4) P.x -= W + 8;
    this.decay(dt);
  }

  brandish(dir) { const P = this.P; P.face = dir; P.brandT = 0.32; P.brandDir = dir; }

  decay(dt) {
    const mult = 1 + 0.12 * (this.shift - 1);
    for (const m of this.machines) {
      const fixing = this.P.repairing && this.P.mach === m;
      if (fixing || m.broken) continue;
      m.health -= m.rate * mult * dt;
      if (m.health < 60) m.dirty = true;
      if (m.health <= 0) { m.health = 0; m.broken = true; this.state.strikes++; }
    }
  }

  updateCamera(dt) {
    const zt = this.P.repairing ? ZOOM_IN : 1, cam = this.cam;
    cam.z += (zt - cam.z) * Math.min(1, dt * (zt > cam.z ? 3 : 6));
    const k = (cam.z - 1) / (ZOOM_IN - 1);
    const cx = W / 2 + (this.P.x - W / 2) * k, cy = H / 2 + (this.P.y - 10 - H / 2) * k;
    const vw = W / cam.z / 2, vh = H / cam.z / 2;
    cam.cx = clamp(cx, vw, W - vw); cam.cy = clamp(cy, vh, H - vh);
    this.applyCamera();
  }

  applyCamera() {
    const c = this.cameras.main;
    c.setZoom((this.scale.width / W) * this.cam.z);
    c.centerOn(this.cam.cx, this.cam.cy);
  }

  drawMachines(t) {
    const g = this.machineGfx; g.clear();
    for (const m of this.machines) {
      const sh = (!m.broken && m.health < 30) ? (Math.random() < 0.5 ? 1 : 0) : 0;
      const x0 = Math.round(m.x - 9) + sh, y0 = FY[m.f] - 20, dead = m.broken;
      g.fillStyle(0x26282e); g.fillRect(x0 + 1, y0 + 17, 3, 3); g.fillRect(x0 + 14, y0 + 17, 3, 3);
      g.fillStyle(dead ? 0x3b3f47 : 0x5d6470); g.fillRect(x0, y0 + 5, 18, 13);
      g.fillStyle(dead ? 0x2c2f35 : 0x474d58); g.fillRect(x0 + 2, y0 + 8, 9, 8);
      g.fillStyle(dead ? 0x24262b : 0x3a3f48); for (let i = 0; i < 3; i++) g.fillRect(x0 + 3, y0 + 10 + i * 2, 7, 1);
      const stroke = dead ? 0 : Math.round(Math.sin(t * (m.health < 30 ? 22 : 9)) + 1);
      g.fillStyle(0xc9ccd2); g.fillRect(x0 + 8, y0 + 3, 2, 2 + stroke);
      g.fillStyle(dead ? 0x3b3f47 : 0x7a828f); g.fillRect(x0 + 3, y0 - stroke, 12, 4);
      g.fillStyle(0x9aa2ae); g.fillRect(x0 + 3, y0 - stroke, 12, 1);
      let lc = 0x4fd16a;
      if (dead) lc = 0x111111; else if (m.health < 30) lc = (Math.floor(t * 6) % 2) ? 0xff3b3b : 0x6b1414; else if (m.health < 60) lc = 0xf2c641;
      g.fillStyle(0x1b1c20); g.fillRect(x0 + 12, y0 + 8, 5, 5);
      g.fillStyle(lc); g.fillRect(x0 + 13, y0 + 9, 3, 3);
      g.fillStyle(0x111111); g.fillRect(x0 + 2, y0 - 6, 14, 3);
      g.fillStyle(dead ? 0x444444 : m.health < 30 ? 0xff4b4b : m.health < 60 ? 0xf2c641 : 0x4fd16a);
      g.fillRect(x0 + 3, y0 - 5, Math.max(dead ? 12 : 0, Math.round(12 * m.health / 100)), 1);
    }
  }
}
