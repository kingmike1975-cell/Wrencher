// Wrencher as stacked layers instead of one baked picture per outfit and pose:
//   back arm, body (no arms), front arm, hat
// Outfits are palettes over the same layers, so a new outfit or arm pose never needs a redrawn copy of him.
import { WREN_HD, WREN_HD_NOFRONT, WREN_HD_NOARMS_AT, WREN2_HD_LEGS, USH_TOP, WPAL, WPAL_HOT_S, TRACK_COLS, USHANKA_COLS, WREN_SHADE } from '../sprites/data.js';
import { wrenRows, diffRows, stackRows, shadePal, rowsTexture } from '../sprites/pixels.js';

const NOFRONT = wrenRows(WREN_HD, WREN_HD_NOFRONT);
const NOARMS = wrenRows(WREN_HD, WREN_HD_NOARMS_AT);
// the original ushanka: a fur crown over his hair, flaps down the side of his head
const withHat = rows => rows.map((r, i) => i < 5 ? USH_TOP[i] : i < 9 ? r.slice(0, 3) + 'FFf' + r.slice(6) : i === 9 ? r.slice(0, 3) + 'ff' + r.slice(5) : r);

export const LAYERS = {
  body: NOARMS,
  bodyWalk: NOARMS.slice(0, 24).concat(WREN2_HD_LEGS),
  backArm: diffRows(NOFRONT, NOARMS),
  frontArm: diffRows(WREN_HD, NOFRONT),
  hat: diffRows(withHat(WREN_HD), WREN_HD),
};

// sanity: the layers stacked back together must give exactly the original sprite
export function layersMatchOriginal() {
  const plain = stackRows(LAYERS.body, LAYERS.backArm, LAYERS.frontArm).join('\n') === WREN_HD.join('\n');
  const hatted = stackRows(LAYERS.body, LAYERS.backArm, LAYERS.frontArm, LAYERS.hat).join('\n') === withHat(WREN_HD).join('\n');
  return plain && hatted;
}

export const OUTFITS = {
  coveralls: {},
  tracksuit: TRACK_COLS,
};

export function palette(outfit, hot) {
  return shadePal(Object.assign({}, WPAL, OUTFITS[outfit] || {}, USHANKA_COLS, hot ? { s: WPAL_HOT_S } : {}), WREN_SHADE);
}

// texture key for one layer in one outfit and mood, made on first use
export function layerKey(scene, layer, outfit, hot) {
  return rowsTexture(scene, `wren:${layer}:${outfit}:${hot ? 'hot' : 'ok'}`, LAYERS[layer], palette(outfit, hot));
}
