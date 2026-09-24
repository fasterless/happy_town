// 俯视像素小镇渲染
//
// 地面与场景物件全部用整数像素绘制，地图使用正交方格，摄像机跟随玩家。

import { TILE_W, TILE_H, tileToScreen, depthSort } from './iso.js';
import { MAP_SIZE, getGround, BUILDINGS, SPOTS, FARM_PLOTS, GREENHOUSE_PLOTS } from './map.js';
import { greenhouseCrops } from '../config/greenhouse.js';
import { seedList, growthStage } from './sim.js';

const COLORS = {
  grass: ['#73b968', '#7dc471', '#69ae61'],
  path: ['#d8bd86', '#e5ca91', '#cbae76'],
  plaza: ['#c9c0a0', '#d9cfad', '#bcb28f'],
  water: ['#4d9ab2', '#58a6bc', '#438ba7'],
  sand: ['#dfc27d', '#ebd394', '#cfad66'],
  farm: ['#80543d', '#906044', '#704a37'],
  greenhouse: ['#cce5ce', '#d8edd8', '#bedbc5'],
  rock: ['#707b78', '#849087', '#68736f'],
  forest: ['#477c4d', '#528852', '#3c7047'],
  wall: ['#4c574d', '#596252', '#414d46'],
};

const SEASON_GRASS = {
  spring_bloom: ['#84c96f', '#8fd079', '#79bd66'],
  summer_cool: ['#67ac59', '#72b863', '#5da151'],
  autumn_harvest: ['#9fb85f', '#acc26c', '#93ab54'],
  winter_feast: ['#cadbcf', '#d6e5da', '#bfd2c6'],
  new_year: ['#b7c98f', '#c2d29a', '#abbd83'],
};

function hash(tx, ty, salt = 0) {
  const value = Math.sin(tx * 127.1 + ty * 311.7 + salt * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function tileRect(ctx, x, y, color, inset = 0) {
  ctx.fillStyle = color;
  ctx.fillRect(x + inset, y + inset, TILE_W - inset * 2, TILE_H - inset * 2);
}

function drawGrass(ctx, x, y, tx, ty, colors) {
  tileRect(ctx, x, y, colors[(tx + ty) % colors.length]);
  const detail = hash(tx, ty);
  if (detail > 0.48) {
    ctx.fillStyle = detail > 0.78 ? '#a9d279' : '#5b9c59';
    ctx.fillRect(x + 7 + Math.floor(hash(tx, ty, 2) * 25), y + 8 + Math.floor(hash(tx, ty, 3) * 23), 3, 2);
    ctx.fillRect(x + 10 + Math.floor(hash(tx, ty, 4) * 20), y + 25, 2, 2);
  }
  if (detail > 0.91) {
    ctx.fillStyle = '#f3d88a';
    ctx.fillRect(x + 12, y + 12, 3, 3);
    ctx.fillStyle = '#fff0bd';
    ctx.fillRect(x + 13, y + 11, 1, 1);
  }
}

function drawPath(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.path[(tx + ty) % 3]);
  ctx.fillStyle = 'rgba(113, 82, 51, 0.16)';
  ctx.fillRect(x, y + TILE_H - 3, TILE_W, 3);
  ctx.fillStyle = '#b69768';
  const pebbleX = x + 6 + Math.floor(hash(tx, ty, 4) * 27);
  const pebbleY = y + 8 + Math.floor(hash(tx, ty, 5) * 24);
  ctx.fillRect(pebbleX, pebbleY, 3, 2);
  if (hash(tx, ty, 6) > 0.45) ctx.fillRect(x + 27, y + 9 + Math.floor(hash(tx, ty, 7) * 22), 2, 2);
  ctx.fillStyle = 'rgba(255, 246, 218, 0.38)';
  ctx.fillRect(x + 2, y + 2, TILE_W - 4, 1);
}

function drawPlaza(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.plaza[(tx * 3 + ty) % 3]);
  ctx.strokeStyle = 'rgba(115, 105, 80, 0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2.5, y + 2.5, TILE_W - 5, TILE_H - 5);
  ctx.fillStyle = 'rgba(248, 239, 205, 0.42)';
  ctx.fillRect(x + 4, y + 4, TILE_W - 8, 2);
  ctx.fillRect(x + 4, y + 4, 2, TILE_H - 8);
  if ((tx + ty) % 4 === 0) {
    ctx.fillStyle = '#a39b7d';
    ctx.fillRect(x + 29, y + 28, 2, 2);
  }
}

