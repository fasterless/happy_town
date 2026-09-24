// 像素小镇的玩法规则
//
// 全部是纯函数：吃进状态，返回新状态与一条给玩家看的消息。
// 时间由调用方传入（now，毫秒），测试里可以随意拨动。
// 数值全部读 src/config，这里不另定价格。

import { crops } from '../config/crops.js';
import { getCurrentSeasonalEvent } from '../config/seasons.js';
import { greenhouseCrops, GREENHOUSE_PLOTS } from '../config/greenhouse.js';
import { craftingRecipes } from '../config/crafting.js';
import { dishes } from '../config/dishes.js';
import { mineLoot, pickaxes, oreValues, getPickaxe, isMaxPick } from '../config/mine.js';
import { cafeGuests, CAFE_GUESTS_PER_DAY, getCafePrice } from '../config/cafe.js';
import { FARM_PLOTS } from './map.js';

// 鱼类表与 src/systems/fishing.js 的 fishes 一致。
// 不直接 import 那个文件：它会把整个 systems 层拖进来。
const FISHES = [
  { id: 1, name: '小鲫鱼', icon: '🐟', weight: 40, sellPrice: 8 },
  { id: 2, name: '胖鲤鱼', icon: '🐠', weight: 25, sellPrice: 15 },
  { id: 3, name: '小龙虾', icon: '🦞', weight: 15, sellPrice: 25 },
  { id: 4, name: '河豚', icon: '🐡', weight: 10, sellPrice: 40 },
  { id: 5, name: '黄金锦鲤', icon: '✨', weight: 4, sellPrice: 120, lucky: true },
  { id: 6, name: '旧靴子', icon: '🥾', weight: 6, sellPrice: 1 },
];

const FREE_CASTS_PER_DAY = 5;
const BAIT_PRICE = 5;
// 生长超过 10 分钟的作物，在像素版里封顶到 10 分钟，否则一茬要等一小时。
const MAX_GROW_MS = 10 * 60 * 1000;
const STARTING_COIN = 200;

export function createWorldState(now = Date.now()) {
  return {
    version: 1,
    coin: STARTING_COIN,
    bag: {},
    plots: FARM_PLOTS.map(() => ({ cropId: 0, plantedAt: 0, watered: false })),
    greenhouse: Array.from({ length: GREENHOUSE_PLOTS }, () => ({ cropId: 0, plantedAt: 0, day: '' })),
    crafting: null,
    pickLevel: 1,
    stamina: pickaxes[0].maxStamina,
    staminaDay: dayKey(now),
    fishCasts: 0,
    fishDay: dayKey(now),
    cafeServed: [],
    cafeDay: dayKey(now),
  };
}

