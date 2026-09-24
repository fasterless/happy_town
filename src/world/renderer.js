// 俯视像素小镇渲染
//
// 地面与场景物件全部用整数像素绘制，地图使用正交方格，摄像机跟随玩家。
// 路面、水面按邻居做描边（autotile 式），草地散布花草，画面更精致。

import { TILE_W, TILE_H } from './iso.js';
import { MAP_SIZE, getGround, BUILDINGS, SPOTS, FARM_PLOTS, GREENHOUSE_PLOTS } from './map.js';
import { greenhouseCrops } from '../config/greenhouse.js';
import { allCrops, growthStage } from './sim.js';
import { atlasReady, drawSprite } from './atlas.js';

const COLORS = {
  grass: ['#79b45f', '#84bd69', '#71a957'],
  path: ['#d3b57e', '#dcbf88', '#c7a870'],
  plaza: ['#cfc6a4', '#dbd2ad', '#c4ba96'],
  water: ['#5aa6c4', '#69b3ce', '#4f97b6'],
  sand: ['#e4cd93', '#eed79f', '#d8bd80'],
  farm: ['#8a5c40', '#996749', '#7c5039'],
  greenhouse: ['#cfe8d1', '#dcf0db', '#c2ddc7'],
  rock: ['#7c8683', '#8e9892', '#6f7a76'],
  forest: ['#3f7548', '#4a8150', '#376a44'],
  wall: ['#586359', '#66705f', '#4c5750'],
};

const SEASON_GRASS = {
  spring_bloom: ['#84c96f', '#90d079', '#79bd66'],
  summer_cool: ['#67ac59', '#73b863', '#5da151'],
  autumn_harvest: ['#a6bb62', '#b3c56f', '#98ad56'],
  winter_feast: ['#cadbcf', '#d6e5da', '#bfd2c6'],
  new_year: ['#b7c98f', '#c2d29a', '#abbd83'],
};

const FLOWERS = ['#f2d06b', '#ef8fb0', '#d7e0f0', '#f0a35a'];

function hash(tx, ty, salt = 0) {
  const value = Math.sin(tx * 127.1 + ty * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE_W, y: (ty + 0.5) * TILE_H };
}

const isPath = (tx, ty) => {
  const g = getGround(tx, ty);
  return g === 'path' || g === 'plaza';
};
const isWater = (tx, ty) => getGround(tx, ty) === 'water';

function tileRect(ctx, x, y, color, inset = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(x + inset, y + inset, TILE_W - inset * 2, TILE_H - inset * 2);
}

// 沿着「和邻居不同」的边描一条内边，autotile 的观感来源。
function drawInnerEdges(ctx, x, y, tx, ty, same, color, w) {
  ctx.fillStyle = color;
  if (!same(tx, ty - 1)) ctx.fillRect(x, y, TILE_W, w);
  if (!same(tx, ty + 1)) ctx.fillRect(x, y + TILE_H - w, TILE_W, w);
  if (!same(tx - 1, ty)) ctx.fillRect(x, y, w, TILE_H);
  if (!same(tx + 1, ty)) ctx.fillRect(x + TILE_W - w, y, w, TILE_H);
}

function drawGrass(ctx, x, y, tx, ty, colors) {
  tileRect(ctx, x, y, colors[(tx * 2 + ty) % colors.length]);
  // 轻微的斑驳，让大片草地不至于死板。
  if (hash(tx, ty, 1) > 0.62) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(x, y, TILE_W, TILE_H);
  }
  const detail = hash(tx, ty);
  if (detail > 0.4) {
    ctx.fillStyle = detail > 0.78 ? '#a6d275' : '#5f9f5a';
    const bx = x + 6 + Math.floor(hash(tx, ty, 2) * 26);
    const by = y + 9 + Math.floor(hash(tx, ty, 3) * 22);
    ctx.fillRect(bx, by, 2, 4);
    ctx.fillRect(bx + 3, by + 1, 2, 3);
  }
  if (detail > 0.88) {
    const petal = FLOWERS[Math.floor(hash(tx, ty, 5) * FLOWERS.length)];
    const fx = x + 10 + Math.floor(hash(tx, ty, 6) * 18);
    const fy = y + 10 + Math.floor(hash(tx, ty, 7) * 18);
    ctx.fillStyle = petal;
    ctx.fillRect(fx, fy - 2, 2, 2);
    ctx.fillRect(fx - 2, fy, 2, 2);
    ctx.fillRect(fx + 2, fy, 2, 2);
    ctx.fillRect(fx, fy + 2, 2, 2);
    ctx.fillStyle = '#fff4c9';
    ctx.fillRect(fx, fy, 2, 2);
  }
}

