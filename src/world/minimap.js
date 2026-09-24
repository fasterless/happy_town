// 小地图 / 全图预览
//
// 把 32×32 的小镇缩略成一张俯视概览：地面按类型上色、建筑与地标标出来、
// 玩家和邻居用亮点表示。同一个 drawOverview 既画角落的小地图，也画放大预览，
// 只是格子大小（tile）和是否显示地标名称不同。

import { MAP_SIZE, getGround, BUILDINGS, SPOTS } from './map.js';

// 缩略图配色：比实际渲染更鲜明，缩到很小也能分辨。
const TERRAIN = {
  grass: '#79b45f',
  path: '#d3b57e',
  plaza: '#cfc6a4',
  water: '#5aa6c4',
  sand: '#e4cd93',
  farm: '#8a5c40',
  greenhouse: '#bfe3c8',
  pasture: '#93c96a',
  rock: '#8e9892',
  forest: '#3f7548',
  wall: '#586359',
};

/**
 * 画一张地图概览。
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o
 * @param {number} o.tile 每格像素
 * @param {number} [o.ox] 左上角 x 偏移（放大预览平移用）
 * @param {number} [o.oy] 左上角 y 偏移
 * @param {{rx?:number,ry?:number,tx:number,ty:number}} o.player
 * @param {Array} [o.npcs]
 * @param {boolean} [o.showLabels] 放大预览时标出地标名称
 * @param {{x:number,y:number,w:number,h:number}} [o.viewport] 当前可视范围（格）
 * @param {number} [o.now] 时间，用于玩家点闪烁
 */
export function drawOverview(ctx, o) {
  const { tile, ox = 0, oy = 0, player, npcs = [], showLabels = false, viewport = null, now = 0 } = o;
  const cell = Math.ceil(tile) + 1;
  const at = (t) => Math.round(t * tile);

  for (let ty = 0; ty < MAP_SIZE; ty += 1) {
    for (let tx = 0; tx < MAP_SIZE; tx += 1) {
      ctx.fillStyle = TERRAIN[getGround(tx, ty)] || TERRAIN.grass;
      ctx.fillRect(ox + at(tx), oy + at(ty), cell, cell);
    }
  }

  for (const b of BUILDINGS) {
    ctx.fillStyle = b.roof;
    ctx.fillRect(ox + at(b.tx), oy + at(b.ty), Math.ceil(b.w * tile), Math.ceil(b.h * tile));
    ctx.fillStyle = 'rgba(30, 24, 20, 0.35)';
    ctx.fillRect(ox + at(b.tx), oy + at(b.ty), Math.ceil(b.w * tile), 1);
  }

  if (viewport) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      ox + at(viewport.x) + 0.5,
      oy + at(viewport.y) + 0.5,
      Math.max(2, viewport.w * tile),
      Math.max(2, viewport.h * tile),
    );
  }

  const dot = Math.max(2, Math.round(tile * 0.7));
  for (const spot of SPOTS) {
    const x = ox + at(spot.tx) + tile / 2;
    const y = oy + at(spot.ty) + tile / 2;
    ctx.fillStyle = '#f4d06b';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.5, dot / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 46, 24, 0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (showLabels) {
      ctx.font = '12px Microsoft YaHei, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const label = `${spot.icon} ${spot.name}`;
      const w = ctx.measureText(label).width + 8;
      ctx.fillStyle = 'rgba(31, 42, 34, 0.82)';
      ctx.fillRect(x - w / 2, y - dot - 18, w, 15);
      ctx.fillStyle = '#fff5d9';
      ctx.fillText(label, x, y - dot - 4);
    }
  }

  for (const npc of npcs) {
    const nx = ox + at((npc.rx ?? npc.tx)) + tile / 2;
    const ny = oy + at((npc.ry ?? npc.ty)) + tile / 2;
    ctx.fillStyle = '#e2705f';
    ctx.beginPath();
    ctx.arc(nx, ny, Math.max(1.5, dot / 2), 0, Math.PI * 2);
    ctx.fill();
  }

  const px = ox + at((player.rx ?? player.tx)) + tile / 2;
  const py = oy + at((player.ry ?? player.ty)) + tile / 2;
  const pulse = 1 + 0.25 * Math.sin(now / 260);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, Math.max(2.5, dot * 0.7 * pulse), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7fd0';
  ctx.beginPath();
  ctx.arc(px, py, Math.max(1.5, dot * 0.45), 0, Math.PI * 2);
  ctx.fill();
}
