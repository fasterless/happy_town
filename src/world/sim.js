// 像素小镇的玩法规则
//
// 全部是纯函数：吃进状态，返回新状态与一条给玩家看的消息。
// 时间由调用方传入（now，毫秒），测试里可以随意拨动。
// 数值全部读 src/config，这里不另定价格。

import { crops } from '../config/crops.js';
import { getCurrentSeasonalEvent, getAllSeasonalCrops } from '../config/seasons.js';
import { greenhouseCrops, GREENHOUSE_PLOTS } from '../config/greenhouse.js';
import { craftingRecipes } from '../config/crafting.js';
import { dishes } from '../config/dishes.js';
import { mineLoot, pickaxes, oreValues, getPickaxe, isMaxPick } from '../config/mine.js';
import { cafeGuests, CAFE_GUESTS_PER_DAY, getCafePrice } from '../config/cafe.js';
import { FARM_PLOTS, ORCHARD_TREES, RANCH_ANIMALS, APIARY_HIVES } from './map.js';
import {
  FORAGE_LIMIT_PER_DAY, boardRequests, forageLoot, orchardFruits, ranchAnimals, apiaryHoney, APIARY_YIELD,
} from '../config/world.js';

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
// 每天首次进入小镇领的登录金币，给日常玩法一点稳定的现金流。
const DAILY_BONUS = 60;

export const FISH_TABLE = FISHES;
export const DAILY_LIMITS = {
  fish: FREE_CASTS_PER_DAY,
  forage: FORAGE_LIMIT_PER_DAY,
};

// 天气按日期固定：晴 / 多云 / 雨。雨天让作物长得更快，田地视作自动湿润。
const WEATHERS = [
  { id: 'sunny', name: '晴天', icon: '☀️', growth: 1, note: '阳光正好' },
  { id: 'cloudy', name: '多云', icon: '⛅', growth: 1, note: '云层不厚，和平常一样' },
  { id: 'rainy', name: '雨天', icon: '🌧️', growth: 0.72, note: '雨水浇灌，作物长得更快，田地自动湿润' },
];

/** 今天的天气，按日期固定，刷新不变。 */
export function weatherOf(now) {
  const day = dayKey(now);
  let seed = 0;
  for (const ch of day) seed = (seed * 31 + ch.charCodeAt(0)) % 1000;
  // 让晴天多一点：晴、多云、晴、雨 四选一。
  return [WEATHERS[0], WEATHERS[1], WEATHERS[0], WEATHERS[2]][seed % 4];
}

// 一天的毫秒数，用于天气预报按日推进。
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** 从今天起连续 n 天的天气预报（按日期固定，供风车坡瞭望台展示）。 */
export function forecast(now, days = 3) {
  const list = [];
  for (let i = 0; i < days; i += 1) {
    const w = weatherOf(now + i * ONE_DAY_MS);
    list.push({ offset: i, id: w.id, name: w.name, icon: w.icon, note: w.note });
  }
  return list;
}

export function createWorldState(now = Date.now()) {
  return {
    version: 1,
    coin: STARTING_COIN,
    bag: {},
    plots: FARM_PLOTS.map(() => ({ cropId: 0, plantedAt: 0, watered: false })),
    greenhouse: Array.from({ length: GREENHOUSE_PLOTS }, () => ({ cropId: 0, plantedAt: 0, day: '' })),
    orchard: {},
    ranch: {},
    apiary: {},
    crafting: null,
    pickLevel: 1,
    stamina: pickaxes[0].maxStamina,
    staminaDay: dayKey(now),
    fishCasts: 0,
    fishDay: dayKey(now),
    cafeServed: [],
    cafeDay: dayKey(now),
    forageCount: 0,
    forageDay: dayKey(now),
    boardDone: false,
    boardDay: dayKey(now),
    bonusDay: '',
    wishDay: '',
    friends: {},
    stats: {
      casts: 0, digs: 0, harvests: 0, served: 0, foraged: 0, crafted: 0, cooked: 0, talks: 0, wishes: 0, fruits: 0, ranch: 0, honey: 0, coinEarned: 0,
    },
  };
}

/** 累加一个终身统计（用于成就）。缺字段时兜底成 0。 */
function bump(state, key, amount = 1) {
  if (!state.stats) state.stats = {};
  state.stats[key] = (state.stats[key] || 0) + amount;
}

