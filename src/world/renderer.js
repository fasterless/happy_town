// 像素小镇的画面
//
// 全部程序化绘制，不依赖图片素材。地面是扁菱形，建筑、人物、作物
// 都是色块。关闭抗锯齿，放大小图时边缘保持像素感。

import { TILE_W, TILE_H, tileToScreen, depthSort } from './iso.js';
import { MAP_SIZE, getGround, BUILDINGS, SPOTS, FARM_PLOTS, GREENHOUSE_PLOTS } from './map.js';
import { greenhouseCrops } from '../config/greenhouse.js';
import { seedList, growthStage } from './sim.js';

const GROUND_COLORS = {
  grass: ['#7ec06a', '#8dcb78'],
  path: ['#e6d3a3', '#f0e0b8'],
  water: ['#6fb4d6', '#8cc8e2'],
  floor: ['#d9c8a4', '#e6d6b4'],
  farm: ['#a66f45', '#b67d52'],
  greenhouse: ['#d8efe4', '#e7f7ee'],
  rock: ['#9aa0a6', '#b0b6bb'],
  wall: ['#6b6358', '#6b6358'],
  sand: ['#ecd59a', '#f6e3b0'],
};

// 季节只改草地的颜色，其余地面不动。
const SEASON_GRASS = {
  spring_bloom: ['#8fd07a', '#b7e39a'],
  summer_cool: ['#5ea84d', '#78c062'],
  autumn_harvest: ['#c4a24a', '#d4b45e'],
  winter_feast: ['#d5e2dc', '#e7f0ea'],
  new_year: ['#e7b3b3', '#f2caca'],
};

function diamond(ctx, cx, cy, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - TILE_H / 2);
  ctx.lineTo(cx + TILE_W / 2, cy);
  ctx.lineTo(cx, cy + TILE_H / 2);
  ctx.lineTo(cx - TILE_W / 2, cy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCrop(ctx, cx, cy, stage, icon) {
  if (stage <= 0) return;
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(cx - 2, cy - 4, 4, 3);
  if (stage === 1) return;
  ctx.fillStyle = stage === 4 ? '#3f8f3a' : '#6aaa4e';
  ctx.fillRect(cx - 1, cy - 8 - stage * 2, 2, 6 + stage);
  if (stage >= 3) {
    ctx.fillStyle = '#3f8f3a';
    ctx.fillRect(cx - 4, cy - 10 - stage, 3, 2);
    ctx.fillRect(cx + 1, cy - 9 - stage, 3, 2);
  }
  if (stage === 4) {
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillText(icon, cx, cy - 20);
  }
}

function drawBuilding(ctx, building, originX, originY) {
  const base = tileToScreen(building.tx, building.ty);
  const far = tileToScreen(building.tx + building.w - 1, building.ty + building.h - 1);
  const cx = originX + (base.x + far.x) / 2;
  const cy = originY + (base.y + far.y) / 2;
  const width = (building.w + building.h) * (TILE_W / 4);
  const depth = (building.w + building.h) * (TILE_H / 4);
  ctx.fillStyle = building.color;
  ctx.fillRect(cx - width / 2, cy - depth - 26, width, 30);
  ctx.fillStyle = building.roof;
  ctx.beginPath();
  ctx.moveTo(cx, cy - depth - 48);
  ctx.lineTo(cx + width / 2 + 4, cy - depth - 24);
  ctx.lineTo(cx - width / 2 - 4, cy - depth - 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5e6c4';
  ctx.fillRect(cx - 4, cy - depth - 16, 8, 12);
}

function drawPerson(ctx, cx, cy, color, marker) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(cx - 5, cy - 18, 10, 14);
  ctx.fillStyle = '#f3d2b0';
  ctx.fillRect(cx - 4, cy - 26, 8, 8);
  if (marker) {
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.fillText(marker, cx, cy - 30);
  }
}

/**
 * 画一整帧。
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} view 画布像素尺寸、玩家、邻居、世界状态、季节 id、now
 */
export function renderFrame(ctx, view) {
  const { width, height, player, npcs, world, seasonId, now } = view;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);

  const center = tileToScreen(player.tx, player.ty);
  const originX = Math.round(width / 2 - center.x);
  const originY = Math.round(height / 2 - center.y - 40);

  const grass = SEASON_GRASS[seasonId] || GROUND_COLORS.grass;
  const tiles = [];
  for (let ty = 0; ty < MAP_SIZE; ty += 1) {
    for (let tx = 0; tx < MAP_SIZE; tx += 1) {
      const ground = getGround(tx, ty);
      if (ground === 'wall') continue;
      tiles.push({ tx, ty, ground });
    }
  }

  for (const tile of depthSort(tiles)) {
    const pos = tileToScreen(tile.tx, tile.ty);
    const cx = originX + pos.x;
    const cy = originY + pos.y;
    if (cx < -TILE_W || cy < -TILE_H || cx > width + TILE_W || cy > height + TILE_H) continue;
    const pair = tile.ground === 'grass' ? grass : GROUND_COLORS[tile.ground];
    const shade = (tile.tx + tile.ty) % 2 === 0 ? pair[0] : pair[1];
    diamond(ctx, cx, cy, shade);
    if (tile.ground === 'water') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(cx - 6, cy - 1, 5, 2);
    }
  }

  const sprites = [
    ...BUILDINGS.map((b) => ({ ...b, kind: 'building' })),
    ...SPOTS.map((s) => ({ ...s, kind: 'spot' })),
    { kind: 'player', tx: player.tx, ty: player.ty },
    ...npcs.map((n) => ({ kind: 'npc', ...n })),
  ];

  for (const sprite of depthSort(sprites)) {
    if (sprite.kind === 'building') {
      drawBuilding(ctx, sprite, originX, originY);
      continue;
    }
    const pos = tileToScreen(sprite.tx, sprite.ty);
    const cx = originX + pos.x;
    const cy = originY + pos.y;
    if (sprite.kind === 'player') drawPerson(ctx, cx, cy, '#4b80a8', '');
    else if (sprite.kind === 'npc') drawPerson(ctx, cx, cy, '#d87373', sprite.avatar);
    else {
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText(sprite.icon, cx, cy - 6);
    }
  }

  const crops = seedList();
  world.plots.forEach((plot, i) => {
    const spot = FARM_PLOTS[i];
    if (!spot) return;
    const crop = crops.find((c) => c.id === plot.cropId);
    const pos = tileToScreen(spot.tx, spot.ty);
    drawCrop(ctx, originX + pos.x, originY + pos.y, growthStage(plot, crop, now), crop ? crop.icon : '');
  });
  world.greenhouse.forEach((plot, i) => {
    const spot = GREENHOUSE_PLOTS[i];
    const crop = greenhouseCrops.find((c) => c.id === plot.cropId);
    if (!spot || !crop) return;
    const stage = now - plot.plantedAt >= Math.min(crop.growTime * 1000, 600000) ? 4 : 2;
    const pos = tileToScreen(spot.tx, spot.ty);
    drawCrop(ctx, originX + pos.x, originY + pos.y, stage, crop.icon);
  });

  // 昼夜：用一层半透明遮罩，午夜最暗，正午完全透明。
  const hour = ((now % (12 * 60 * 1000)) / (12 * 60 * 1000)) * 24;
  const darkness = Math.max(0, Math.cos(((hour - 12) / 12) * Math.PI));
  if (darkness > 0.02) {
    ctx.fillStyle = `rgba(18, 24, 58, ${darkness * 0.55})`;
    ctx.fillRect(0, 0, width, height);
  }
}
