// Turning letter-row sprites into Phaser textures. Same format as the original build: one letter per pixel,
// '.' is clear, each letter looks up a colour in a palette. 2x sprites may add "shade" letters, worked out
// from a base letter so every palette (hot, tracksuit, rank coats) gets matching shades.

export const wrenRows = (base, at) => base.map((r, i) => at[i] || r);

// keep only the pixels where `a` differs from `b` (the bit a layer adds on top)
export const diffRows = (a, b) => a.map((r, i) => [...r].map((c, j) => (c !== (b[i] || '')[j] ? c : '.')).join(''));

// stack layers: later rows paint over earlier ones wherever they aren't clear
export const stackRows = (...layers) => layers[0].map((_, i) => {
  const w = Math.max(...layers.map(l => (l[i] || '').length));
  let out = '';
  for (let j = 0; j < w; j++) {
    let c = '.';
    for (const l of layers) { const d = (l[i] || '')[j]; if (d && d !== '.') c = d; }
    out += c;
  }
  return out;
});

export function hdShade(hex, k) {
  if (hex.length === 4) hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return '#' + ch.map(v => v.toString(16).padStart(2, '0')).join('');
}

export function shadePal(pal, shade) {
  const out = Object.assign({}, pal);
  for (const k in shade) { const [base, amt] = shade[k]; if (!(k in pal) && pal[base]) out[k] = hdShade(pal[base], amt); }
  return out;
}

// paint rows into a canvas texture under `key` (skipped if it already exists)
export function rowsTexture(scene, key, rows, pal) {
  if (scene.textures.exists(key)) return key;
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const tex = scene.textures.createCanvas(key, w, h), c = tex.getContext();
  for (let r = 0; r < h; r++) for (let i = 0; i < rows[r].length; i++) {
    const ch = rows[r][i];
    if (ch === '.' || !pal[ch]) continue;
    c.fillStyle = pal[ch]; c.fillRect(i, r, 1, 1);
  }
  tex.refresh();
  return key;
}
