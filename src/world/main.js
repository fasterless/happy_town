// 像素小镇入口
//
// 把地图、输入、模拟和画面接在一起。玩法规则都在 sim.js，
// 这里只负责「玩家走过去、按键、看到结果」。
//
// 控制方式：
//   · 手机：点击地面 → 自动寻路走到那格（点击到达）。
//   · 电脑：鼠标点地走过去，或用方向键 / WASD 直接走；E/空格互动。
// 移动逐格插值、摄像机平滑跟随，避免瞬移带来的眩晕。

import { screenToTile, TILE_W, TILE_H } from './iso.js';
import { isBlocked, isAdjacent, SPOTS, FARM_PLOTS, GREENHOUSE_PLOTS, SPAWN, MAP_SIZE } from './map.js';
import { findPath } from './pathfind.js';
import { renderFrame } from './renderer.js';
import { drawOverview } from './minimap.js';
import { createInput } from './input.js';
import { startLoop } from './loop.js';
import { playTone } from './audio.js';
import { createNpcs, stepNpcs, nearbyNpc, dialogueOf } from './npc.js';
import { loadWorld, saveWorld } from './save.js';
import { getCurrentSeasonalEvent } from '../config/seasons.js';
import { greenhouseCrops } from '../config/greenhouse.js';
import { craftingRecipes } from '../config/crafting.js';
import { dishes } from '../config/dishes.js';
import {
  seedList,
  growthStage,
  plantSeed,
  waterPlot,
  harvestPlot,
  sellCrop,
  plantGreenhouse,
  harvestGreenhouse,
  startCraft,
  collectCraft,
  cookDish,
  castLine,
  sellFish,
  digMine,
  upgradePick,
  sellOre,
  serveGuest,
  todaysGuests,
  boardRequestOf,
  forageForest,
  completeBoardRequest,
  sellForage,
  describeBag,
} from './sim.js';
// 每格移动耗时（毫秒）。原来 180 偏快容易眩晕，放慢到 240 更从容。
const MOVE_MS = 240;
// 镜头竖直偏移，让玩家略靠画面下方，看得见前方的路（渲染与点击换算共用）。
const CAMERA_Y = 34;

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const hudCoin = document.getElementById('hudCoin');
const hudSeason = document.getElementById('hudSeason');
const hudClock = document.getElementById('hudClock');
const toast = document.getElementById('worldToast');
const panel = document.getElementById('actionPanel');
const dialogue = document.getElementById('dialogue');
const bagPanel = document.getElementById('bagPanel');

const state = {
  world: loadWorld(Date.now()),
  player: { tx: SPAWN.tx, ty: SPAWN.ty },
  render: { x: SPAWN.tx, y: SPAWN.ty },
  anim: null,
  npcs: createNpcs(),
  path: [],
  clock: Date.now(),
};

let toastTimer = 0;
let saveTimer = 0;

function say(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function apply(result, sound) {
  state.world = result.state;
  say(result.message);
  if (result.ok && sound) playTone(sound);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveWorld(state.world), 1000);
  renderHud();
}
function renderHud() {
  const event = getCurrentSeasonalEvent();
  hudCoin.textContent = `${state.world.coin} 金币`;
  hudSeason.textContent = event ? `${event.icon} ${event.name}` : '🌱 平常日子';
  const hour = Math.floor(((state.clock % (12 * 60 * 1000)) / (12 * 60 * 1000)) * 24);
  hudClock.textContent = `${`${hour}`.padStart(2, '0')}:00`;
}

function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);

// ---- 小地图 / 全图预览 ----
const miniCanvas = document.getElementById('minimap');
const miniCtx = miniCanvas.getContext('2d');
const bigCanvas = document.getElementById('bigMap');
const bigCtx = bigCanvas.getContext('2d');
const mapOverlay = document.getElementById('mapOverlay');
let mapOpen = false;
let bigView = 0; // 放大预览画布的边长（CSS px）
let bigTile = 12; // 放大预览每格像素
let bigFit = 12; // 恰好容纳整张地图的每格像素（缩放下限）
const bigPan = { x: 0, y: 0 };

function scaleCanvas(cvs, context, cssSize) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  cvs.width = Math.round(cssSize * dpr);
  cvs.height = Math.round(cssSize * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;
}

function renderMinimap() {
  const css = miniCanvas.clientWidth || 128;
  if (miniCanvas._css !== css) {
    miniCanvas._css = css;
    scaleCanvas(miniCanvas, miniCtx, css);
  }
  const tile = css / MAP_SIZE;
  const vw = window.innerWidth / TILE_W;
  const vh = window.innerHeight / TILE_H;
  const viewport = {
    x: state.render.x + 0.5 - vw / 2,
    y: state.render.y + 0.5 - vh / 2,
    w: vw,
    h: vh,
  };
  miniCtx.clearRect(0, 0, css, css);
  drawOverview(miniCtx, {
    tile,
    player: { rx: state.render.x, ry: state.render.y },
    npcs: state.npcs,
    viewport,
    now: state.clock,
  });
}