function drawPath(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.path[(tx + ty) % 3]);
  // 和草地相接的边压深一档，像是被踩出来的路肩。
  drawInnerEdges(ctx, x, y, tx, ty, isPath, 'rgba(150, 116, 70, 0.5)', 3);
  ctx.fillStyle = 'rgba(255, 246, 214, 0.28)';
  ctx.fillRect(x + 3, y + 3, TILE_W - 6, 1);
  ctx.fillStyle = '#b89468';
  const pebbleX = x + 7 + Math.floor(hash(tx, ty, 4) * 24);
  const pebbleY = y + 9 + Math.floor(hash(tx, ty, 5) * 22);
  ctx.fillRect(pebbleX, pebbleY, 3, 2);
  if (hash(tx, ty, 6) > 0.5) ctx.fillRect(x + 26, y + 10 + Math.floor(hash(tx, ty, 7) * 18), 2, 2);
}
function drawPlaza(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.plaza[(tx * 3 + ty) % 3]);
  ctx.strokeStyle = 'rgba(120, 108, 82, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2.5, y + 2.5, TILE_W - 5, TILE_H - 5);
  ctx.fillStyle = 'rgba(250, 242, 210, 0.4)';
  ctx.fillRect(x + 4, y + 4, TILE_W - 8, 2);
  ctx.fillRect(x + 4, y + 4, 2, TILE_H - 8);
  if ((tx + ty) % 4 === 0) {
    ctx.fillStyle = '#a79d7c';
    ctx.fillRect(x + 28, y + 27, 3, 3);
  }
}

function drawWater(ctx, x, y, tx, ty, now) {
  tileRect(ctx, x, y, COLORS.water[(tx + ty) % 3]);
  const phase = Math.floor(now / 700 + tx * 2 + ty) % 3;
  ctx.fillStyle = 'rgba(206, 240, 228, 0.5)';
  ctx.fillRect(x + 5 + phase * 5, y + 9 + (ty % 3) * 8, 11, 2);
  ctx.fillRect(x + 23 - phase * 3, y + 26 - (tx % 3) * 4, 8, 1);
  // 岸边泛白的浪花，只画在挨着陆地的一侧。
  drawInnerEdges(ctx, x, y, tx, ty, isWater, 'rgba(224, 245, 240, 0.55)', 3);
  // 偶尔一片睡莲，点缀湖面。
  if (hash(tx, ty, 12) > 0.82 && isWater(tx, ty - 1) && isWater(tx, ty + 1)) {
    const lx = x + 12 + Math.floor(hash(tx, ty, 13) * 12);
    const ly = y + 14 + Math.floor(hash(tx, ty, 14) * 10);
    ctx.fillStyle = '#5aa15a';
    ctx.fillRect(lx, ly, 8, 6);
    ctx.fillStyle = '#6fb56a';
    ctx.fillRect(lx + 1, ly + 1, 3, 2);
    if (hash(tx, ty, 15) > 0.5) {
      ctx.fillStyle = '#f2a6c4';
      ctx.fillRect(lx + 3, ly - 2, 3, 3);
    }
  }
}

function drawSand(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.sand[(tx + ty) % 3]);
  ctx.fillStyle = 'rgba(154, 126, 74, 0.28)';
  ctx.fillRect(x + 8 + Math.floor(hash(tx, ty, 3) * 20), y + 12, 3, 2);
  ctx.fillRect(x + 12, y + 30 - (tx % 3) * 3, 2, 2);
}

