// 贴图图集
//
// 地面、树木、人物用 Kenney「Tiny Town / Tiny Farm」(CC0) 的像素贴图，
// 外加自绘的水/沙/广场/温室瓦片，统一烘焙成 40px 一格打包进 atlas.png。
// 见 assets/CREDITS.txt。图片异步加载，未就绪前渲染器回退到程序化绘制。

import atlasUrl from './assets/atlas.png';

export const CELL = 40;

// 每个名字对应图集里的 [列, 行]（都是 40px 格）。
const SLOTS = {
  grass0: [0, 0], grass1: [1, 0], grass2: [2, 0],
  path: [3, 0], plaza: [4, 0], water: [5, 0], sand: [6, 0],
  farm0: [7, 0], farm1: [0, 1], green: [1, 1], rock: [2, 1], wall: [3, 1],
  tree0: [4, 1], tree1: [5, 1], tree2: [6, 1], bush: [7, 1],
  player: [0, 2], npc: [1, 2],
};

let ready = false;
const img = typeof Image !== 'undefined' ? new Image() : null;
if (img) {
  img.onload = () => {
    ready = true;
  };
  img.src = atlasUrl;
}

export function atlasReady() {
  return ready;
}

export function hasSprite(name) {
  return Boolean(SLOTS[name]);
}

/** 把图集里的某格画到画布，未就绪或没有该名字时返回 false。 */
export function drawSprite(ctx, name, dx, dy, size = CELL) {
  if (!ready || !img) return false;
  const slot = SLOTS[name];
  if (!slot) return false;
  ctx.drawImage(img, slot[0] * CELL, slot[1] * CELL, CELL, CELL, dx, dy, size, size);
  return true;
}