function clampPan() {
  const content = MAP_SIZE * bigTile;
  if (content <= bigView) {
    bigPan.x = (bigView - content) / 2;
    bigPan.y = (bigView - content) / 2;
  } else {
    bigPan.x = Math.min(0, Math.max(bigView - content, bigPan.x));
    bigPan.y = Math.min(0, Math.max(bigView - content, bigPan.y));
  }
}

function renderBigMap() {
  bigCtx.clearRect(0, 0, bigView, bigView);
  clampPan();
  drawOverview(bigCtx, {
    tile: bigTile,
    ox: bigPan.x,
    oy: bigPan.y,
    player: { rx: state.render.x, ry: state.render.y },
    npcs: state.npcs,
    showLabels: bigTile >= 11,
    now: state.clock,
  });
}

function openMap() {
  bigView = Math.round(Math.min(window.innerWidth * 0.9, window.innerHeight * 0.78, 640));
  bigFit = Math.max(6, Math.floor(bigView / MAP_SIZE));
  bigView = bigFit * MAP_SIZE; // 让画布正好放下整张图
  bigTile = bigFit;
  bigCanvas.style.width = `${bigView}px`;
  bigCanvas.style.height = `${bigView}px`;
  scaleCanvas(bigCanvas, bigCtx, bigView);
  bigPan.x = 0;
  bigPan.y = 0;
  mapOverlay.hidden = false;
  mapOpen = true;
}

function closeMap() {
  mapOverlay.hidden = true;
  mapOpen = false;
}

// 以 (cx, cy) 为焦点缩放，保持该点对应的地图位置不动。
function zoomBig(factor, cx, cy) {
  const next = Math.max(bigFit, Math.min(bigFit * 4, bigTile * factor));
  if (next === bigTile) return;
  const wx = (cx - bigPan.x) / bigTile;
  const wy = (cy - bigPan.y) / bigTile;
  bigTile = next;
  bigPan.x = cx - wx * bigTile;
  bigPan.y = cy - wy * bigTile;
  clampPan();
}

miniCanvas.addEventListener('click', openMap);
document.getElementById('mapClose').addEventListener('click', closeMap);
mapOverlay.addEventListener('pointerdown', (event) => {
  if (event.target === mapOverlay) closeMap();
});
document.getElementById('mapZoomIn').addEventListener('click', () => zoomBig(1.4, bigView / 2, bigView / 2));
document.getElementById('mapZoomOut').addEventListener('click', () => zoomBig(1 / 1.4, bigView / 2, bigView / 2));
bigCanvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const rect = bigCanvas.getBoundingClientRect();
  zoomBig(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - rect.left, event.clientY - rect.top);
}, { passive: false });

let dragging = null;
bigCanvas.addEventListener('pointerdown', (event) => {
  dragging = { x: event.clientX, y: event.clientY };
  bigCanvas.setPointerCapture(event.pointerId);
});
bigCanvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  bigPan.x += event.clientX - dragging.x;
  bigPan.y += event.clientY - dragging.y;
  dragging = { x: event.clientX, y: event.clientY };
  clampPan();
});
const endDrag = () => {
  dragging = null;
};
bigCanvas.addEventListener('pointerup', endDrag);
bigCanvas.addEventListener('pointercancel', endDrag);

// 摄像机左上角在屏幕里的偏移，和渲染保持一致，点击换算才不会偏。
function cameraFor(rx, ry, width, height) {
  return {
    x: Math.round(width / 2 - (rx + 0.5) * TILE_W),
    y: Math.round(height / 2 - (ry + 0.5) * TILE_H + CAMERA_Y),
  };
}

// 玩家当前的插值位置（格坐标，可能是小数）。
function renderPos() {
  if (!state.anim) return { x: state.player.tx, y: state.player.ty };
  const p = Math.min(1, (state.clock - state.anim.startAt) / MOVE_MS);
  return {
    x: state.anim.fromX + (state.player.tx - state.anim.fromX) * p,
    y: state.anim.fromY + (state.player.ty - state.anim.fromY) * p,
  };
}

// 迈出一步：记录起点开始插值，逻辑坐标立刻落到目标格；撞墙则取消寻路。
function commitMove(nx, ny) {
  if (isBlocked(nx, ny)) {
    state.path = [];
    return;
  }
  state.anim = { fromX: state.player.tx, fromY: state.player.ty, startAt: state.clock };
  state.player.tx = nx;
  state.player.ty = ny;
}