function drawFarm(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.farm[(tx + ty) % 3]);
  ctx.fillStyle = 'rgba(55, 34, 27, 0.35)';
  for (let row = 0; row < 4; row += 1) {
    ctx.fillRect(x + 4, y + 5 + row * 9, TILE_W - 8, 2);
  }
  ctx.fillStyle = 'rgba(214, 162, 104, 0.45)';
  ctx.fillRect(x + 5, y + 7, TILE_W - 10, 2);
}

function drawGreenhouseFloor(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.greenhouse[(tx + ty) % 3]);
  ctx.fillStyle = 'rgba(87, 143, 105, 0.34)';
  ctx.fillRect(x + 2, y + 3, TILE_W - 4, 2);
  ctx.fillRect(x + 2, y + TILE_H - 5, TILE_W - 4, 2);
  ctx.fillRect(x + 3, y + 5, 2, TILE_H - 10);
  ctx.fillRect(x + TILE_W - 5, y + 5, 2, TILE_H - 10);
}

function drawRock(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.rock[(tx + ty) % 3]);
  const ox = 5 + Math.floor(hash(tx, ty, 8) * 13);
  const oy = 7 + Math.floor(hash(tx, ty, 9) * 10);
  ctx.fillStyle = '#9ba49a';
  ctx.fillRect(x + ox, y + oy, 19, 12);
  ctx.fillRect(x + ox + 4, y + oy - 4, 12, 4);
  ctx.fillStyle = '#505d59';
  ctx.fillRect(x + ox + 2, y + oy + 9, 16, 3);
  ctx.fillStyle = '#b2b49a';
  ctx.fillRect(x + ox + 5, y + oy + 2, 5, 2);
}

function drawForestFloor(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.forest[(tx + ty) % 3]);
  ctx.fillStyle = 'rgba(30, 60, 40, 0.35)';
  ctx.fillRect(x + 3, y + 34, TILE_W - 6, 3);
}

// 地面类型 + 坐标 → 图集里的贴图名（草地/农田按位置换个变体）。
function groundSprite(ground, tx, ty) {
  if (ground === 'grass' || ground === 'forest') {
    const r = hash(tx, ty);
    return r > 0.9 ? 'grass2' : r > 0.72 ? 'grass1' : 'grass0';
  }
  if (ground === 'path') return 'path';
  if (ground === 'plaza') return 'plaza';
  if (ground === 'water') return 'water';
  if (ground === 'sand') return 'sand';
  if (ground === 'farm') return (tx + ty) % 2 ? 'farm0' : 'farm1';
  if (ground === 'greenhouse') return 'green';
  if (ground === 'rock') return 'rock';
  if (ground === 'wall') return 'wall';
  return 'grass0';
}