export function dayKey(now) {
  const date = new Date(now);
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** 当前季节限定作物 + 基础作物，作为种子铺（只展示当前活动开放的） */
export function seedList() {
  const event = getCurrentSeasonalEvent();
  const seasonal = event ? event.seasonal.crops : [];
  return [...crops, ...seasonal];
}

// 查询用的全量作物表：基础作物 + 所有季节限定作物 + 温室作物。
// 种子铺（seedList）只给当前活动的作物；但已经种下/已经收进背包的
// 限定作物，在活动结束后也必须能收获、能卖、能显示，所以查表不限当前活动。
export function allCrops() {
  return [...crops, ...getAllSeasonalCrops(), ...greenhouseCrops];
}

function findCrop(id) {
  return allCrops().find((c) => c.id === id);
}

function growMs(crop) {
  return Math.min(crop.growTime * 1000, MAX_GROW_MS);
}

/** 0 空地，1 种子，2 幼苗，3 生长，4 成熟。weather 可选，雨天生长更快。 */
export function growthStage(plot, crop, now, weather = null) {
  if (!plot.cropId) return 0;
  const elapsed = now - plot.plantedAt;
  const total = growMs(crop) * (weather?.growth ?? 1);
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
    orchard: { ...(state.orchard || {}) },
    ranch: { ...(state.ranch || {}) },
    apiary: { ...(state.apiary || {}) },
    crafting: state.crafting ? { ...state.crafting } : null,
    cafeServed: [...state.cafeServed],
    friends: { ...(state.friends || {}) },
    stats: { ...(state.stats || {}) },
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
  if (state.forageDay !== day) {
    state.forageCount = 0;
    state.forageDay = day;
  }
  if (state.boardDay !== day) {
    state.boardDone = false;
    state.boardDay = day;
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

export function harvestPlot(state, plotIndex, now, weather = null) {
  const next = clone(state);
  const plot = next.plots[plotIndex];
  const crop = plot && findCrop(plot.cropId);
  if (!plot || !plot.cropId || !crop) return fail(state, '这里没有作物');
  if (growthStage(plot, crop, now, weather) < 4) return fail(state, '还没成熟');
  // 雨天视作已浇水，收成拉满。
  const watered = plot.watered || weather?.id === 'rainy';
  const amount = watered ? crop.harvestCount : Math.max(1, crop.harvestCount - 1);
  add(next, `crop_${crop.id}`, amount);
  bump(next, 'harvests');
  plot.cropId = 0;
  plot.plantedAt = 0;
  plot.watered = false;
  return { ok: true, message: `收获${crop.name}×${amount}`, state: next };
}

export function sellCrop(state, cropId, amount) {
  const next = clone(state);
  const crop = findCrop(cropId);
  if (!crop) return fail(state, '没有这种作物');
  const key = `crop_${crop.id}`;
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = crop.sellPrice * amount;
  next.coin += earned;
  bump(next, 'coinEarned', earned);
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
  bump(next, 'harvests');
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
  bump(next, 'crafted');
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
  bump(next, 'cooked');
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

export function castLine(state, now, quality = 1) {
  const next = clone(state);
  rollDaily(next, now);
  if (next.fishCasts >= FREE_CASTS_PER_DAY) {
    if (next.coin < BAIT_PRICE) return fail(state, '免费次数用完了，买鱼饵的金币也不够');
    next.coin -= BAIT_PRICE;
  }
  next.fishCasts += 1;
  bump(next, 'casts');
  // quality 来自钓鱼小游戏：命中越准，稀有鱼（lucky）权重越高。
  const fish = weightedPick(FISHES, Math.max(1, quality));
  add(next, `fish_${fish.id}`, 1);
  const left = Math.max(0, FREE_CASTS_PER_DAY - next.fishCasts);
  const tail = left > 0 ? `（今日免费剩 ${left} 次）` : '（免费次数已用完，之后每次 5 金币鱼饵）';
  return { ok: true, message: `钓上了${fish.name}${tail}`, state: next };
}

export function sellFish(state, fishId, amount) {
  const next = clone(state);
  const fish = FISHES.find((f) => f.id === fishId);
  if (!fish) return fail(state, '没有这种鱼');
  if (!take(next, `fish_${fish.id}`, amount)) return fail(state, '背包里不够');
  const earned = fish.sellPrice * amount;
  next.coin += earned;
  bump(next, 'coinEarned', earned);
  return { ok: true, message: `卖掉${fish.name}，+${earned} 金币`, state: next };
}

// ---------- 萤火林与公告栏 ----------

function stableHash(text) {
  let value = 0;
  for (const ch of text) value = (value * 33 + ch.charCodeAt(0)) % 997;
  return value;
}

/** 今天公告栏上的唯一委托，日期固定，刷新页面也不会换单。 */
export function boardRequestOf(now) {
  return boardRequests[stableHash(dayKey(now)) % boardRequests.length];
}

export function forageForest(state, now) {
  const next = clone(state);
  rollDaily(next, now);
  if (next.forageCount >= FORAGE_LIMIT_PER_DAY) return fail(state, '今天的萤火林已经采得差不多了');
  next.forageCount += 1;
  const total = forageLoot.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  let drop = forageLoot[forageLoot.length - 1];
  for (const item of forageLoot) {
    roll -= item.weight;
    if (roll <= 0) {
      drop = item;
      break;
    }
  }
  const amount = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
  add(next, drop.key, amount);
  bump(next, 'foraged');
  const left = Math.max(0, FORAGE_LIMIT_PER_DAY - next.forageCount);
  const tail = left > 0 ? `（今日还能采 ${left} 次）` : '（今天的萤火林采完了）';
  return { ok: true, message: `在萤火林找到${drop.name}×${amount}${tail}`, state: next };
}

export function completeBoardRequest(state, now) {
  const next = clone(state);
  rollDaily(next, now);
  const request = boardRequestOf(now);
  if (next.boardDone) return fail(state, '今天的公告栏委托已经完成了');
  if (!take(next, request.item, request.count)) {
    return fail(state, `还缺${request.name}需要的材料`);
  }
  next.coin += request.reward;
  next.boardDone = true;
  bump(next, 'coinEarned', request.reward);
  return { ok: true, message: `完成${request.name}，获得${request.reward}金币`, state: next };
}

export function sellForage(state, key, amount) {
  const next = clone(state);
  const item = forageLoot.find((entry) => entry.key === key);
  if (!item) return fail(state, '这件东西不能在货摊出售');
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = item.sellPrice * amount;
  next.coin += earned;
  bump(next, 'coinEarned', earned);
  return { ok: true, message: `卖掉${item.name}，+${earned}金币`, state: next };
}

// ---------- 矿洞 ----------

export function digMine(state, now) {
  const next = clone(state);
  rollDaily(next, now);
  const pick = getPickaxe(next.pickLevel);
  if (next.stamina <= 0) return fail(state, '今天的体力用完了');
  next.stamina -= 1;
  bump(next, 'digs');
  const pool = mineLoot.filter((item) => item.minPick <= pick.level);
  const drop = weightedPick(pool, 1 + next.pickLevel * 0.25);
  const amount = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
  if (drop.key === 'coin') { next.coin += amount; bump(next, 'coinEarned', amount); }
  else add(next, drop.key, amount);
  return { ok: true, message: `挖到${drop.name}×${amount}（体力剩 ${next.stamina}）`, state: next };
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
  bump(next, 'coinEarned', earned);
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
  bump(next, 'served');
  bump(next, 'coinEarned', price);
  return { ok: true, message: `${guest.name}付了 ${price} 金币`, state: next };
}

// ---------- 果园 ----------

/** 这棵果树今天是否还能摘（按现实日期，隔天自动恢复）。 */
export function orchardReady(state, index, now) {
  return (state.orchard?.[index]) !== dayKey(now);
}

/** 摘一棵果树：每棵每天一次，给固定数量的果子。 */
export function harvestOrchard(state, index, now) {
  const tree = ORCHARD_TREES[index];
  if (!tree) return fail(state, '这里没有果树');
  const fruit = orchardFruits[tree.fruit];
  if (!fruit) return fail(state, '这棵树不结果');
  const day = dayKey(now);
  if (state.orchard?.[index] === day) return fail(state, `这棵${fruit.name}树今天已经摘过了，明天再来`);
  const next = clone(state);
  next.orchard[index] = day;
  add(next, `fruit_${tree.fruit}`, fruit.count);
  bump(next, 'fruits', fruit.count);
  return { ok: true, message: `摘下${fruit.icon}${fruit.name}×${fruit.count}`, state: next };
}

export function sellFruit(state, key, amount) {
  const next = clone(state);
  const fruit = orchardFruits[key.replace('fruit_', '')];
  if (!fruit) return fail(state, '这个不能卖');
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = fruit.sellPrice * amount;
  next.coin += earned;
  bump(next, 'coinEarned', earned);
  return { ok: true, message: `卖掉${fruit.name}，+${earned} 金币`, state: next };
}

// ---------- 牧场 ----------

/** 这只动物今天是否还能照料（按现实日期，隔天自动恢复）。 */
export function ranchReady(state, index, now) {
  return (state.ranch?.[index]) !== dayKey(now);
}

/** 照料一只动物：每头每天一次，收取固定数量的畜产品。 */
export function careAnimal(state, index, now) {
  const beast = RANCH_ANIMALS[index];
  if (!beast) return fail(state, '这里没有动物');
  const info = ranchAnimals[beast.animal];
  if (!info) return fail(state, '这只动物照料不出什么');
  const day = dayKey(now);
  if (state.ranch?.[index] === day) return fail(state, `今天已经照料过这只${info.name}了，明天再来`);
  const next = clone(state);
  next.ranch[index] = day;
  add(next, `ranch_${info.product}`, info.count);
  bump(next, 'ranch');
  return { ok: true, message: `照料${info.icon}${info.name}，收取${info.productIcon}${info.productName}×${info.count}`, state: next };
}

export function sellRanch(state, key, amount) {
  const next = clone(state);
  const product = key.replace('ranch_', '');
  const info = Object.values(ranchAnimals).find((a) => a.product === product);
  if (!info) return fail(state, '这个不能卖');
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = info.sellPrice * amount;
  next.coin += earned;
  bump(next, 'coinEarned', earned);
  return { ok: true, message: `卖掉${info.productName}，+${earned} 金币`, state: next };
}

// ---------- 蜂场 ----------

/** 这个蜂箱今天是否还能收蜜（按现实日期，隔天自动恢复）。 */
export function apiaryReady(state, index, now) {
  return (state.apiary?.[index]) !== dayKey(now);
}

/** 收一个蜂箱：每箱每天一次，给 min~max 罐蜂蜜，偶尔额外一份蜂王浆。 */
export function collectHoney(state, index, now) {
  const hive = APIARY_HIVES[index];
  if (!hive) return fail(state, '这里没有蜂箱');
  const day = dayKey(now);
  if (state.apiary?.[index] === day) return fail(state, '这个蜂箱今天已经收过蜜了，明天再来');
  const next = clone(state);
  next.apiary[index] = day;
  const span = APIARY_YIELD.max - APIARY_YIELD.min + 1;
  const honey = APIARY_YIELD.min + Math.floor(Math.random() * span);
  add(next, 'apiary_honey', honey);
  bump(next, 'honey', honey);
  let extra = '';
  if (Math.random() < APIARY_YIELD.rareChance) {
    add(next, 'apiary_jelly', 1);
    extra = `，还意外收获${apiaryHoney.jelly.icon}${apiaryHoney.jelly.name}×1`;
  }
  return { ok: true, message: `收取${apiaryHoney.honey.icon}${apiaryHoney.honey.name}×${honey}${extra}`, state: next };
}

export function sellHoney(state, key, amount) {
  const next = clone(state);
  const info = apiaryHoney[key.replace('apiary_', '')];
  if (!info) return fail(state, '这个不能卖');
  if (!take(next, key, amount)) return fail(state, '背包里不够');
  const earned = info.sellPrice * amount;
  next.coin += earned;
  bump(next, 'coinEarned', earned);
  return { ok: true, message: `卖掉${info.name}，+${earned} 金币`, state: next };
}

// ---------- 背包展示 ----------

/** 背包/物品目录：key → { name, icon, sell, sellKind, sellId } */
function buildCatalog() {
  const catalog = new Map();
  for (const crop of allCrops()) {
    catalog.set(`crop_${crop.id}`, { name: crop.name, icon: crop.icon, sell: crop.sellPrice, sellKind: 'crop', sellId: crop.id });
  }
  for (const fish of FISHES) {
    catalog.set(`fish_${fish.id}`, { name: fish.name, icon: fish.icon, sell: fish.sellPrice, sellKind: 'fish', sellId: fish.id });
  }
  for (const item of forageLoot) {
    catalog.set(item.key, { name: item.name, icon: item.icon, sell: item.sellPrice, sellKind: 'forage', sellId: item.key });
  }
  for (const [key, fruit] of Object.entries(orchardFruits)) {
    catalog.set(`fruit_${key}`, { name: fruit.name, icon: fruit.icon, sell: fruit.sellPrice, sellKind: 'fruit', sellId: `fruit_${key}` });
  }
  for (const info of Object.values(ranchAnimals)) {
    catalog.set(`ranch_${info.product}`, { name: info.productName, icon: info.productIcon, sell: info.sellPrice, sellKind: 'ranch', sellId: `ranch_${info.product}` });
  }
  for (const [key, info] of Object.entries(apiaryHoney)) {
    catalog.set(`apiary_${key}`, { name: info.name, icon: info.icon, sell: info.sellPrice, sellKind: 'apiary', sellId: `apiary_${key}` });
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
  return catalog;
}

/** 某个物品 key 的「图标+名字」，找不到就回退成 key。 */
export function itemLabel(key) {
  const entry = buildCatalog().get(key);
  return entry ? `${entry.icon}${entry.name}` : key;
}

/** 背包里每项的名字、图标与可卖价格（0 表示不单卖） */
export function describeBag(state) {
  const catalog = buildCatalog();
  return Object.entries(state.bag)
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({ key, amount, ...(catalog.get(key) || { name: key, icon: '📦', sell: 0 }) }));
}

// ---------- 邻居好感度 ----------

const FRIEND_MAX = 100;

/** 和邻居聊天：每位邻居每天首次聊天 +5 好感（封顶 100）。 */
export function talkFriend(state, npcId, now) {
  const next = clone(state);
  if (!next.friends) next.friends = {};
  const rec = { ...(next.friends[npcId] || { points: 0, day: '' }) };
  const day = dayKey(now);
  let gained = 0;
  if (rec.day !== day) {
    gained = Math.min(5, FRIEND_MAX - rec.points);
    rec.points = Math.min(FRIEND_MAX, rec.points + 5);
    rec.day = day;
    if (gained > 0) bump(next, 'talks');
  }
  next.friends[npcId] = rec;
  return { ok: true, gained, points: rec.points, state: next };
}

/** 好感度 → 0~5 颗心 */
export function friendHearts(points) {
  return Math.max(0, Math.min(5, Math.floor((points || 0) / 20)));
}

// ---------- 每日登录奖励 ----------

/** 每天首次进入小镇领登录金币；已领过返回 ok:false。 */
export function claimDailyBonus(state, now) {
  const day = dayKey(now);
  if (state.bonusDay === day) return { ok: false, message: '', state };
  const next = clone(state);
  next.bonusDay = day;
  next.coin += DAILY_BONUS;
  bump(next, 'coinEarned', DAILY_BONUS);
  const w = weatherOf(now);
  return { ok: true, message: `今天${w.icon}${w.name} · 登录奖励 +${DAILY_BONUS} 金币`, state: next };
}

// ---------- 许愿喷泉 ----------

// 广场中央的喷泉每天可以许一次愿，换一份温柔的小礼物。当天的礼物由
// 日期决定（刷新页面不变），不惩罚缺席，纯粹是每天进城的一个小仪式。
const WISH_GIFTS = [
  { coin: 30, note: '水面泛起金光，你在池底捡到 30 金币' },
  { item: 'forage_berry', count: 2, note: '一只小鸟衔来 2 颗野莓放在池边' },
  { item: 'forage_herb', count: 2, note: '晚风送来 2 束清香的香草' },
  { coin: 22, note: '喷泉低声回应了你的心愿，+22 金币' },
  { item: 'forage_mushroom', count: 1, note: '池底悄悄浮上 1 朵林地蘑菇' },
  { coin: 40, note: '硬币叮当落水，回响里多了 40 金币的好运' },
];

/** 今天喷泉给的礼物（按日期固定，供 UI 预告与许愿共用）。 */
export function wishGiftOf(now) {
  return WISH_GIFTS[stableHash(`wish:${dayKey(now)}`) % WISH_GIFTS.length];
}

/** 每天首次在喷泉许愿领取小礼物；已许过返回 ok:false。 */
export function makeWish(state, now) {
  const day = dayKey(now);
  if (state.wishDay === day) return fail(state, '今天已经许过愿了，明天再来吧');
  const next = clone(state);
  next.wishDay = day;
  const gift = wishGiftOf(now);
  if (gift.coin) {
    next.coin += gift.coin;
    bump(next, 'coinEarned', gift.coin);
  }
  if (gift.item) add(next, gift.item, gift.count);
  bump(next, 'wishes');
  return { ok: true, message: `🌟 ${gift.note}`, state: next };
}

// ---------- 每日剩余额度（HUD / 提示用） ----------

export function dailyRemaining(state, now) {
  const day = dayKey(now);
  const fishUsed = state.fishDay === day ? state.fishCasts : 0;
  const forageUsed = state.forageDay === day ? state.forageCount : 0;
  const stamina = state.staminaDay === day ? state.stamina : getPickaxe(state.pickLevel).maxStamina;
  return {
    fish: Math.max(0, FREE_CASTS_PER_DAY - fishUsed),
    forage: Math.max(0, FORAGE_LIMIT_PER_DAY - forageUsed),
    stamina,
    boardDone: state.boardDay === day ? state.boardDone : false,
    wished: state.wishDay === day,
    orchard: ORCHARD_TREES.filter((_, i) => (state.orchard?.[i]) !== day).length,
    ranch: RANCH_ANIMALS.filter((_, i) => (state.ranch?.[i]) !== day).length,
    apiary: APIARY_HIVES.filter((_, i) => (state.apiary?.[i]) !== day).length,
  };
}

/** 今天的日常是不是都做完了（用来提示"明天再来"）。 */
export function allDailiesDone(state, now) {
  const r = dailyRemaining(state, now);
  const day = dayKey(now);
  const guests = todaysGuests(now);
  const servedAll = state.cafeDay === day
    ? guests.every((g) => state.cafeServed.includes(g.id))
    : false;
  return r.fish === 0 && r.forage === 0 && r.stamina === 0 && r.boardDone && servedAll;
}

// ---------- 成就 ----------

/** 依据终身统计与当前进度算出成就列表（纯展示，不写状态）。 */
export function achievementsOf(state) {
  const s = state.stats || {};
  const topFriend = Math.max(0, ...Object.values(state.friends || {}).map((f) => f.points || 0));
  const defs = [
    { id: 'harvest', icon: '🌾', name: '农忙好手', goal: 20, value: s.harvests || 0, desc: '收获作物 20 次' },
    { id: 'cast', icon: '🎣', name: '钓鱼达人', goal: 20, value: s.casts || 0, desc: '抛竿 20 次' },
    { id: 'dig', icon: '⛏️', name: '矿洞常客', goal: 30, value: s.digs || 0, desc: '下矿 30 次' },
    { id: 'cook', icon: '🍳', name: '料理新星', goal: 5, value: s.cooked || 0, desc: '做出 5 道菜' },
    { id: 'serve', icon: '☕', name: '金牌接待', goal: 10, value: s.served || 0, desc: '招待 10 位客人' },
    { id: 'coin', icon: '💰', name: '小镇富翁', goal: 2000, value: s.coinEarned || 0, desc: '累计赚 2000 金币' },
    { id: 'pick', icon: '🔨', name: '镐子行家', goal: 3, value: state.pickLevel || 1, desc: '把镐子升到 3 级' },
    { id: 'friend', icon: '💞', name: '知心好友', goal: FRIEND_MAX, value: topFriend, desc: '把一位邻居处到满好感' },
    { id: 'wish', icon: '🌟', name: '心愿收集', goal: 15, value: s.wishes || 0, desc: '在喷泉许愿 15 次' },
    { id: 'orchard', icon: '🍎', name: '果园丰收', goal: 30, value: s.fruits || 0, desc: '从果园摘到 30 个水果' },
    { id: 'ranch', icon: '🐄', name: '牧场之友', goal: 40, value: s.ranch || 0, desc: '照料牧场动物 40 次' },
    { id: 'honey', icon: '🍯', name: '甜蜜守望', goal: 30, value: s.honey || 0, desc: '从蜂场收取 30 罐蜂蜜' },
  ];
  return defs.map((d) => ({ ...d, done: d.value >= d.goal }));
}