// 邻居也做平滑跟随：指数逼近各自的目标格。
function easeNpcs(npcs, dt) {
  const k = 1 - Math.exp(-dt / 130);
  return npcs.map((npc) => {
    const rx = npc.rx ?? npc.tx;
    const ry = npc.ry ?? npc.ty;
    return { ...npc, rx: rx + (npc.tx - rx) * k, ry: ry + (npc.ty - ry) * k };
  });
}

function update(dt) {
  state.clock += dt;
  state.npcs = easeNpcs(stepNpcs(state.npcs, dt), dt);

  // 一步走完就解锁，允许迈下一步。
  if (state.anim && state.clock - state.anim.startAt >= MOVE_MS) state.anim = null;
  state.render = renderPos();

  // 点击（手机点、电脑鼠标点）都换成一次寻路。
  for (const tap of input.consumeTaps()) {
    const cam = cameraFor(state.render.x, state.render.y, window.innerWidth, window.innerHeight);
    const tile = screenToTile(tap.x - cam.x, tap.y - cam.y);
    state.path = findPath(state.player, tile, isBlocked);
  }

  // 没有正在走的动画时才决定下一步：键盘优先于寻路。
  if (!state.anim) {
    const dir = input.direction();
    if (dir) {
      state.path = [];
      commitMove(state.player.tx + dir[0], state.player.ty + dir[1]);
    } else if (state.path.length) {
      const step = state.path.shift();
      commitMove(step.tx, step.ty);
    }
  }
}

function render() {
  const event = getCurrentSeasonalEvent();
  renderFrame(ctx, {
    width: window.innerWidth,
    height: window.innerHeight,
    player: { rx: state.render.x, ry: state.render.y },
    npcs: state.npcs,
    world: state.world,
    seasonId: event ? event.id : '',
    now: state.clock,
    cameraY: CAMERA_Y,
  });
  renderHud();
  renderMinimap();
  if (mapOpen) renderBigMap();
}
function nearestSpot() {
  const { tx, ty } = state.player;
  return SPOTS.find((spot) => isAdjacent(tx, ty, spot.tx, spot.ty)) || null;
}