function drawTile(ctx, ground, x, y, tx, ty, grass, now) {
  if (atlasReady() && drawSprite(ctx, groundSprite(ground, tx, ty), x, y)) return;
  if (ground === 'grass') drawGrass(ctx, x, y, tx, ty, grass);
  else if (ground === 'path') drawPath(ctx, x, y, tx, ty);
  else if (ground === 'plaza') drawPlaza(ctx, x, y, tx, ty);
  else if (ground === 'water') drawWater(ctx, x, y, tx, ty, now);
  else if (ground === 'sand') drawSand(ctx, x, y, tx, ty);
  else if (ground === 'farm') drawFarm(ctx, x, y, tx, ty);
  else if (ground === 'greenhouse') drawGreenhouseFloor(ctx, x, y, tx, ty);
  else if (ground === 'rock') drawRock(ctx, x, y, tx, ty);
  else if (ground === 'forest') drawForestFloor(ctx, x, y, tx, ty);
  else if (ground === 'wall') drawRock(ctx, x, y, tx, ty);
  else drawGrass(ctx, x, y, tx, ty, grass);
}
function drawTree(ctx, x, y, tx, ty) {
  const v = Math.floor(hash(tx, ty, 10) * 3);
  const sway = Math.floor(hash(tx, ty, 16) * 3) - 1;
  // 落地的软阴影。
  ctx.fillStyle = 'rgba(26, 44, 32, 0.26)';
  ctx.fillRect(x + 9, y + 32, 24, 6);
  ctx.fillRect(x + 12, y + 36, 18, 2);
  // 树干。
  ctx.fillStyle = '#6b4a33';
  ctx.fillRect(x + 17, y + 22, 6, 14);
  ctx.fillStyle = '#553a2a';
  ctx.fillRect(x + 17, y + 22, 2, 14);
  // 分三层叠出圆润的树冠（仍是像素方块，只是层次更多）。
  const dark = ['#2f6b42', '#356f3c', '#2c6047'][v];
  const mid = ['#3f854f', '#458a4a', '#3c7d55'][v];
  const light = ['#5aa564', '#61ab5d', '#57a06a'][v];
  const cx = x + 8 + sway;
  const cy = y + 2;
  ctx.fillStyle = dark;
  ctx.fillRect(cx + 3, cy + 6, 22, 18);
  ctx.fillRect(cx + 7, cy + 2, 14, 24);
  ctx.fillRect(cx, cy + 10, 28, 10);
  ctx.fillStyle = mid;
  ctx.fillRect(cx + 6, cy + 5, 16, 12);
  ctx.fillRect(cx + 2, cy + 11, 10, 7);
  ctx.fillRect(cx + 17, cy + 12, 8, 6);
  ctx.fillStyle = light;
  ctx.fillRect(cx + 8, cy + 4, 8, 5);
  ctx.fillRect(cx + 5, cy + 9, 5, 4);
  if ((tx + ty) % 3 === 0) {
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(cx + 20, cy + 8, 3, 3);
    ctx.fillRect(cx + 6, cy + 18, 3, 3);
  }
}

function drawBuilding(ctx, building, cameraX, cameraY) {
  const x = Math.round(building.tx * TILE_W + cameraX);
  const y = Math.round(building.ty * TILE_H + cameraY);
  const width = building.w * TILE_W;
  const height = building.h * TILE_H;
  const depth = 12;

  ctx.fillStyle = 'rgba(37, 49, 37, 0.25)';
  ctx.fillRect(x + 7, y + 11, width, height + depth);
  ctx.fillStyle = '#594b3d';
  ctx.fillRect(x + 3, y + 4, width - 6, height + depth);
  ctx.fillStyle = building.color;
  ctx.fillRect(x + 6, y + 8, width - 12, height + 2);

  // Facade and doorway face the south edge of the map.
  ctx.fillStyle = building.trim;
  ctx.fillRect(x + 7, y + height - 15, width - 14, 3);
  ctx.fillStyle = '#58453b';
  ctx.fillRect(x + width / 2 - 8, y + height - 18, 16, 20);
  ctx.fillStyle = '#f0c96f';
  ctx.fillRect(x + width / 2 + 3, y + height - 9, 2, 2);
  ctx.fillStyle = '#f4d68f';
  ctx.fillRect(x + 14, y + height - 14, 12, 10);
  ctx.fillRect(x + width - 26, y + height - 14, 12, 10);
  ctx.fillStyle = '#6c8f8a';
  ctx.fillRect(x + 16, y + height - 12, 8, 6);
  ctx.fillRect(x + width - 24, y + height - 12, 8, 6);
  ctx.fillStyle = '#f7e6af';
  ctx.fillRect(x + 19, y + height - 12, 2, 6);
  ctx.fillRect(x + width - 21, y + height - 12, 2, 6);

  // Roof field with clean pixel shingle rows and a bright ridge.
  const roofX = x + 3;
  const roofY = y + 2;
  const roofW = width - 6;
  const roofH = height - 18;
  ctx.fillStyle = building.roof;
  ctx.fillRect(roofX, roofY, roofW, roofH);
  ctx.fillStyle = 'rgba(32, 37, 38, 0.22)';
  ctx.fillRect(roofX, roofY + roofH - 5, roofW, 5);
  for (let row = 0; row < Math.floor(roofH / 10); row += 1) {
    const rowY = roofY + 7 + row * 10;
    ctx.fillStyle = row % 2 ? 'rgba(255, 229, 174, 0.12)' : 'rgba(48, 40, 37, 0.12)';
    ctx.fillRect(roofX + 4, rowY, roofW - 8, 2);
    const offset = row % 2 ? 11 : 24;
    for (let sx = roofX + offset; sx < roofX + roofW; sx += 28) {
      ctx.fillRect(sx, rowY - 2, 2, 7);
    }
  }
  ctx.fillStyle = building.trim;
  ctx.fillRect(roofX + 5, roofY + 5, roofW - 10, 3);
  ctx.fillStyle = 'rgba(38, 37, 35, 0.78)';
  ctx.fillRect(x + 5, y - 18, width - 10, 16);
  ctx.fillStyle = '#fff0ca';
  ctx.font = 'bold 11px Microsoft YaHei, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(building.name, x + width / 2, y - 10, width - 16);
}
function drawPerson(ctx, cx, cy, color, marker, name = '') {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.fillStyle = 'rgba(27, 43, 35, 0.3)';
  ctx.fillRect(x - 10, y + 10, 20, 5);
  ctx.fillStyle = '#4c463e';
  ctx.fillRect(x - 6, y + 6, 5, 5);
  ctx.fillRect(x + 2, y + 6, 5, 5);
  ctx.fillStyle = '#f0c49a';
  ctx.fillRect(x - 6, y - 11, 12, 14);
  ctx.fillStyle = color;
  ctx.fillRect(x - 10, y - 3, 20, 15);
  ctx.fillStyle = '#fff0c7';
  ctx.fillRect(x - 11, y - 1, 3, 9);
  ctx.fillRect(x + 8, y - 1, 3, 9);
  ctx.fillStyle = '#49372f';
  ctx.fillRect(x - 7, y - 14, 14, 5);
  ctx.fillRect(x - 6, y - 17, 11, 4);
  ctx.fillStyle = '#3d302b';
  ctx.fillRect(x - 3, y - 7, 2, 2);
  ctx.fillRect(x + 3, y - 7, 2, 2);
  if (marker) {
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker, x, y - 23);
  }
  if (name) {
    ctx.font = '10px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelWidth = Math.max(34, ctx.measureText(name).width + 8);
    ctx.fillStyle = 'rgba(31, 48, 39, 0.78)';
    ctx.fillRect(x - labelWidth / 2, y - 38, labelWidth, 14);
    ctx.fillStyle = '#fff5d9';
    ctx.fillText(name, x, y - 31);
  }
}

