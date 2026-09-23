// 后山矿洞系统
//
// 和钓鱼类似：每天有免费体力，用完可以花金币多挖几次。
// 不同的是矿洞有一条镐子成长线——升级镐子既提升每日体力上限，
// 也解锁更深的矿层（更好的矿石与更高的宝石概率）。挖到的东西不会丢失，
// 走的是「稳定积累 + 逐步变强」的温和节奏，没有惩罚性设计。
import { addItem, spendItem, hasEnough, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';
import { applyPetToMiningLuck } from './pets.js';
import { getBuffMultiplier } from './dishes.js';
import { getCharmMultiplier } from './charms.js';
import { getTalentMultiplier } from './talents.js';
import {
  MINE_MIN_LEVEL, EXTRA_DIG_COST, oreValues, mineLoot, mineTrove,
  pickaxes, getPickaxe, isMaxPick,
} from '../config/mine.js';

/**
 * 矿洞是否解锁
 */
export function isMineUnlocked(state) {
  return state.wallet.level >= MINE_MIN_LEVEL;
}

/**
 * 当前镐等级（老存档兜底为 1）
 */
export function getPickLevel(state) {
  const level = state.mine?.pickLevel;
  return typeof level === 'number' && level >= 1 ? level : 1;
}

/**
 * 今日体力上限（由镐等级决定）
 */
export function getMaxStamina(state) {
  return getPickaxe(getPickLevel(state)).maxStamina;
}

/**
 * 今天已消耗的体力（跨天自动归零）
 */
function getUsedStamina(state) {
  if (state.mine.staminaDate !== todayKey()) return 0;
  return state.mine.staminaUsed || 0;
}

/**
 * 今天剩余的免费体力
 */
export function getStaminaLeft(state) {
  return Math.max(0, getMaxStamina(state) - getUsedStamina(state));
}

/**
 * 现在能不能下矿（有免费体力，或买得起额外一次）
 */
export function canDig(state) {
  if (!isMineUnlocked(state)) return false;
  if (getStaminaLeft(state) > 0) return true;
  return hasEnough(state, 'coin', EXTRA_DIG_COST);
}

/**
 * 幸运倍率：镐越好基础越高，叠加宠物 miningLuck、料理增益、装备的护符与矿洞天赋。
 * 只影响掉落表里 lucky 项的权重。
 */
function getLuckMultiplier(state) {
  const pickBonus = 1 + (getPickLevel(state) - 1) * 0.12;
  return applyPetToMiningLuck(pickBonus, state)
    * getBuffMultiplier(state, 'miningLuck')
    * getCharmMultiplier(state, 'miningLuck')
    * getTalentMultiplier(state, 'miningLuck');
}

/**
 * 从掉落表里按权重抽一项（先按镐等级过滤矿层，再放大 lucky 项权重）
 */
function rollLoot(state) {
  const pickLevel = getPickLevel(state);
  const luck = getLuckMultiplier(state);
  const pool = mineLoot
    .filter((item) => item.minPick <= pickLevel)
    .map((item) => ({ ...item, weight: item.lucky ? item.weight * luck : item.weight }));

  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

/**
 * 记录一件矿藏进收藏册（曾经挖到过就一直保留）
 */
function recordTrove(state, key) {
  if (!mineTrove.includes(key)) return; // 石头/碎金/钻石不计入矿藏册
  if (!Array.isArray(state.mine.found)) state.mine.found = [];
  if (!state.mine.found.includes(key)) state.mine.found.push(key);
}

/**
 * 下矿一次
 * 返回 { success, message, drop } —— drop 供前端做展示动画
 */
export function mineDig(state) {
  if (!isMineUnlocked(state)) {
    return { success: false, message: `Lv.${MINE_MIN_LEVEL} 解锁后山矿洞` };
  }

  const today = todayKey();
  const freeLeft = getStaminaLeft(state);

  if (freeLeft > 0) {
    if (state.mine.staminaDate !== today) {
      state.mine.staminaDate = today;
      state.mine.staminaUsed = 0;
    }
    state.mine.staminaUsed++;
  } else {
    if (!hasEnough(state, 'coin', EXTRA_DIG_COST)) {
      return { success: false, message: `体力用完了，多挖一次要${EXTRA_DIG_COST}金币` };
    }
    spendItem(state, 'coin', EXTRA_DIG_COST);
  }

  const loot = rollLoot(state);
  const count = loot.min + Math.floor(Math.random() * (loot.max - loot.min + 1));
  addItem(state, loot.key, count);
  recordTrove(state, loot.key);

  state.mine.totalDigs = (state.mine.totalDigs || 0) + 1;
  logEvent(state, 'mine_dig');
  trackDaily(state, 'mine', 1);

  const lootLabel = loot.key === 'coin' ? `碎金 ×${count}` : `${loot.name} ×${count}`;
  let message = `挖到了${lootLabel}！`;
  if (loot.lucky) message += ' ✨ 稀有矿藏！';

  return { success: true, message, drop: { ...loot, count }, state };
}

/**
 * 升级镐子（消耗矿石 + 金币），提升体力上限与矿层深度
 */
export function upgradePickaxe(state) {
  if (!isMineUnlocked(state)) {
    return { success: false, message: `Lv.${MINE_MIN_LEVEL} 解锁后山矿洞` };
  }

  const level = getPickLevel(state);
  if (isMaxPick(level)) {
    return { success: false, message: '镐子已经是最高级啦' };
  }

  const next = getPickaxe(level + 1);
  const cost = next.upgrade;

  // 材料是否齐全
  const missing = Object.entries(cost).filter(([key, need]) => getCount(state, key) < need);
  if (missing.length) {
    return { success: false, message: `材料不足，还差 ${missing.map(([k, n]) => `${labelOf(k)}×${n - getCount(state, k)}`).join('、')}` };
  }

  Object.entries(cost).forEach(([key, need]) => spendItem(state, key, need));
  state.mine.pickLevel = level + 1;
  logEvent(state, 'pickaxe_upgrade');

  return {
    success: true,
    message: `镐子升级为「${next.icon}${next.name}」，每日体力上限 ${next.maxStamina}，解锁更深的矿层！`,
    state,
  };
}

/**
 * 升级材料的中文名（仅用于提示文案，避免引入 format.js 造成循环依赖）
 */
function labelOf(key) {
  const raw = { coin: '金币', diamond: '钻石', stone: '石头' };
  if (raw[key]) return raw[key];
  const loot = mineLoot.find((l) => l.key === key);
  return loot ? loot.name : key;
}

/**
 * 卖出一种矿石/宝石
 */
export function sellOre(state, key) {
  const price = oreValues[key];
  if (!price) {
    return { success: false, message: '这个不能在矿洞出售' };
  }
  const count = getCount(state, key);
  if (count < 1) {
    return { success: false, message: '没有这种矿藏可卖' };
  }

  spendItem(state, key, count);
  addItem(state, 'coin', price * count);
  logEvent(state, 'ore_sell');

  return { success: true, message: `卖出了${labelOf(key)}×${count}，获得🪙${price * count}`, state };
}

/**
 * 一键卖出背包里全部矿石/宝石
 */
export function sellAllOre(state) {
  let total = 0;
  const sold = [];

  Object.keys(oreValues).forEach((key) => {
    const count = getCount(state, key);
    if (count > 0) {
      spendItem(state, key, count);
      addItem(state, 'coin', oreValues[key] * count);
      total += oreValues[key] * count;
      sold.push(`${labelOf(key)}×${count}`);
    }
  });

  if (!sold.length) return { success: false, message: '背包里没有矿石或宝石' };

  logEvent(state, 'ore_sell');
  return { success: true, message: `卖出了${sold.join('、')}，共获得🪙${total}`, state };
}

/**
 * 累计下矿次数（成就 / 展示用）
 */
export function getTotalDigs(state) {
  return state.mine?.totalDigs || 0;
}

/**
 * 下一级镐的升级需求（满级返回 null），供渲染层展示按钮
 */
export function getNextUpgrade(state) {
  const level = getPickLevel(state);
  if (isMaxPick(level)) return null;
  return { pickaxe: getPickaxe(level + 1), cost: getPickaxe(level + 1).upgrade };
}

/**
 * 是否凑齐了下一级镐的材料
 */
export function canUpgradePickaxe(state) {
  const upgrade = getNextUpgrade(state);
  if (!upgrade) return false;
  return Object.entries(upgrade.cost).every(([key, need]) => getCount(state, key) >= need);
}

export { pickaxes, oreValues, mineTrove, EXTRA_DIG_COST, MINE_MIN_LEVEL };