function nearestPlot(plots) {
  const { tx, ty } = state.player;
  let best = -1;
  let bestDist = Infinity;
  plots.forEach((plot, i) => {
    const dist = Math.abs(plot.tx - tx) + Math.abs(plot.ty - ty);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return bestDist <= 1 ? best : -1;
}

function openPanel(title, buttons) {
  panel.hidden = false;
  panel.innerHTML = '';
  const heading = document.createElement('h3');
  heading.textContent = title;
  panel.appendChild(heading);
  for (const button of buttons) {
    const el = document.createElement('button');
    el.type = 'button';
    el.textContent = button.label;
    el.addEventListener('click', () => {
      button.run();
      playTone('click');
    });
    panel.appendChild(el);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '关闭';
  close.addEventListener('click', () => {
    panel.hidden = true;
  });
  panel.appendChild(close);
}

function interact() {
  const npc = nearbyNpc(state.npcs, state.player.tx, state.player.ty);
  if (npc) {
    dialogue.hidden = false;
    dialogue.textContent = `${npc.avatar} ${npc.name}：${dialogueOf(npc.id, Date.now())}`;
    return;
  }
  dialogue.hidden = true;

  const plotIndex = nearestPlot(FARM_PLOTS);
  if (plotIndex >= 0) return openFarm(plotIndex);

  const greenIndex = nearestPlot(GREENHOUSE_PLOTS);
  if (greenIndex >= 0) return openGreenhouse(greenIndex);

  const spot = nearestSpot();
  if (!spot) {
    say('附近没有可以做的事');
    return;
  }
  if (spot.kind === 'sell') return openStall();
  if (spot.kind === 'board') return openBoard();
  if (spot.kind === 'forage') return apply(forageForest(state.world, state.clock), 'harvest');
  if (spot.kind === 'lookout') {
    say('登上风车坡，能看见湖水、农田和整座小镇。');
    return;
  }
  if (spot.kind === 'fish') return apply(castLine(state.world, Date.now()), 'harvest');
  if (spot.kind === 'mine') return openMine();
  if (spot.kind === 'craft') return openCraft();
  if (spot.kind === 'cook') return openKitchen();
  if (spot.kind === 'cafe') return openCafe();
  if (spot.kind === 'npc') {
    const friend = state.npcs.find((n) => n.id === spot.npc);
    say(friend ? `${friend.name}这会儿在镇上走动，去找找` : '门关着');
    return;
  }
  if (spot.kind === 'talk') {
    say('喷泉的水声很安静，广场上什么都不用做。');
  }
}
function openFarm(index) {
  const plot = state.world.plots[index];
  const crop = seedList().find((c) => c.id === plot.cropId);
  if (crop && growthStage(plot, crop, state.clock) >= 4) {
    apply(harvestPlot(state.world, index, state.clock), 'harvest');
    panel.hidden = true;
    return;
  }
  if (crop) {
    openPanel(`${crop.name}`, [
      { label: plot.watered ? '已经浇过水' : '浇水', run: () => apply(waterPlot(state.world, index)) },
    ]);
    return;
  }
  openPanel('播种', seedList().map((c) => ({
    label: `${c.icon} ${c.name}（${c.seedPrice} 金币）`,
    run: () => apply(plantSeed(state.world, index, c.id, state.clock), 'plant'),
  })));
}

function openGreenhouse(index) {
  const plot = state.world.greenhouse[index];
  const crop = greenhouseCrops.find((c) => c.id === plot.cropId);
  if (crop) {
    apply(harvestGreenhouse(state.world, index, state.clock), 'harvest');
    return;
  }
  openPanel('温室播种', greenhouseCrops.map((c) => ({
    label: `${c.icon} ${c.name}`,
    run: () => apply(plantGreenhouse(state.world, index, c.id, state.clock), 'plant'),
  })));
}

function openBoard() {
  const request = boardRequestOf(state.clock);
  const amount = state.world.bag[request.item] || 0;
  openPanel(`公告栏 · ${request.name}`, [
    {
      label: `${request.icon} ${request.text}（${amount}/${request.count}）`,
      run: () => apply(completeBoardRequest(state.world, state.clock), 'coin'),
    },
  ]);
}

function openStall() {
  const items = describeBag(state.world).filter((item) => item.sell > 0);
  if (!items.length) {
    say('没有可以卖的东西');
    return;
  }
  openPanel('货摊', items.map((item) => ({
    label: `${item.icon} ${item.name}×${item.amount}（每个 ${item.sell}）`,
    run: () => {
      const result = item.sellKind === 'crop'
        ? sellCrop(state.world, item.sellId, item.amount)
        : item.sellKind === 'fish'
          ? sellFish(state.world, item.sellId, item.amount)
          : item.sellKind === 'forage'
            ? sellForage(state.world, item.sellId, item.amount)
            : sellOre(state.world, item.sellId, item.amount);
      apply(result, 'coin');
    },
  })));
}

function openMine() {
  openPanel(`矿洞（体力 ${state.world.stamina}）`, [
    { label: '挖一下', run: () => apply(digMine(state.world, Date.now()), 'click') },
    { label: '升级镐子', run: () => apply(upgradePick(state.world), 'coin') },
  ]);
}

function openCraft() {
  const job = state.world.crafting;
  if (job && state.clock >= job.readyAt) {
    apply(collectCraft(state.world, state.clock), 'harvest');
    return;
  }
  openPanel(job ? '加工中…' : '加工坊', craftingRecipes.map((recipe) => ({
    label: `${recipe.icon} ${recipe.name}`,
    run: () => apply(startCraft(state.world, recipe.id, state.clock), 'plant'),
  })));
}

function openKitchen() {
  openPanel('料理铺', dishes.map((dish) => ({
    label: `${dish.icon} ${dish.name}`,
    run: () => apply(cookDish(state.world, dish.id), 'plant'),
  })));
}

function openCafe() {
  const guests = todaysGuests(Date.now());
  openPanel('今天的客人', guests.map((guest) => ({
    label: state.world.cafeServed.includes(guest.id)
      ? `${guest.name}（已接待）`
      : `${guest.icon} ${guest.name}想要${guest.dish.name}`,
    run: () => apply(serveGuest(state.world, guest.id, Date.now()), 'coin'),
  })));
}

function toggleBag() {
  if (!bagPanel.hidden) {
    bagPanel.hidden = true;
    return;
  }
  const items = describeBag(state.world);
  bagPanel.hidden = false;
  bagPanel.innerHTML = items.length
    ? items.map((item) => `<p>${item.icon} ${item.name} ×${item.amount}</p>`).join('')
    : '<p>背包是空的</p>';
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'e' || event.key === 'E' || event.key === ' ') {
    event.preventDefault();
    interact();
  }
  if (event.key === 'b' || event.key === 'B') toggleBag();
  if (event.key === 'm' || event.key === 'M') {
    if (mapOpen) closeMap();
    else openMap();
  }
  if (event.key === 'Escape') {
    panel.hidden = true;
    dialogue.hidden = true;
    bagPanel.hidden = true;
    closeMap();
  }
});

document.getElementById('interactButton').addEventListener('click', interact);
document.getElementById('bagButton').addEventListener('click', toggleBag);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveWorld(state.world);
});
window.addEventListener('beforeunload', () => saveWorld(state.world));

renderHud();
startLoop(update, render);

