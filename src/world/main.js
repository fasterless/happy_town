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
import { isBlocked, isAdjacent, SPOTS, FARM_PLOTS, GREENHOUSE_PLOTS, ORCHARD_TREES, SPAWN, MAP_SIZE } from './map.js';
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
  allCrops,
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
  itemLabel,
  weatherOf,
  claimDailyBonus,
  talkFriend,
  friendHearts,
  dailyRemaining,
  allDailiesDone,
  achievementsOf,
  makeWish,
  forecast,
  harvestOrchard,
  sellFruit,
} from './sim.js';
// 每格移动耗时（毫秒）。原来 180 偏快容易眩晕，放慢到 240 更从容。
const MOVE_MS = 240;
// 镜头竖直偏移，让玩家略靠画面下方，看得见前方的路（渲染与点击换算共用）。
const CAMERA_Y = 34;
// 一整个游戏昼夜等于多少现实毫秒（24 分钟 = 一天，约 1 现实分钟 / 游戏小时）。
const DAY_LEN_MS = 24 * 60 * 1000;

const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
const hudCoin = document.getElementById('hudCoin');
const hudSeason = document.getElementById('hudSeason');
const hudClock = document.getElementById('hudClock');
const hudDaily = document.getElementById('hudDaily');
const toast = document.getElementById('worldToast');
const panel = document.getElementById('actionPanel');
const dialogue = document.getElementById('dialogue');
const bagPanel = document.getElementById('bagPanel');
const actionHint = document.getElementById('actionHint');

// 昼夜时钟从早上 8:00 起步，之后按现实时间推进（DAY_LEN_MS 一整天）。
const startDayMs = (8 / 24) * DAY_LEN_MS;

const state = {
  world: loadWorld(Date.now()),
  player: { tx: SPAWN.tx, ty: SPAWN.ty },
  render: { x: SPAWN.tx, y: SPAWN.ty },
  anim: null,
  npcs: createNpcs(),
  path: [],
  clock: Date.now(),
  dayMs: startDayMs,
  fishing: null,
};

// 当前游戏小时（0~24，含小数），供 HUD 与昼夜滤镜共用。
function gameHour() {
  return (state.dayMs / DAY_LEN_MS) * 24;
}

// 今天天气按现实日期固定，和每日额度的刷新边界一致。
function currentWeather() {
  return weatherOf(Date.now());
}

// 现实日期的 day key，用来判断喷泉今天是否已许愿（与 sim 内 dayKey 一致）。
function dayKeyToday() {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

let toastTimer = 0;
let saveTimer = 0;
let doneHintShown = false;

function say(message) {
  if (!message) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

function saveSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveWorld(state.world), 1000);
}

function apply(result, sound) {
  state.world = result.state;
  say(result.message);
  if (result.ok && sound) playTone(sound);
  saveSoon();
  renderHud();
  // 日常都清空后温柔提示一次"明天再来"。
  if (!doneHintShown && allDailiesDone(state.world, Date.now())) {
    doneHintShown = true;
    setTimeout(() => say('今天的日常都做完啦，明天再来看看小镇吧～'), 1400);
  }
}
function renderHud() {
  const event = getCurrentSeasonalEvent();
  const weather = currentWeather();
  hudCoin.textContent = `${state.world.coin} 金币`;
  const season = event ? `${event.icon} ${event.name}` : '🌱 平常日子';
  hudSeason.textContent = `${season} · ${weather.icon}${weather.name}`;
  const hour = Math.floor(gameHour());
  const minute = Math.floor((gameHour() - hour) * 60);
  hudClock.textContent = `${`${hour}`.padStart(2, '0')}:${`${minute}`.padStart(2, '0')}`;
  if (hudDaily) {
    const r = dailyRemaining(state.world, Date.now());
    hudDaily.textContent = `🎣${r.fish} 🌿${r.forage} 🍎${r.orchard} ⛏️${r.stamina}${r.boardDone ? '' : ' 📌'}${r.wished ? '' : ' 🌟'}`;
    hudDaily.title = `今日剩余：钓鱼 ${r.fish} 次、采集 ${r.forage} 次、果园 ${r.orchard} 棵、体力 ${r.stamina}${r.boardDone ? '，公告栏已完成' : '，公告栏待完成'}${r.wished ? '，喷泉已许愿' : '，喷泉可许愿'}`;
  }
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
  // 走动就收起临时面板与对话，避免"隔空操作"离得老远的店铺/农田。
  panel.hidden = true;
  dialogue.hidden = true;
}