function drawWater(ctx, x, y, tx, ty, now) {
  tileRect(ctx, x, y, COLORS.water[(tx + ty) % 3]);
  const phase = Math.floor(now / 700 + tx * 2 + ty) % 3;
  ctx.fillStyle = 'rgba(199, 238, 224, 0.5)';
  ctx.fillRect(x + 5 + phase * 5, y + 9 + (ty % 3) * 8, 11, 2);
  ctx.fillRect(x + 23 - phase * 3, y + 26 - (tx % 3) * 4, 8, 1);
  ctx.fillStyle = 'rgba(37, 101, 128, 0.24)';
  ctx.fillRect(x, y + TILE_H - 3, TILE_W, 3);
}

function drawFarm(ctx, x, y, tx, ty) {
  tileRect(ctx, x, y, COLORS.farm[(tx + ty) % 3]);
  ctx.fillStyle = 'rgba(55, 34, 27, 0.35)';
  for (let row = 0; row < 4; row += 1) {
    ctx.fillRect(x + 4, y + 5 + row * 9, TILE_W - 8, 2);
  }
  ctx.fillStyle = 'rgba(212, 160, 102, 0.45)';
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

function drawTile(ctx, ground, x, y, tx, ty, grass, now) {
  if (ground === 'grass') drawGrass(ctx, x, y, tx, ty, grass);
  else if (ground === 'path') drawPath(ctx, x, y, tx, ty);
  else if (ground === 'plaza') drawPlaza(ctx, x, y, tx, ty);
  else if (ground === 'water') drawWater(ctx, x, y, tx, ty, now);
  else if (ground === 'sand') {
    tileRect(ctx, x, y, COLORS.sand[(tx + ty) % 3]);
    ctx.fillStyle = 'rgba(154, 126, 74, 0.3)';
    ctx.fillRect(x + 8 + Math.floor(hash(tx, ty, 3) * 22), y + 12, 3, 2);
    ctx.fillRect(x + 12, y + 30 - (tx % 3) * 3, 2, 2);
  } else if (ground === 'farm') drawFarm(ctx, x, y, tx, ty);
  else if (ground === 'greenhouse') drawGreenhouseFloor(ctx, x, y, tx, ty);
  else if (ground === 'rock') drawRock(ctx, x, y, tx, ty);
  else if (ground === 'forest') {
    tileRect(ctx, x, y, COLORS.forest[(tx + ty) % 3]);
    ctx.fillStyle = '#65a05d';
    ctx.fillRect(x + 3, y + 35, TILE_W - 6, 2);
  } else if (ground === 'wall') drawRock(ctx, x, y, tx, ty);
}

function drawTree(ctx, x, y, tx, ty) {
  const variant = Math.floor(hash(tx, ty, 10) * 3);
  const greens = ['#2f6947', '#34764a', '#3c8050'];
  const crownX = x + 5 + variant * 2;
  const crownY = y + 3 + (variant % 2) * 2;
  ctx.fillStyle = 'rgba(29, 54, 39, 0.3)';
  ctx.fillRect(x + 7, y + 30, 27, 7);
  ctx.fillStyle = '#684b37';
  ctx.fillRect(x + 17, y + 21, 7, 15);
  ctx.fillStyle = '#4c392f';
  ctx.fillRect(x + 14, y + 31, 12, 4);
  ctx.fillStyle = greens[variant];
  ctx.fillRect(crownX + 4, crownY + 4, 25, 21);
  ctx.fillRect(crownX + 8, crownY, 17, 29);
  ctx.fillRect(crownX + 2, crownY + 9, 29, 13);
  ctx.fillStyle = '#57935a';
  ctx.fillRect(crownX + 9, crownY + 5, 12, 5);
  ctx.fillRect(crownX + 5, crownY + 11, 7, 4);
  ctx.fillStyle = '#285b40';
  ctx.fillRect(crownX + 22, crownY + 13, 6, 8);
  if ((tx + ty) % 3 === 0) {
    ctx.fillStyle = '#f2d57a';
    ctx.fillRect(crownX + 24, crownY + 7, 3, 3);
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

function drawCrop(ctx, cx, cy, stage, icon, watered = false) {
  if (stage <= 0) return;
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

/** 画一整帧。 */
export function renderFrame(ctx, view) {
  const { width, height, player, npcs, world, seasonId, now } = view;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#42634b';
  ctx.fillRect(0, 0, width, height);

  const playerPos = tileToScreen(player.tx, player.ty);
  const cameraX = Math.round(width / 2 - playerPos.x);
  const cameraY = Math.round(height / 2 - playerPos.y + 34);
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

  // Dense forest tiles become solid tree canopies; clearings remain walkable.
  const trees = [];
  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      if (getGround(tx, ty) === 'forest') trees.push({ tx, ty, kind: 'tree' });
    }
  }
  for (const tree of depthSort(trees)) {
    drawTree(ctx, tree.tx * TILE_W + cameraX, tree.ty * TILE_H + cameraY, tree.tx, tree.ty);
  }

  for (const building of BUILDINGS) drawBuilding(ctx, building, cameraX, cameraY);

  const crops = seedList();
  world.plots.forEach((plot, i) => {
    const spot = FARM_PLOTS[i];
    if (!spot) return;
    const crop = crops.find((item) => item.id === plot.cropId);
    const pos = tileToScreen(spot.tx, spot.ty);
    drawCrop(ctx, pos.x + cameraX, pos.y + cameraY, growthStage(plot, crop, now), crop ? crop.icon : '', plot.watered);
  });
  world.greenhouse.forEach((plot, i) => {
    const spot = GREENHOUSE_PLOTS[i];
    const crop = greenhouseCrops.find((item) => item.id === plot.cropId);
    if (!spot || !crop) return;
    const stage = now - plot.plantedAt >= Math.min(crop.growTime * 1000, 600000) ? 4 : 2;
    const pos = tileToScreen(spot.tx, spot.ty);
    drawCrop(ctx, pos.x + cameraX, pos.y + cameraY, stage, crop.icon);
  });

  for (const spot of SPOTS) {
    const pos = tileToScreen(spot.tx, spot.ty);
    const x = pos.x + cameraX;
    const y = pos.y + cameraY;
    if (x < -TILE_W || y < -TILE_H || x > width + TILE_W || y > height + TILE_H) continue;
    drawSpot(ctx, spot, x, y, now);
  }

  const actors = [
    ...npcs.map((npc) => ({ ...npc, kind: 'npc' })),
    { ...player, kind: 'player' },
  ];
  for (const actor of depthSort(actors)) {
    const pos = tileToScreen(actor.tx, actor.ty);
    const x = pos.x + cameraX;
    const y = pos.y + cameraY;
    if (x < -TILE_W || y < -TILE_H || x > width + TILE_W || y > height + TILE_H) continue;
    if (actor.kind === 'player') drawPerson(ctx, x, y, '#4f83bd', '');
    else drawPerson(ctx, x, y, '#cf716d', actor.avatar, actor.name);
  }

  // Day-night tint stays subtle enough to keep paths and interaction markers legible.
  const hour = ((now % (12 * 60 * 1000)) / (12 * 60 * 1000)) * 24;
  const darkness = Math.max(0, Math.cos(((hour - 12) / 12) * Math.PI));
  if (darkness > 0.02) {
    ctx.fillStyle = `rgba(18, 28, 54, ${darkness * 0.35})`;
    ctx.fillRect(0, 0, width, height);
  }
}