// 图集就绪时用 Kenney 的小人贴图；画影子并把贴图脚底对齐格中心。
function drawActorSprite(ctx, cx, cy, kind) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.fillStyle = 'rgba(27, 43, 35, 0.3)';
  ctx.fillRect(x - 10, y + 8, 20, 5);
  return drawSprite(ctx, kind === 'player' ? 'player' : 'npc', x - 20, y - 30, 40);
}

// 邻居头顶的表情与名牌，和程序化小人共用一套样式。
function drawActorLabel(ctx, cx, cy, marker, name) {
  const x = Math.round(cx);
  const y = Math.round(cy);
  if (marker) {
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker, x, y - 34);
  }
  if (name) {
    ctx.font = '10px Microsoft YaHei, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelWidth = Math.max(34, ctx.measureText(name).width + 8);
    ctx.fillStyle = 'rgba(31, 48, 39, 0.78)';
    ctx.fillRect(x - labelWidth / 2, y - 50, labelWidth, 14);
    ctx.fillStyle = '#fff5d9';
    ctx.fillText(name, x, y - 43);
  }
}

function drawSpot(ctx, spot, x, y, now) {
  const pulse = Math.floor(now / 450 + spot.tx + spot.ty) % 2;
  ctx.fillStyle = 'rgba(42, 55, 43, 0.25)';
  ctx.fillRect(x - 12, y + 9, 24, 5);
  ctx.fillStyle = pulse ? '#fff2c3' : '#f5dc9c';
  ctx.fillRect(x - 12, y - 18, 24, 24);
  ctx.fillStyle = '#735b3e';
  ctx.fillRect(x - 12, y - 18, 24, 3);
  ctx.fillRect(x - 12, y + 3, 24, 3);
  ctx.fillRect(x - 12, y - 18, 3, 24);
  ctx.fillRect(x + 9, y - 18, 3, 24);
  ctx.font = '15px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(spot.icon, x, y - 6);
  ctx.font = '10px Microsoft YaHei, sans-serif';
  const labelWidth = Math.max(40, ctx.measureText(spot.name).width + 10);
  ctx.fillStyle = 'rgba(39, 54, 44, 0.82)';
  ctx.fillRect(x - labelWidth / 2, y - 35, labelWidth, 13);
  ctx.fillStyle = '#fff7df';
  ctx.fillText(spot.name, x, y - 28);
}

