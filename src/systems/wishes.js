// 许愿池系统
//
// 流程：今天选一个愿 + 花金币许下 → 明天上线时按「心愿热度」结算运势 → 发奖。
//
// 关键设计：热度 = 连续许愿天数。断一天热度归零，所以这是个留存向的
// 轻量玩法 —— 玩家每天只多点一下，但连续签到的回报明显更高。
//
// 结算由 storage.rollDailyState 在跨日时调用，玩家第二天打开游戏就看到结果，
// 不需要手动领（少一次点击，多一分惊喜）。
import { wishes, getWish, MAX_LUCK, WISH_REROLL_COST, wishTierValue } from '../config/wishes.js';
import { addRewards, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';
import { formatRewards } from '../utils/format.js';
import { emit, Events } from '../core/events.js';

/** 许愿池解锁等级 */
export const WISH_MIN_LEVEL = 4;

/**
 * 许愿池是否解锁
 */
export function isWishUnlocked(state) {
  return state.wallet.level >= WISH_MIN_LEVEL;
}

/**
 * 今天是否已经许过愿
 */
export function hasWishedToday(state) {
  return state.wish.wishedDate === todayKey();
}

/**
 * 当前心愿热度（0 - MAX_LUCK）
 */
export function getWishHeat(state) {
  return Math.max(0, Math.min(MAX_LUCK, state.wish.heat || 0));
}

/**
 * 运势等级 0-10：热度线性映射，再叠 ±2 随机；满热度必得最高档。
 */
export function getLuck(state) {
  const heat = getWishHeat(state);
  if (heat >= MAX_LUCK) return 10;
  const base = Math.round((heat / MAX_LUCK) * 10);
  const roll = Math.floor(Math.random() * 5) - 2; // -2 ~ +2
  return Math.max(0, Math.min(9, base + roll));
}

/** 运势对应的奖励档位 */
export function luckTier(luck) {
  if (luck >= 10) return 'high';
  if (luck >= 5) return 'mid';
  return 'low';
}

const LUCK_LABELS = [
  '凶', '凶', '末吉', '末吉', '小吉', '小吉', '中吉', '中吉', '大吉', '大吉', '超大吉',
];

export function getLuckLabel(luck) {
  return LUCK_LABELS[Math.max(0, Math.min(10, luck))];
}

/**
 * 今天可选的三个心愿（每天固定，可花金币刷新）
 */
export function getTodayWishes(state) {
  const wish = state.wish;
  if (wish.date !== todayKey()) {
    wish.date = todayKey();
    wish.pickedIds = rollWishes(state);
    wish.rerolled = 0;
  }
  return wish.pickedIds.map((id) => getWish(id)).filter(Boolean);
}

function rollWishes() {
  const pool = [...wishes];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map((w) => w.id);
}

/**
 * 刷新今天的许愿选项
 */
export function rerollWishes(state) {
  if (!isWishUnlocked(state)) {
    return { success: false, message: `Lv.${WISH_MIN_LEVEL} 解锁许愿池` };
  }
  if (hasWishedToday(state)) {
    return { success: false, message: '今天已经许过愿了，明天再来' };
  }
  if (!hasEnough(state, 'coin', WISH_REROLL_COST)) {
    return { success: false, message: `刷新需要🪙${WISH_REROLL_COST}` };
  }

  spendItem(state, 'coin', WISH_REROLL_COST);
  state.wish.pickedIds = rollWishes();
  state.wish.rerolled += 1;
  logEvent(state, 'wish_reroll');

  return { success: true, message: '换了一批心愿', state };
}

/**
 * 许下一个愿：扣金币、热度 +1，等明天结算
 */
export function makeWish(state, wishId) {
  const wishCfg = getWish(wishId);
  if (!wishCfg) {
    return { success: false, message: '没有这个心愿' };
  }
  if (hasWishedToday(state)) {
    return { success: false, message: '今天已经许过愿了，明天上线就能看到结果' };
  }

  const cost = wishCfg.cost.coin;
  if (!hasEnough(state, 'coin', cost)) {
    return { success: false, message: `许愿需要🪙${cost}` };
  }

  spendItem(state, 'coin', cost);

  state.wish.wishedDate = todayKey();
  state.wish.pendingId = wishCfg.id;
  state.wish.heat = Math.min(MAX_LUCK, (state.wish.heat || 0) + 1);

  logEvent(state, 'wish_make');
  trackDaily(state, 'wish', 1);
  emit(Events.WISH_MADE, { wishId });

  return {
    success: true,
    message: `在许愿池边合掌许下「${wishCfg.name}」，明天上线揭晓运势（热度 ${state.wish.heat}/${MAX_LUCK}）`,
    state,
  };
}

/**
 * 跨日结算昨天的愿：发奖 + 按连续性更新热度
 *
 * - 昨天许了愿：按当时的热度算运势，从对应档位发奖
 * - 昨天没许：热度归零（断签惩罚）
 *
 * 由 storage.rollDailyState 调用。幂等：同一天只结算一次。
 * @returns {Object|null} 结算结果，没有可结算的愿时返回 null
 */
export function settleWish(state) {
  if (state.wish.lastSettleDate === todayKey()) return null;
  state.wish.lastSettleDate = todayKey();

  // 昨天没有许愿：热度清零，没有什么要结算的
  if (!state.wish.pendingId) {
    state.wish.heat = 0;
    return null;
  }

  // 有 pendingId 但 wishedDate 是今天 = 今天刚许的，不结算（等明天）
  if (state.wish.wishedDate === todayKey()) {
    return null;
  }

  const wishCfg = getWish(state.wish.pendingId);
  if (!wishCfg) {
    state.wish.pendingId = null;
    state.wish.heat = 0;
    return null;
  }

  // 结算后热度保持（今天再许愿才会 +1）；断签的归零在上面已处理
  const luck = getLuck(state);
  const tier = luckTier(luck);
  const rewards = wishCfg.rewards[tier];

  addRewards(state, rewards);
  state.wish.pendingId = null;
  state.wish.lastLuck = luck;
  state.wish.lastTier = tier;
  state.wish.totalSettled = (state.wish.totalSettled || 0) + 1;

  logEvent(state, 'wish_settle');
  if (tier === 'high') logEvent(state, 'wish_high');
  emit(Events.WISH_SETTLED, { wishId: wishCfg.id, luck, tier });

  return {
    wish: wishCfg,
    luck,
    luckLabel: getLuckLabel(luck),
    tier,
    rewardText: formatRewards(rewards),
    rewardValue: wishTierValue(rewards),
  };
}

/**
 * 昨天许的愿是否等着结算（启动流程据此决定要不要播报）
 */
export function hasPendingWish(state) {
  return !!state.wish.pendingId && state.wish.wishedDate !== todayKey();
}