// 邻居也做平滑跟随：指数逼近各自的目标格；同时带上好感度心数供渲染。
function easeNpcs(npcs, dt) {
  const k = 1 - Math.exp(-dt / 130);
  const friends = state.world.friends || {};
  return npcs.map((npc) => {
    const rx = npc.rx ?? npc.tx;
    const ry = npc.ry ?? npc.ty;
    return {
      ...npc,
      rx: rx + (npc.tx - rx) * k,
      ry: ry + (npc.ty - ry) * k,
      hearts: friendHearts(friends[npc.id]?.points),
    };
  });
}

function update(dt) {
  state.clock += dt;
  state.dayMs = (state.dayMs + dt) % DAY_LEN_MS;
  // 邻居沿路巡逻但不穿墙（把 isBlocked 传进去）。
  state.npcs = easeNpcs(stepNpcs(state.npcs, dt, 900, isBlocked), dt);

  // 一步走完就解锁，允许迈下一步。
  if (state.anim && state.clock - state.anim.startAt >= MOVE_MS) state.anim = null;
  state.render = renderPos();

  // 点击（手机点、电脑鼠标点）都换成一次寻路。钓鱼小游戏进行时不接受移动。
  for (const tap of input.consumeTaps()) {
    if (state.fishing) break;
    const cam = cameraFor(state.render.x, state.render.y, window.innerWidth, window.innerHeight);
    const tile = screenToTile(tap.x - cam.x, tap.y - cam.y);
    state.path = findPath(state.player, tile, isBlocked);
  }

  // 没有正在走的动画时才决定下一步：键盘优先于寻路。
  if (!state.anim && !state.fishing) {
    const dir = input.direction();
    if (dir) {
      state.path = [];
      commitMove(state.player.tx + dir[0], state.player.ty + dir[1]);
    } else if (state.path.length) {
      const step = state.path.shift();
      commitMove(step.tx, step.ty);
    }
  }

  updateActionHint();
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
    hour: gameHour(),
    weather: currentWeather(),
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

// 相邻（含脚下）的果树下标，没有就返回 -1。
function nearestOrchard() {
  const { tx, ty } = state.player;
  let best = -1;
  let bestDist = Infinity;
  ORCHARD_TREES.forEach((tree, i) => {
    const dist = Math.abs(tree.tx - tx) + Math.abs(tree.ty - ty);
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

// 触屏设备用「行动」按钮，桌面提示按 E。
const isTouch = window.matchMedia('(pointer: coarse)').matches;

// 附近能做的第一件事（用于行动提示）。优先级和 interact 保持一致。
function nearbyLabel() {
  if (nearestPlot(FARM_PLOTS) >= 0) return '耕种 / 收获';
  if (nearestPlot(GREENHOUSE_PLOTS) >= 0) return '温室';
  if (nearestOrchard() >= 0) return '果园摘果';
  const spot = nearestSpot();
  if (spot && spot.kind !== 'npc') return spot.name;
  const npc = nearbyNpc(state.npcs, state.player.tx, state.player.ty);
  if (npc) return `和 ${npc.name} 聊天`;
  if (spot && spot.kind === 'npc') return spot.name;
  return '';
}

function updateActionHint() {
  if (!actionHint) return;
  if (state.fishing || !panel.hidden || !dialogue.hidden) {
    actionHint.hidden = true;
    return;
  }
  const label = nearbyLabel();
  if (!label) {
    actionHint.hidden = true;
    return;
  }
  actionHint.hidden = false;
  actionHint.textContent = `${isTouch ? '点「行动」' : '按 E'}：${label}`;
}

function openWish() {
  if (state.world.wishDay === dayKeyToday()) {
    say('今天已经许过愿了，明天再来吧');
    return undefined;
  }
  openPanel('许愿喷泉 ⛲', [
    {
      label: '投一枚硬币许个愿 🌟',
      run: () => { apply(makeWish(state.world, Date.now()), 'coin'); panel.hidden = true; },
    },
  ]);
  return undefined;
}

function openLookout() {
  const days = forecast(Date.now(), 3);
  const labels = ['今天', '明天', '后天'];
  panel.hidden = false;
  panel.innerHTML = '';
  const heading = document.createElement('h3');
  heading.textContent = '风车坡 · 天气瞭望台';
  panel.appendChild(heading);
  days.forEach((d, i) => {
    const row = document.createElement('div');
    row.className = 'ach-row';
    row.innerHTML = `<b>${labels[i] || `${i} 天后`} ${d.icon} ${d.name}</b><small>${d.note}</small>`;
    panel.appendChild(row);
  });
  const tip = document.createElement('div');
  tip.className = 'ach-row';
  tip.innerHTML = '<small>🌱 雨天作物长得更快、还免浇水，可以照着预报安排播种。</small>';
  panel.appendChild(tip);
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '关闭';
  close.addEventListener('click', () => { panel.hidden = true; });
  panel.appendChild(close);
}

function runSpot(spot) {
  if (spot.kind === 'sell') return openStall();
  if (spot.kind === 'board') return openBoard();
  if (spot.kind === 'forage') return apply(forageForest(state.world, Date.now()), 'harvest');
  if (spot.kind === 'lookout') return openLookout();
  if (spot.kind === 'fish') return openFishing();
  if (spot.kind === 'mine') return openMine();
  if (spot.kind === 'craft') return openCraft();
  if (spot.kind === 'cook') return openKitchen();
  if (spot.kind === 'cafe') return openCafe();
  if (spot.kind === 'wish') return openWish();
  if (spot.kind === 'talk') say('喷泉的水声很安静，广场上什么都不用做。');
  return undefined;
}

function talkTo(npc) {
  const res = talkFriend(state.world, npc.id, Date.now());
  state.world = res.state;
  saveSoon();
  if (res.gained > 0) playTone('coin');
  const hearts = friendHearts(res.points);
  const heartStr = hearts > 0 ? '❤'.repeat(hearts) : '♡';
  const gain = res.gained > 0 ? `（好感 +${res.gained}）` : '';
  dialogue.hidden = false;
  dialogue.textContent = `${npc.avatar} ${npc.name} ${heartStr}${gain}：${dialogueOf(npc.id, Date.now(), res.points)}`;
}

function interact() {
  // 钓鱼小游戏进行中：行动键 = 收杆。
  if (state.fishing) return lockFishing();
  dialogue.hidden = true;

  // 1) 脚下的农田 / 温室最优先，免得路过的邻居抢了互动。
  const plotIndex = nearestPlot(FARM_PLOTS);
  if (plotIndex >= 0) return openFarm(plotIndex);
  const greenIndex = nearestPlot(GREENHOUSE_PLOTS);
  if (greenIndex >= 0) return openGreenhouse(greenIndex);
  const treeIndex = nearestOrchard();
  if (treeIndex >= 0) return apply(harvestOrchard(state.world, treeIndex, Date.now()), 'harvest');

  // 2) 功能地标（货摊、钓鱼、矿洞……），店门口点先跳过。
  const spot = nearestSpot();
  if (spot && spot.kind !== 'npc') return runSpot(spot);

  // 3) 正在镇上走动的邻居：聊天并涨好感。
  const npc = nearbyNpc(state.npcs, state.player.tx, state.player.ty);
  if (npc) return talkTo(npc);

  // 4) 店门口：主人多半在外面逛。
  if (spot && spot.kind === 'npc') {
    const friend = state.npcs.find((n) => n.id === spot.npc);
    say(friend ? `${friend.name}这会儿在镇上走动，去找找` : '门关着');
    return undefined;
  }
  say('附近没有可以做的事');
  return undefined;
}

// ---- 钓鱼小游戏：来回滑动的指针，越靠中心，稀有鱼几率越高 ----
const fishOverlay = document.getElementById('fishingOverlay');
const fishMarker = document.getElementById('fishMarker');

function openFishing() {
  const r = dailyRemaining(state.world, Date.now());
  if (r.fish <= 0 && state.world.coin < 5) {
    say('免费次数用完了，买鱼饵的金币也不够');
    return;
  }
  if (!fishOverlay || !fishMarker) {
    apply(castLine(state.world, Date.now(), 1), 'harvest');
    return;
  }
  fishOverlay.hidden = false;
  const fishing = { pos: 0, dir: 1, last: performance.now(), raf: 0 };
  state.fishing = fishing;
  const step = (t) => {
    if (state.fishing !== fishing) return;
    const dt = Math.min(48, t - fishing.last);
    fishing.last = t;
    fishing.pos += fishing.dir * (dt / 1100);
    if (fishing.pos >= 1) { fishing.pos = 1; fishing.dir = -1; }
    if (fishing.pos <= 0) { fishing.pos = 0; fishing.dir = 1; }
    fishMarker.style.left = `${fishing.pos * 100}%`;
    fishing.raf = requestAnimationFrame(step);
  };
  fishing.raf = requestAnimationFrame(step);
}

function cancelFishing() {
  if (!state.fishing) return;
  cancelAnimationFrame(state.fishing.raf);
  state.fishing = null;
  if (fishOverlay) fishOverlay.hidden = true;
}

function lockFishing() {
  const fishing = state.fishing;
  if (!fishing) return;
  cancelAnimationFrame(fishing.raf);
  state.fishing = null;
  if (fishOverlay) fishOverlay.hidden = true;
  const dist = Math.abs(fishing.pos - 0.5);
  let quality = 1;
  let grade = '';
  if (dist <= 0.06) { quality = 2.8; grade = '完美命中！'; }
  else if (dist <= 0.16) { quality = 1.8; grade = '不错的手感！'; }
  const result = castLine(state.world, Date.now(), quality);
  state.world = result.state;
  if (result.ok) playTone('harvest');
  saveSoon();
  renderHud();
  say(`${grade}${result.message}`);
}
function openFarm(index) {
  const plot = state.world.plots[index];
  const weather = currentWeather();
  const crop = allCrops().find((c) => c.id === plot.cropId);
  if (crop && growthStage(plot, crop, state.clock, weather) >= 4) {
    apply(harvestPlot(state.world, index, state.clock, weather), 'harvest');
    panel.hidden = true;
    return;
  }
  if (crop) {
    const rain = weather.id === 'rainy';
    openPanel(`${crop.icon} ${crop.name}`, [
      {
        label: rain ? '雨天自动浇水，静待成熟' : (plot.watered ? '已经浇过水' : '浇水（收成更好）'),
        run: () => apply(waterPlot(state.world, index)),
      },
    ]);
    return;
  }
  openPanel('播种', seedList().map((c) => ({
    label: `${c.icon} ${c.name}（种子 ${c.seedPrice} 金币）`,
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

function sellItem(item, amount) {
  const kind = item.sellKind;
  const result = kind === 'crop'
    ? sellCrop(state.world, item.sellId, amount)
    : kind === 'fish'
      ? sellFish(state.world, item.sellId, amount)
      : kind === 'forage'
        ? sellForage(state.world, item.sellId, amount)
        : kind === 'fruit'
          ? sellFruit(state.world, item.sellId, amount)
          : sellOre(state.world, item.sellId, amount);
  apply(result, 'coin');
  openStall(); // 卖完刷新货摊数量
}

function openStall() {
  const items = describeBag(state.world).filter((item) => item.sell > 0);
  if (!items.length) {
    say('没有可以卖的东西');
    panel.hidden = true;
    return;
  }
  const buttons = [];
  for (const item of items) {
    buttons.push({
      label: `${item.icon} ${item.name}×${item.amount}（每个 ${item.sell}）— 卖 1`,
      run: () => sellItem(item, 1),
    });
    if (item.amount > 1) {
      buttons.push({ label: `↳ 全卖（+${item.sell * item.amount}）`, run: () => sellItem(item, item.amount) });
    }
  }
  openPanel('货摊', buttons);
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

function haveIngredients(dish) {
  return dish.requires.every((req) => (state.world.bag[req.item] || 0) >= req.count);
}

function ingredientText(dish) {
  return dish.requires.map((req) => `${itemLabel(req.item)}×${req.count}`).join('、');
}

function openKitchen() {
  openPanel('料理铺', dishes.map((dish) => ({
    label: `${dish.icon} ${dish.name} — 需要 ${ingredientText(dish)}${haveIngredients(dish) ? '（可做）' : '（缺料）'}`,
    run: () => apply(cookDish(state.world, dish.id), 'plant'),
  })));
}

function openCafe() {
  const guests = todaysGuests(Date.now());
  openPanel('今天的客人', guests.map((guest) => {
    const served = state.world.cafeServed.includes(guest.id);
    const dish = guest.dish;
    const haveDish = (state.world.bag[`dish_${dish.id}`] || 0) > 0;
    let label;
    if (served) {
      label = `${guest.icon} ${guest.name}（已接待）`;
    } else if (haveDish) {
      label = `${guest.icon} ${guest.name} 想要 ${dish.icon}${dish.name}（可上菜）`;
    } else {
      label = `${guest.icon} ${guest.name} 想要 ${dish.icon}${dish.name} — 去料理铺做：${ingredientText(dish)}`;
    }
    return { label, run: () => apply(serveGuest(state.world, guest.id, Date.now()), 'coin') };
  }));
}

function openAchievements() {
  const list = achievementsOf(state.world);
  panel.hidden = false;
  panel.innerHTML = '';
  const heading = document.createElement('h3');
  const doneCount = list.filter((a) => a.done).length;
  heading.textContent = `成就（${doneCount}/${list.length}）`;
  panel.appendChild(heading);
  for (const a of list) {
    const row = document.createElement('div');
    row.className = 'ach-row';
    const shown = Math.min(a.value, a.goal);
    row.innerHTML = `<b>${a.done ? '✅' : a.icon} ${a.name}</b><small>${a.desc}（${shown}/${a.goal}）</small>`;
    panel.appendChild(row);
  }
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '关闭';
  close.addEventListener('click', () => { panel.hidden = true; });
  panel.appendChild(close);
}

function toggleBag() {
  if (!bagPanel.hidden) {
    bagPanel.hidden = true;
    return;
  }
  const items = describeBag(state.world);
  bagPanel.hidden = false;
  const list = items.length
    ? items.map((item) => `<p>${item.icon} ${item.name} ×${item.amount}</p>`).join('')
    : '<p>背包是空的</p>';
  bagPanel.innerHTML = `${list}<button type="button" id="bagClose">关闭</button>`;
  const close = document.getElementById('bagClose');
  if (close) close.addEventListener('click', () => { bagPanel.hidden = true; });
}

// ---- 帮助 / 新手引导 ----
const helpOverlay = document.getElementById('helpOverlay');
function openHelp() { if (helpOverlay) helpOverlay.hidden = false; }
function closeHelp() { if (helpOverlay) helpOverlay.hidden = true; }

const helpButton = document.getElementById('helpButton');
if (helpButton) helpButton.addEventListener('click', openHelp);
const helpCloseBtn = document.getElementById('helpClose');
if (helpCloseBtn) helpCloseBtn.addEventListener('click', closeHelp);
if (helpOverlay) {
  helpOverlay.addEventListener('pointerdown', (event) => {
    if (event.target === helpOverlay) closeHelp();
  });
}

const achButton = document.getElementById('achButton');
if (achButton) achButton.addEventListener('click', openAchievements);

// 点对话框任意处即可收起（手机上没有 Esc）。
dialogue.addEventListener('click', () => { dialogue.hidden = true; });

// 钓鱼小游戏：点浮层任意处收杆。
if (fishOverlay) {
  fishOverlay.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    lockFishing();
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'e' || event.key === 'E' || event.key === ' ') {
    event.preventDefault();
    interact();
  }
  if (event.key === 'b' || event.key === 'B') toggleBag();
  if (event.key === 'c' || event.key === 'C') openAchievements();
  if (event.key === 'h' || event.key === 'H' || event.key === '?') openHelp();
  if (event.key === 'm' || event.key === 'M') {
    if (mapOpen) closeMap();
    else openMap();
  }
  if (event.key === 'Escape') {
    cancelFishing();
    panel.hidden = true;
    dialogue.hidden = true;
    bagPanel.hidden = true;
    closeHelp();
    closeMap();
  }
});

document.getElementById('interactButton').addEventListener('click', interact);
document.getElementById('bagButton').addEventListener('click', toggleBag);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveWorld(state.world);
});
window.addEventListener('beforeunload', () => saveWorld(state.world));

// 每天首次进入领登录奖励，并顺带告诉玩家今天的天气。
const bonus = claimDailyBonus(state.world, Date.now());
if (bonus.ok) {
  state.world = bonus.state;
  saveSoon();
  setTimeout(() => say(bonus.message), 400);
}

// 首次进入自动弹一次操作说明。
try {
  if (!localStorage.getItem('world-help-seen')) {
    openHelp();
    localStorage.setItem('world-help-seen', '1');
  }
} catch (error) {
  // 隐私模式下 localStorage 不可用，忽略即可。
}

renderHud();
startLoop(update, render);