function drawCrop(ctx, cx, cy, stage, icon, watered = false) {  if (stage <= 0) return;
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.fillStyle = 'rgba(34, 43, 31, 0.26)';
  ctx.fillRect(x - 11, y + 8, 22, 4);
  if (watered) {
    ctx.fillStyle = '#72b7bf';
    ctx.fillRect(x + 10, y + 8, 5, 3);
  }
  ctx.fillStyle = '#356e44';
  const size = stage === 1 ? 5 : stage === 2 ? 8 : stage === 3 ? 11 : 13;
  ctx.fillRect(x - 2, y - size + 7, 4, size);
  if (stage >= 2) {
    ctx.fillRect(x - 8, y - size + 8, 7, 4);
    ctx.fillRect(x + 2, y - size + 3, 7, 4);
  }
  if (stage >= 3) {
    ctx.fillStyle = '#5c9a52';
    ctx.fillRect(x - 11, y - 6, 7, 4);
    ctx.fillRect(x + 4, y - 10, 8, 4);
  }
  if (stage === 4) {
    ctx.fillStyle = '#f1c953';
    ctx.fillRect(x - 3, y - size - 3, 6, 6);
    ctx.font = '13px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y - size - 7);
  }
}
// 邻居头顶的小红心，好感越高越多（最多 5 颗）。
function drawHearts(ctx, cx, cy, hearts) {
  const n = Math.max(0, Math.min(5, hearts));
  if (!n) return;
  const x = Math.round(cx);
  const y = Math.round(cy) - 56;
  ctx.font = '9px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff5a7a';
  ctx.fillText('❤'.repeat(n), x, y);
}

