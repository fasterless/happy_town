// 幸运转盘系统
//
// 消耗抽奖券（lottery_ticket，来自活跃度宝箱 / 商城 / 钓鱼漂流瓶），
// 随机抽取一份奖励。幸运大奖有独立的保底计数，避免长期不出金。
import { addItem, spendItem, getCount } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';

// 转盘奖项（weight 为抽中权重）
export const lotteryPrizes = [
  { id: "coin_s", name: "小额金币", icon: "🪙", rewards: { coin: 80 }, weight: 30 },
  { id: "coin_m", name: "金币袋", icon: "💰", rewards: { coin: 300 }, weight: 22 },
  { id: "wood", name: "木材包", icon: "🪵", rewards: { wood: 10 }, weight: 14 },
  { id: "stone", name: "石料包", icon: "🪨", rewards: { stone: 10 }, weight: 14 },
  { id: "seed_mix", name: "混合种子", icon: "🌱", rewards: { crop_1001: 5, crop_1006: 5, crop_1002: 3 }, weight: 10 },
  { id: "speed", name: "加速券", icon: "⏩", rewards: { speed_ticket: 2 }, weight: 6 },
  { id: "diamond_s", name: "钻石碎", icon: "💎", rewards: { diamond: 15 }, weight: 3 },
  { id: "jackpot", name: "超级大奖", icon: "🏆", rewards: { diamond: 100, coin: 2000 }, weight: 1 },
];

// 多少抽必出一个超级大奖
const JACKPOT_PITY = 40;

/**
 * 抽奖系统是否解锁（跟着任务系统的等级走，因为券来自活跃度宝箱）
 */
export function isLotteryUnlocked(state) {
  return state.wallet.level >= 7;
}

/**
 * 按权重抽一个奖项
 */
function rollPrize(state) {
  // 保底：攒够次数必出大奖，同时清零计数
  state.lottery.pity = (state.lottery.pity || 0) + 1;
  if (state.lottery.pity >= JACKPOT_PITY) {
    state.lottery.pity = 0;
    return lotteryPrizes.find((p) => p.id === "jackpot");
  }

  const total = lotteryPrizes.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  for (const prize of lotteryPrizes) {
    roll -= prize.weight;
    if (roll <= 0) {
      if (prize.id === "jackpot") state.lottery.pity = 0;
      return prize;
    }
  }
  return lotteryPrizes[0];
}

/**
 * 抽一次奖
 * @returns {Object} { success, message, prize }
 */
export function spinLottery(state) {
  if (!isLotteryUnlocked(state)) {
    return { success: false, message: "Lv.7 解锁幸运转盘" };
  }

  if (getCount(state, "lottery_ticket") < 1) {
    return { success: false, message: "没有抽奖券了，做任务领宝箱可以获得" };
  }

  spendItem(state, "lottery_ticket", 1);

  const prize = rollPrize(state);
  Object.entries(prize.rewards).forEach(([key, count]) => addItem(state, key, count));
  state.lottery.spins++;

  logEvent(state, "lottery_spin");

  return {
    success: true,
    message: `抽中了「${prize.icon}${prize.name}」！`,
    prize,
    state,
  };
}

/**
 * 剩余多少抽到保底大奖
 */
export function getSpinsToJackpot(state) {
  return Math.max(0, JACKPOT_PITY - (state.lottery.pity || 0));
}
