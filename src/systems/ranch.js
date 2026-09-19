// 养殖栏系统
//
// 买动物 → 喂饲料（消耗作物，管 12 小时）→ 饿着的时候按周期攒产出，
// 玩家点「收取」入背包。离线也会照常攒，回来一次收齐。
import { GAME_CONFIG } from '../config/constants.js';
import { addItem, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';

const RANCH_CONFIG = GAME_CONFIG.ranch;

/**
 * 养殖栏是否解锁
 */
export function isRanchUnlocked(state) {
  return state.wallet.level >= RANCH_CONFIG.minLevel;
}

/**
 * 查询动物配置
 */
export function getAnimalConfig(animalId) {
  return RANCH_CONFIG.animals.find((a) => a.id === animalId);
}

/**
 * 买一只动物
 * @param {Object} state
 * @param {string} animalId
 * @returns {Object} { success, message, state }
 */
export function buyAnimal(state, animalId) {
  const config = getAnimalConfig(animalId);
  if (!config) {
    return { success: false, message: "没有这种动物" };
  }
  if (!isRanchUnlocked(state)) {
    return { success: false, message: `Lv.${RANCH_CONFIG.minLevel}解锁养殖栏` };
  }
  if (state.ranch.owned.includes(animalId)) {
    return { success: false, message: `已经养了一只${config.name}了` };
  }
  if (!hasEnough(state, config.priceType, config.price)) {
    const label = config.priceType === 'coin' ? '金币' : '钻石';
    return { success: false, message: `${config.name}需要${label}${config.price}` };
  }

  spendItem(state, config.priceType, config.price);
  state.ranch.owned.push(animalId);

  logEvent(state, "ranch_buy");
  emit(Events.ANIMAL_BOUGHT, { animalId });

  return {
    success: true,
    message: `把${config.icon}${config.name}接回了养殖栏！先喂点${config.feed.item === 'crop_1001' ? '小麦' : '饲料'}让它开始产出吧`,
    state,
  };
}

/**
 * 某只动物是否处于「吃饱」状态（喂一次管 feedWindowSec 秒）
 */
export function isAnimalFed(state, animalId) {
  const animal = state.ranch.animals?.[animalId];
  if (!animal?.fedAt) return false;
  const elapsed = (Date.now() - new Date(animal.fedAt).getTime()) / 1000;
  return elapsed < RANCH_CONFIG.feedWindowSec;
}

/**
 * 喂食：消耗饲料作物，开始新一轮产出周期
 * @param {Object} state
 * @param {string} animalId
 * @returns {Object} { success, message, state }
 */
export function feedAnimal(state, animalId) {
  const config = getAnimalConfig(animalId);
  if (!config) {
    return { success: false, message: "没有这种动物" };
  }
  if (!state.ranch.owned.includes(animalId)) {
    return { success: false, message: "还没有养这只动物" };
  }
  if (isAnimalFed(state, animalId)) {
    return { success: false, message: `${config.name}现在饱着呢` };
  }
  if (!hasEnough(state, config.feed.item, config.feed.count)) {
    return { success: false, message: "饲料不够了，先收获点作物吧" };
  }

  spendItem(state, config.feed.item, config.feed.count);

  const animal = ensureAnimalRecord(state, animalId);
  animal.fedAt = new Date().toISOString();
  animal.lastCollectAt = animal.fedAt; // 从现在开始攒产出

  logEvent(state, "ranch_feed");
  emit(Events.ANIMAL_FED, { animalId });

  return {
    success: true,
    message: `喂饱了${config.icon}${config.name}，接下来${Math.floor(RANCH_CONFIG.feedWindowSec / 3600)}小时它都会产出`,
    state,
  };
}

/**
 * 内部：state.ranch.animals 里给这只动物补一条记录
 */
function ensureAnimalRecord(state, animalId) {
  if (!state.ranch.animals) state.ranch.animals = {};
  if (!state.ranch.animals[animalId]) {
    state.ranch.animals[animalId] = { fedAt: null, lastCollectAt: null };
  }
  return state.ranch.animals[animalId];
}

/**
 * 计算某只动物当前攒了几个产出（饿着就停止累积）
 * @param {Object} state
 * @param {string} animalId
 * @returns {number} 可收取数量
 */
export function getPendingProduce(state, animalId) {
  const config = getAnimalConfig(animalId);
  if (!config || !state.ranch.owned.includes(animalId)) return 0;

  const animal = state.ranch.animals?.[animalId];
  if (!animal?.fedAt || !animal.lastCollectAt) return 0;

  // 只有吃饱的时间段才产出：攒的截止点是「喂食窗口耗尽」和「现在」的较早者
  const fedAtMs = new Date(animal.fedAt).getTime();
  const windowEndMs = fedAtMs + RANCH_CONFIG.feedWindowSec * 1000;
  const collectFromMs = new Date(animal.lastCollectAt).getTime();
  const accrueEndMs = Math.min(windowEndMs, Date.now());

  const elapsed = (accrueEndMs - collectFromMs) / 1000;
  if (elapsed < config.produce.intervalSec) return 0;

  // 离线攒的也算，但一个喂食周期最多攒到窗口耗尽为止
  return Math.floor(elapsed / config.produce.intervalSec);
}

/**
 * 收取产出：把攒的产出一次性入背包，收取指针前移
 * @param {Object} state
 * @param {string} animalId
 * @returns {Object} { success, message, state }
 */
export function collectProduce(state, animalId) {
  const config = getAnimalConfig(animalId);
  if (!config) {
    return { success: false, message: "没有这种动物" };
  }

  const pending = getPendingProduce(state, animalId);
  if (pending < 1) {
    return { success: false, message: `${config.name}还没攒出产出${isAnimalFed(state, animalId) ? '' : '（记得先喂食）'}` };
  }

  const animal = state.ranch.animals[animalId];
  addItem(state, config.produce.item, pending * config.produce.count);

  // 指针只前移到「已收取的整数周期」，零头留着继续攒
  const consumedSec = pending * config.produce.intervalSec;
  animal.lastCollectAt = new Date(
    new Date(animal.lastCollectAt).getTime() + consumedSec * 1000
  ).toISOString();

  logEvent(state, "ranch_collect");
  emit(Events.ANIMAL_PRODUCED, { animalId, count: pending * config.produce.count });

  return {
    success: true,
    message: `收下了${pending * config.produce.count}个${config.icon}${getProduceName(config.produce.item)}`,
    state,
  };
}

/**
 * 产出物品的中文名（渲染器也需要，放在这里避免重复）
 */
function getProduceName(itemKey) {
  const names = { egg: "鸡蛋", wool: "羊毛", milk: "牛奶" };
  return names[itemKey] || itemKey;
}

/**
 * 一键收取所有动物
 * @param {Object} state
 * @returns {Object} { success, collected, message, state }
 */
export function collectAllProduce(state) {
  let collected = 0;
  const messages = [];

  state.ranch.owned.forEach((animalId) => {
    const result = collectProduce(state, animalId);
    if (result.success) {
      collected++;
      messages.push(result.message);
    }
  });

  if (!collected) {
    return { success: false, collected: 0, message: "养殖栏里还没有可收取的产出", state };
  }

  return {
    success: true,
    collected,
    message: messages.join("，"),
    state,
  };
}