/** 画一整帧。 */
export function renderFrame(ctx, view) {
  const { width, height, player, npcs, world, seasonId, now, weather } = view;
  const cameraOffsetY = view.cameraY ?? 34;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#3c5a48';
  ctx.fillRect(0, 0, width, height);

  const cameraX = Math.round(width / 2 - (player.rx + 0.5) * TILE_W);
  const cameraY = Math.round(height / 2 - (player.ry + 0.5) * TILE_H + cameraOffsetY);
  const grass = SEASON_GRASS[seasonId] || COLORS.grass;
  const minX = Math.max(0, Math.floor(-cameraX / TILE_W) - 1);
  const maxX = Math.min(MAP_SIZE - 1, Math.ceil((width - cameraX) / TILE_W) + 1);
  const minY = Math.max(0, Math.floor(-cameraY / TILE_H) - 1);
  const maxY = Math.min(MAP_SIZE - 1, Math.ceil((height - cameraY) / TILE_H) + 1);

  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      const x = Math.round(tx * TILE_W + cameraX);
      const y = Math.round(ty * TILE_H + cameraY);
      drawTile(ctx, getGround(tx, ty), x, y, tx, ty, grass, now);
    }
  }

  // Dense forest tiles become tree canopies; drawn top-to-bottom so近处压住远处。
  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (getGround(tx, ty) !== 'forest') continue;
      const x = tx * TILE_W + cameraX;
      const y = ty * TILE_H + cameraY;
      if (atlasReady()) {
        const r = hash(tx, ty, 10);
        const name = r > 0.86 ? 'bush' : `tree${Math.floor(hash(tx, ty, 11) * 3) % 3}`;
        // 轻微的落地阴影，让树站在地上。
        ctx.fillStyle = 'rgba(26, 44, 32, 0.22)';
        ctx.fillRect(x + 9, y + 30, 22, 6);
        drawSprite(ctx, name, x, y);
      } else {
        drawTree(ctx, x, y, tx, ty);
      }
    }
  }

  for (const building of BUILDINGS) drawBuilding(ctx, building, cameraX, cameraY);

  const crops = allCrops();
  world.plots.forEach((plot, i) => {
    const spot = FARM_PLOTS[i];
    if (!spot) return;
    const crop = crops.find((item) => item.id === plot.cropId);
    const pos = tileCenter(spot.tx, spot.ty);
    const watered = plot.watered || weather?.id === 'rainy';
    drawCrop(ctx, pos.x + cameraX, pos.y + cameraY, growthStage(plot, crop, now, weather), crop ? crop.icon : '', watered);
  });
  world.greenhouse.forEach((plot, i) => {
    const spot = GREENHOUSE_PLOTS[i];
    const crop = greenhouseCrops.find((item) => item.id === plot.cropId);
    if (!spot || !crop) return;
    const stage = now - plot.plantedAt >= Math.min(crop.growTime * 1000, 600000) ? 4 : 2;
    const pos = tileCenter(spot.tx, spot.ty);
    drawCrop(ctx, pos.x + cameraX, pos.y + cameraY, stage, crop.icon);
  });

  for (const spot of SPOTS) {
    const pos = tileCenter(spot.tx, spot.ty);
    const x = pos.x + cameraX;
    const y = pos.y + cameraY;
    if (x < -TILE_W || y < -TILE_H || x > width + TILE_W || y > height + TILE_H) continue;
    drawSpot(ctx, spot, x, y, now);
  }

  // 玩家与邻居都用插值坐标，按 y 排序保证前后遮挡自然。
  const actors = [
    ...npcs.map((npc) => ({
      rx: npc.rx ?? npc.tx, ry: npc.ry ?? npc.ty, kind: 'npc', avatar: npc.avatar, name: npc.name, hearts: npc.hearts || 0,
    })),
    { rx: player.rx, ry: player.ry, kind: 'player' },
  ];
  actors.sort((a, b) => a.ry - b.ry);
  for (const actor of actors) {
    const x = (actor.rx + 0.5) * TILE_W + cameraX;
    const y = (actor.ry + 0.5) * TILE_H + cameraY;
    if (x < -TILE_W || y < -TILE_H || x > width + TILE_W || y > height + TILE_H) continue;
    if (atlasReady() && drawActorSprite(ctx, x, y, actor.kind)) {
      if (actor.kind !== 'player') drawActorLabel(ctx, x, y, actor.avatar, actor.name);
    } else if (actor.kind === 'player') {
      drawPerson(ctx, x, y, '#4f83bd', '');
    } else {
      drawPerson(ctx, x, y, '#cf716d', actor.avatar, actor.name);
    }
    if (actor.kind === 'npc' && actor.hearts > 0) drawHearts(ctx, x, y, actor.hearts);
  }

  // 昼夜滤镜：午夜最暗、正午最亮（view.hour 是 0~24 的游戏小时）。
  const hour = view.hour ?? 12;
  const nightAmt = Math.max(0, Math.cos((hour / 24) * Math.PI * 2));
  if (nightAmt > 0.02) {
    ctx.fillStyle = `rgba(18, 28, 54, ${nightAmt * 0.42})`;
    ctx.fillRect(0, 0, width, height);
  }

  // 雨天：斜向雨丝加一层冷色。
  if (weather?.id === 'rainy') {
    ctx.fillStyle = 'rgba(120, 150, 190, 0.10)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(205, 222, 240, 0.32)';
    ctx.lineWidth = 1;
    const drift = (now / 6) % 40;
    ctx.beginPath();
    for (let i = -40; i < width + 40; i += 22) {
      const rx = i + drift;
      ctx.moveTo(rx, 0);
      ctx.lineTo(rx - 12, height);
    }
    ctx.stroke();
  }

  // 轻微的暗角，把视线收拢到小镇中心。
  const vignette = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(20, 24, 20, 0.28)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