export function dayKey(now) {
  const date = new Date(now);
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** 当前季节限定作物 + 基础作物，作为种子铺 */
export function seedList() {
  const event = getCurrentSeasonalEvent();
  const seasonal = event ? event.seasonal.crops : [];
  return [...crops, ...seasonal];
}

function growMs(crop) {
  return Math.min(crop.growTime * 1000, MAX_GROW_MS);
}

/** 0 空地，1 种子，2 幼苗，3 生长，4 成熟 */
export function growthStage(plot, crop, now) {
  if (!plot.cropId) return 0;
  const elapsed = now - plot.plantedAt;
  const total = growMs(crop);
  if (elapsed >= total) return 4;
  if (elapsed >= total * 0.66) return 3;
  if (elapsed >= total * 0.33) return 2;
  return 1;
}

function clone(state) {
  return {
    ...state,
    bag: { ...state.bag },
    plots: state.plots.map((p) => ({ ...p })),
    greenhouse: state.greenhouse.map((p) => ({ ...p })),
    crafting: state.crafting ? { ...state.crafting } : null,
    cafeServed: [...state.cafeServed],
  };
}

function count(state, key) {
  return state.bag[key] || 0;
}

function add(state, key, amount) {
  state.bag[key] = count(state, key) + amount;
}

function take(state, key, amount) {
  if (count(state, key) < amount) return false;
  state.bag[key] -= amount;
  if (state.bag[key] <= 0) delete state.bag[key];
  return true;
}

function fail(state, message) {
  return { ok: false, message, state };
}

function rollDaily(state, now) {
  const day = dayKey(now);
  if (state.staminaDay !== day) {
    state.stamina = getPickaxe(state.pickLevel).maxStamina;
    state.staminaDay = day;
  }
  if (state.fishDay !== day) {
    state.fishCasts = 0;
    state.fishDay = day;
  }
  if (state.cafeDay !== day) {
    state.cafeServed = [];
    state.cafeDay = day;
  }
}

// ---------- 种田 ----------

export function plantSeed(state, plotIndex, cropId, now) {
  const next = clone(state);
  const plot = next.plots[plotIndex];
  const crop = seedList().find((c) => c.id === cropId);
  if (!plot) return fail(state, '没有这块田');
  if (!crop) return fail(state, '没有这种种子');
  if (plot.cropId) return fail(state, '这块田已经种了东西');
  if (next.coin < crop.seedPrice) return fail(state, '金币不够买种子');
  next.coin -= crop.seedPrice;
  plot.cropId = crop.id;
  plot.plantedAt = now;
  plot.watered = false;
  return { ok: true, message: `种下了${crop.name}`, state: next };
}

export function waterPlot(state, plotIndex) {
  const next = clone(state);
  const plot = next.plots[plotIndex];
  if (!plot || !plot.cropId) return fail(state, '这里还没播种');
  if (plot.watered) return fail(state, '已经浇过水了');
  plot.watered = true;
  return { ok: true, message: '浇过水了', state: next };
}

export function harvestPlot(state, plotIndex, now) {
  const next = clone(state);
  const plot = next.plots[plotIndex];
  const crop = plot && seedList().concat(crops).find((c) => c.id === plot.cropId);
  if (!plot || !plot.cropId || !crop) return fail(state, '这里没有作物');
  if (growthStage(plot, crop, now) < 4) return fail(state, '还没成熟');
  const amount = plot.watered ? crop.harvestCount : Math.max(1, crop.harvestCount - 1);
  add(next, `crop_${crop.id}`, amount);
  plot.cropId = 0;
  plot.plantedAt = 0;
  plot.watered = false;
  return { ok: true, message: `收获${crop.name}×${amount}`, state: next };
}

export function sellCrop(state, cropId, amount) {
  const next = clone(state);
  const crop = seedList().concat(greenhouseCrops).find((c) => c.id === cropId);
  if (!crop) return fail(state, '没有这种作物');
  const key = `crop_${crop.id}`;
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = crop.sellPrice * amount;
  next.coin += earned;
  return { ok: true, message: `卖掉${crop.name}，+${earned} 金币`, state: next };
}

// ---------- 温室 ----------

export function plantGreenhouse(state, plotIndex, cropId, now) {
  const next = clone(state);
  const plot = next.greenhouse[plotIndex];
  const crop = greenhouseCrops.find((c) => c.id === cropId);
  if (!plot) return fail(state, '没有这块温室');
  if (!crop) return fail(state, '温室里不种这个');
  if (plot.cropId) return fail(state, '这块温室已经种了');
  if (plot.day === dayKey(now)) return fail(state, '这块温室今天已经种过一轮');
  plot.cropId = crop.id;
  plot.plantedAt = now;
  plot.day = dayKey(now);
  return { ok: true, message: `温室种下了${crop.name}`, state: next };
}

export function harvestGreenhouse(state, plotIndex, now) {
  const next = clone(state);
  const plot = next.greenhouse[plotIndex];
  const crop = plot && greenhouseCrops.find((c) => c.id === plot.cropId);
  if (!plot || !crop) return fail(state, '温室里没有作物');
  if (now - plot.plantedAt < growMs(crop)) return fail(state, '还没成熟');
  add(next, `crop_${crop.id}`, crop.harvestCount);
  plot.cropId = 0;
  plot.plantedAt = 0;
  return { ok: true, message: `收获${crop.name}×${crop.harvestCount}`, state: next };
}

// ---------- 加工与料理 ----------

export function startCraft(state, recipeId, now) {
  const next = clone(state);
  const recipe = craftingRecipes.find((r) => r.id === recipeId);
  if (!recipe) return fail(state, '没有这个配方');
  if (next.crafting) return fail(state, '加工坊正忙着');
  for (const req of recipe.requires) {
    if (count(next, req.item) < req.count) return fail(state, '原料不够');
  }
  for (const req of recipe.requires) take(next, req.item, req.count);
  next.crafting = { recipeId: recipe.id, readyAt: now + recipe.time * 1000 };
  return { ok: true, message: `开始制作${recipe.name}`, state: next };
}

export function collectCraft(state, now) {
  const next = clone(state);
  if (!next.crafting) return fail(state, '加工坊是空的');
  if (now < next.crafting.readyAt) return fail(state, '还在加工');
  const recipe = craftingRecipes.find((r) => r.id === next.crafting.recipeId);
  add(next, recipe.result.key, recipe.result.count);
  next.crafting = null;
  return { ok: true, message: `${recipe.name}做好了`, state: next };
}

export function cookDish(state, dishId) {
  const next = clone(state);
  const dish = dishes.find((d) => d.id === dishId);
  if (!dish) return fail(state, '没有这道菜');
  for (const req of dish.requires) {
    if (count(next, req.item) < req.count) return fail(state, '食材不够');
  }
  for (const req of dish.requires) take(next, req.item, req.count);
  add(next, `dish_${dish.id}`, 1);
  return { ok: true, message: `做出了${dish.name}`, state: next };
}

// ---------- 钓鱼 ----------

function weightedPick(list, luck) {
  const weighted = list.map((item) => ({
    ...item,
    weight: item.lucky ? item.weight * luck : item.weight,
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

export function castLine(state, now) {
  const next = clone(state);
  rollDaily(next, now);
  if (next.fishCasts >= FREE_CASTS_PER_DAY) {
    if (next.coin < BAIT_PRICE) return fail(state, '免费次数用完了，买鱼饵的金币也不够');
    next.coin -= BAIT_PRICE;
  }
  next.fishCasts += 1;
  const fish = weightedPick(FISHES, 1);
  add(next, `fish_${fish.id}`, 1);
  return { ok: true, message: `钓上了${fish.name}`, state: next };
}

export function sellFish(state, fishId, amount) {
  const next = clone(state);
  const fish = FISHES.find((f) => f.id === fishId);
  if (!fish) return fail(state, '没有这种鱼');
  if (!take(next, `fish_${fish.id}`, amount)) return fail(state, '背包里不够');
  const earned = fish.sellPrice * amount;
  next.coin += earned;
  return { ok: true, message: `卖掉${fish.name}，+${earned} 金币`, state: next };
}

// ---------- 矿洞 ----------

export function digMine(state, now) {
  const next = clone(state);
  rollDaily(next, now);
  const pick = getPickaxe(next.pickLevel);
  if (next.stamina <= 0) return fail(state, '今天的体力用完了');
  next.stamina -= 1;
  const pool = mineLoot.filter((item) => item.minPick <= pick.level);
  const drop = weightedPick(pool, 1 + next.pickLevel * 0.25);
  const amount = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
  if (drop.key === 'coin') next.coin += amount;
  else add(next, drop.key, amount);
  return { ok: true, message: `挖到${drop.name}×${amount}`, state: next };
}

export function upgradePick(state) {
  const next = clone(state);
  if (isMaxPick(next.pickLevel)) return fail(state, '镐子已经满级');
  const target = pickaxes[next.pickLevel];
  const cost = target.upgrade;
  if (next.coin < (cost.coin || 0)) return fail(state, '金币不够升级镐子');
  for (const [key, amount] of Object.entries(cost)) {
    if (key !== 'coin' && count(next, key) < amount) return fail(state, '升级材料不够');
  }
  next.coin -= cost.coin || 0;
  for (const [key, amount] of Object.entries(cost)) {
    if (key !== 'coin') take(next, key, amount);
  }
  next.pickLevel += 1;
  return { ok: true, message: `镐子升级为${target.name}`, state: next };
}

export function sellOre(state, key, amount) {
  const next = clone(state);
  const price = oreValues[key];
  if (!price) return fail(state, '这个不能卖');
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = price * amount;
  next.coin += earned;
  return { ok: true, message: `卖掉矿石，+${earned} 金币`, state: next };
}

// ---------- 咖啡馆 ----------

/** 今天上门的客人，按日期固定，不随刷新变化 */
export function todaysGuests(now) {
  const day = dayKey(now);
  let seed = 0;
  for (const ch of day) seed = (seed * 33 + ch.charCodeAt(0)) % 997;
  const pool = [...cafeGuests];
  const picked = [];
  for (let i = 0; i < CAFE_GUESTS_PER_DAY && pool.length; i += 1) {
    const index = (seed + i * 7) % pool.length;
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked.map((guest, i) => ({
    ...guest,
    dish: dishes[(seed + i) % dishes.length],
  }));
}

export function serveGuest(state, guestId, now) {
  const next = clone(state);
  rollDaily(next, now);
  const guest = todaysGuests(now).find((g) => g.id === guestId);
  if (!guest) return fail(state, '今天没有这位客人');
  if (next.cafeServed.includes(guestId)) return fail(state, '这位客人已经接待过了');
  if (!take(next, `dish_${guest.dish.id}`, 1)) return fail(state, `客人想要${guest.dish.name}`);
  const price = getCafePrice(guest.dish);
  next.coin += price;
  next.cafeServed.push(guestId);
  return { ok: true, message: `${guest.name}付了 ${price} 金币`, state: next };
}

// ---------- 背包展示 ----------

/** 背包里每项的名字、图标与可卖价格（0 表示不单卖） */
export function describeBag(state) {
  const catalog = new Map();
  for (const crop of [...seedList(), ...greenhouseCrops]) {
    catalog.set(`crop_${crop.id}`, { name: crop.name, icon: crop.icon, sell: crop.sellPrice, sellKind: 'crop', sellId: crop.id });
  }
  for (const fish of FISHES) {
    catalog.set(`fish_${fish.id}`, { name: fish.name, icon: fish.icon, sell: fish.sellPrice, sellKind: 'fish', sellId: fish.id });
  }
  for (const [key, price] of Object.entries(oreValues)) {
    const loot = mineLoot.find((item) => item.key === key);
    catalog.set(key, { name: loot ? loot.name : key, icon: '💎', sell: price, sellKind: 'ore', sellId: key });
  }
  for (const recipe of craftingRecipes) {
    catalog.set(recipe.result.key, { name: recipe.name, icon: recipe.icon, sell: 0 });
  }
  for (const dish of dishes) {
    catalog.set(`dish_${dish.id}`, { name: dish.name, icon: dish.icon, sell: 0 });
  }
  return Object.entries(state.bag)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({ key, amount, ...(catalog.get(key) || { name: key, icon: '📦', sell: 0 }) }));
}
