// 湖畔钓鱼系统
//
// 每天有免费次数，之后用金币买鱼饵。甩竿后等几秒就能收竿，
// 掉落随机：鱼（卖出/订单用）、材料、少量直接入账的金币。
import { addItem, spendItem, hasEnough, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';
import { applyPetToFishingLuck } from './pets.js';
import { recordFish } from './codex.js';
import { getBuffMultiplier } from './dishes.js';
import { getCharmMultiplier } from './charms.js';

// 每日免费钓鱼次数
const FREE_CASTS_PER_DAY = 5;
// 每次消耗鱼饵的价格
const BAIT_PRICE = 5;

// 鱼类配置（库存键 fish_<id>）
export const fishes = [
  { id: 1, name: "小鲫鱼", icon: "🐟", weight: 40, sellPrice: 8 },
  { id: 2, name: "胖鲤鱼", icon: "🐠", weight: 25, sellPrice: 15 },
  { id: 3, name: "小龙虾", icon: "🦞", weight: 15, sellPrice: 25 },
  { id: 4, name: "河豚", icon: "🐡", weight: 10, sellPrice: 40 },
  { id: 5, name: "黄金锦鲤", icon: "✨", weight: 4, sellPrice: 120, lucky: true },
  { id: 6, name: "旧靴子", icon: "🥾", weight: 6, sellPrice: 1 },
];

// 惊喜掉落（钓到鱼时额外小概率掉落）
const BONUS_DROPS = [
  { key: "wood", count: 2, weight: 30, message: "缠着水草的木料×2" },
  { key: "stone", count: 2, weight: 30, message: "湖底鹅卵石×2" },
  { key: "diamond", count: 3, weight: 12, message: "湖底闪光物：钻石×3" },
  { key: "speed_ticket", count: 1, weight: 18, message: "漂流瓶里有一张加速券" },
  { key: "coin", count: 60, weight: 10, message: "湿漉漉的零钱袋：金币×60" },
];

/**
 * 按权重随机取一项（fishingLuck 宠物会放大稀有鱼的权重）
 */
function weightedPick(list, luckMultiplier = 1) {
  const weighted = list.map((item) => ({
    ...item,
    weight: item.lucky ? item.weight * luckMultiplier : item.weight,
  }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

/**
 * 钓鱼系统是否解锁
 */
export function isFishingUnlocked(state) {
  return state.wallet.level >= 6;
}

/**
 * 今天已用的免费次数
 */
function getUsedFreeCasts(state) {
  if (state.fishing.lastFreeDate !== todayKey()) return 0;
  return state.fishing.freeCastsUsed || 0;
}

/**
 * 今天剩余免费次数
 */
export function getFreeCastsLeft(state) {
  return Math.max(0, FREE_CASTS_PER_DAY - getUsedFreeCasts(state));
}

/**
 * 是否有鱼饵可用（免费次数或背包鱼饵）
 */
export function canCast(state) {
  if (getFreeCastsLeft(state) > 0) return true;
  return hasEnough(state, "coin", BAIT_PRICE);
}

/**
 * 甩竿钓鱼
 * 返回 { success, message, fish } —— fish 供前端做展示动画
 */
export function castRod(state) {
  if (!isFishingUnlocked(state)) {
    return { success: false, message: "Lv.6 解锁湖畔钓鱼" };
  }

  const today = todayKey();

  // 优先消耗免费次数
  const freeLeft = getFreeCastsLeft(state);
  if (freeLeft > 0) {
    if (state.fishing.lastFreeDate !== today) {
      state.fishing.lastFreeDate = today;
      state.fishing.freeCastsUsed = 0;
    }
    state.fishing.freeCastsUsed++;
  } else {
    if (!hasEnough(state, "coin", BAIT_PRICE)) {
      return { success: false, message: `鱼饵不够了，需要${BAIT_PRICE}金币` };
    }
    spendItem(state, "coin", BAIT_PRICE);
  }

  // 掷鱼（小狐狸在场 + 吃过海鲜浓汤 + 装备幻彩护符时，稀有鱼权重都会提升）
  const luck = applyPetToFishingLuck(1, state)
    * getBuffMultiplier(state, 'fishingLuck')
    * getCharmMultiplier(state, 'fishingLuck');
  const fish = weightedPick(fishes, luck);
  addItem(state, `fish_${fish.id}`, 1);
  recordFish(state, fish.id);

  logEvent(state, "fishing_cast");
  trackDaily(state, "fishing", 1);

  let message = `钓到了一条${fish.icon}${fish.name}！`;
  let bonusMessage = null;

  // 10% 概率额外惊喜
  if (fish.id !== 6 && Math.random() < 0.1) {
    const bonus = weightedPick(BONUS_DROPS);
    addItem(state, bonus.key, bonus.count);
    bonusMessage = bonus.message;
    message += ` 还捞到了：${bonus.message}`;
  }

  if (fish.lucky) {
    message += " 🎉 稀有鱼!";
  }

  return { success: true, message, fish, bonusMessage, state };
}

/**
 * 卖出一条鱼
 */
export function sellFish(state, fishId) {
  const fish = fishes.find((f) => f.id === fishId);
  const key = `fish_${fishId}`;
  if (!fish || getCount(state, key) < 1) {
    return { success: false, message: "没有这种鱼可卖" };
  }

  spendItem(state, key, 1);
  addItem(state, "coin", fish.sellPrice);
  logEvent(state, "fishing_sell");

  return { success: true, message: `卖出了${fish.name}，获得${fish.sellPrice}金币`, state };
}

/**
 * 一键卖出背包里的全部鱼
 */
export function sellAllFish(state) {
  let total = 0;
  const sold = [];

  fishes.forEach((fish) => {
    const key = `fish_${fish.id}`;
    const count = getCount(state, key);
    if (count > 0) {
      spendItem(state, key, count);
      addItem(state, "coin", fish.sellPrice * count);
      total += fish.sellPrice * count;
      sold.push(`${fish.name}×${count}`);
    }
  });

  if (!sold.length) return { success: false, message: "背包里没有鱼" };

  logEvent(state, "fishing_sell");
  return { success: true, message: `卖出了${sold.join("、")}，共获得${total}金币`, state };
}

/**
 * 累计钓鱼次数（成就展示用）
 */
export function getTotalCasts(state) {
  return state.analytics.fishing_cast || 0;
}
