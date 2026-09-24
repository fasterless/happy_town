// 像素小镇入口
//
// 把地图、输入、模拟和画面接在一起。玩法规则都在 sim.js，
// 这里只负责「玩家走过去、按键、看到结果」。

import { screenToTile, tileToScreen } from './iso.js';
import { isBlocked, isAdjacent, SPOTS, FARM_PLOTS, GREENHOUSE_PLOTS, SPAWN } from './map.js';
import { findPath } from './pathfind.js';
import { renderFrame } from './renderer.js';
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
  describeBag,
} from './sim.js';

const MOVE_MS = 180;

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
  player: { ...SPAWN },
  npcs: createNpcs(),
  path: [],
  moveAcc: 0,
  keyAcc: 0,
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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);

function stepToward(dir) {
  const nx = state.player.tx + dir[0];
  const ny = state.player.ty + dir[1];
  if (!isBlocked(nx, ny)) {
    state.player.tx = nx;
    state.player.ty = ny;
    state.path = [];
  }
}

function update(dt) {
  state.clock += dt;
  state.npcs = stepNpcs(state.npcs, dt);

  const dir = input.direction();
  if (dir) {
    state.keyAcc += dt;
    if (state.keyAcc >= MOVE_MS) {
      state.keyAcc = 0;
      stepToward(dir);
    }
  } else {
    state.keyAcc = 0;
  }

  for (const tap of input.consumeTaps()) {
    const center = tileToScreen(state.player.tx, state.player.ty);
    const sx = tap.x - window.innerWidth / 2 + center.x;
    const sy = tap.y - window.innerHeight / 2 + 40 + center.y;
    const tile = screenToTile(sx, sy);
    state.path = findPath(state.player, tile, isBlocked);
  }

  if (!dir && state.path.length) {
    state.moveAcc += dt;
    if (state.moveAcc >= MOVE_MS) {
      state.moveAcc = 0;
      const step = state.path.shift();
      if (!isBlocked(step.tx, step.ty)) {
        state.player.tx = step.tx;
        state.player.ty = step.ty;
      } else {
        state.path = [];
      }
    }
  }
}

function render() {
  const event = getCurrentSeasonalEvent();
  renderFrame(ctx, {
    width: canvas.width,
    height: canvas.height,
    player: state.player,
    npcs: state.npcs,
    world: state.world,
    seasonId: event ? event.id : '',
    now: state.clock,
  });
  renderHud();
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
  if (event.key === 'Escape') {
    panel.hidden = true;
    dialogue.hidden = true;
    bagPanel.hidden = true;
  }
});

document.getElementById('interactButton').addEventListener('click', interact);
document.getElementById('bagButton').addEventListener('click', toggleBag);

const stick = document.getElementById('stick');
stick.addEventListener('pointerdown', (event) => stick.setPointerCapture(event.pointerId));
stick.addEventListener('pointermove', (event) => {
  if (!stick.hasPointerCapture(event.pointerId)) return;
  const rect = stick.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  const tx = Math.abs(dx) > 14 ? Math.sign(dx) : 0;
  const ty = Math.abs(dy) > 14 ? Math.sign(dy) : 0;
  input.holdStick(Math.abs(dx) > Math.abs(dy) ? tx : 0, Math.abs(dy) >= Math.abs(dx) ? ty : 0);
});
const releaseStick = () => input.holdStick(0, 0);
stick.addEventListener('pointerup', releaseStick);
stick.addEventListener('pointercancel', releaseStick);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveWorld(state.world);
});
window.addEventListener('beforeunload', () => saveWorld(state.world));

renderHud();
startLoop(update, render);
