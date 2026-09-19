// 订单系统模块
import { orders, getOrder } from '../config/orders.js';
import { getCrop } from '../config/crops.js';
import { addItem, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { applyWeatherToReward } from './weather.js';
import { applyPetToOrderReward } from './pets.js';
import { GAME_CONFIG } from '../config/constants.js';
import { getSeasonalOrders } from '../config/seasons.js';
import { todayKey } from '../utils/time.js';

/**
 * 计算订单的实际金币奖励（含天气与宠物加成）
 * @param {Object} state - 游戏状态
 * @param {Object} order - 订单配置
 * @returns {number} 实际金币
 */
export function getOrderCoinReward(state, order) {
  return applyPetToOrderReward(applyWeatherToReward(order.coin, state), state);
}

/**
 * 连锁加成：连续完成同 type 订单时，每连一层 +10%，封顶 5 层（+50%）
 * @param {Object} state
 * @param {Object} order
 * @returns {number} 加成后的金币
 */
export function applyChainBonus(state, order) {
  if (state.orders.chainType !== order.type || !state.orders.chainCount) {
    return 0; // 没有连锁关系，无加成
  }
  const step = GAME_CONFIG.orders.chainBonusStep;
  const max = GAME_CONFIG.orders.chainBonusMax;
  const level = Math.min(state.orders.chainCount, max);
  return Math.floor(order.coin * step * level);
}

/**
 * 获取限时订单剩余秒数（没有进行中的限时单返回 0）
 */
export function getRushRemainingSeconds(state) {
  const rush = state.orders.rush;
  if (!rush) return 0;
  const remain = Math.floor((rush.expireAt - Date.now()) / 1000);
  return Math.max(0, remain);
}

/**
 * 限时订单是否已过期（过期即失败，接新单前要清理）
 */
export function isRushExpired(state) {
  return !!state.orders.rush && getRushRemainingSeconds(state) === 0;
}

/**
 * 今天是否已经接过限时订单
 */
export function hasRushedToday(state) {
  return state.orders.rushFinishedToday === todayKey();
}

/**
 * 完成订单
 * @param {Object} state - 游戏状态
 * @param {number} orderIndex - 订单索引 (0-2)
 * @returns {Object} 结果 { success, message, state }
 */
export function completeOrder(state, orderIndex) {
  const orderId = state.orders.activeIds[orderIndex];
  const order = getOrder(orderId);

  if (!order) {
    return { success: false, message: "订单不存在" };
  }

  // 检查等级
  if (state.wallet.level < order.unlockLevel) {
    return { success: false, message: `需要Lv.${order.unlockLevel}` };
  }

  // 检查材料是否足够
  for (const req of order.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      const cropId = Number(req.item.replace("crop_", ""));
      const crop = getCrop(cropId);
      const cropName = crop ? crop.name : "作物";
      return { success: false, message: `${cropName}不足` };
    }
  }

  // 扣除材料
  for (const req of order.requires) {
    spendItem(state, req.item, req.count);
  }

  // 发放奖励（天气 + 宠物加成作用于金币，连锁再加成）
  const base = getOrderCoinReward(state, order);
  const chainBonus = applyChainBonus(state, order);
  const coin = base + chainBonus;
  addItem(state, "coin", coin);
  addItem(state, "exp", order.exp);

  // 限时订单交付
  const rushDone = !!state.orders.rush && state.orders.rush.id === orderId;
  if (rushDone) {
    const extra = Math.floor(base * (GAME_CONFIG.orders.rushMultiplier - 1));
    addItem(state, "coin", extra);
    state.orders.rush = null;
    state.orders.rushFinishedToday = todayKey();
    logEvent(state, "rush_complete");
  }

  // 连锁订单：同 type 连胜 +1，换了 type 就从头数
  if (state.orders.chainType === order.type) {
    state.orders.chainCount += 1;
  } else {
    state.orders.chainType = order.type;
    state.orders.chainCount = 1;
  }

  // 刷新订单
  state.orders.activeIds[orderIndex] = pickOrderId(state);

  // 记录事件
  logEvent(state, "order_complete");
  trackDaily(state, "order", 1);
  emit(Events.ORDER_COMPLETED, { orderId, orderIndex });

  const rushExtra = rushDone ? Math.floor(base * (GAME_CONFIG.orders.rushMultiplier - 1)) : 0;
  const totalCoin = coin + rushExtra;
  const bonusHint = totalCoin > order.coin ? `（加成 +${totalCoin - order.coin}）` : "";
  const rushHint = rushDone ? " ⚡限时订单达成，奖励翻倍！" : "";

  return {
    success: true,
    message: `完成订单获得${totalCoin}金币和${order.exp}经验${bonusHint}${rushHint}`,
    state
  };
}

/**
 * 刷新单个订单
 * @param {Object} state - 游戏状态
 * @param {number} orderIndex - 订单索引
 * @returns {Object} 结果 { success, message, state }
 */
export function refreshOrder(state, orderIndex) {
  state.orders.activeIds[orderIndex] = pickOrderId(state);

  logEvent(state, "order_refresh");
  emit(Events.ORDER_REFRESHED, { orderIndex });

  return { success: true, message: "订单已刷新", state };
}

/**
 * 确保订单槽位已填满
 * @param {Object} state - 游戏状态
 * @returns {Object} 更新后的状态
 */
export function ensureOrders(state) {
  while (state.orders.activeIds.length < 3) {
    state.orders.activeIds.push(pickOrderId(state));
  }
  return state;
}

/**
 * 选择一个订单ID（轮询机制）
 * @param {Object} state - 游戏状态
 * @returns {number} 订单ID
 */
export function pickOrderId(state) {
  // 当前季节的限定订单也进轮换池（奖励比普通单高一截）
  const seasonal = getSeasonalOrders();
  const pool = [...orders, ...seasonal];
  const availableOrders = pool.filter(o => o.unlockLevel <= state.wallet.level);

  if (availableOrders.length === 0) {
    return 2006; // 默认返回新手订单
  }

  const picked = availableOrders[state.orders.cursor % availableOrders.length];
  state.orders.cursor++;

  return picked.id;
}

/**
 * 检查订单是否可以完成
 * @param {Object} state - 游戏状态
 * @param {number} orderId - 订单ID
 * @returns {boolean} 是否可完成
 */
export function canCompleteOrder(state, orderId) {
  const order = getOrder(orderId);
  if (!order) return false;

  if (state.wallet.level < order.unlockLevel) return false;

  for (const req of order.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      return false;
    }
  }

  return true;
}

/**
 * 接下今日限时订单：随机挑一个玩家解锁的订单，限时 rushDurationSec 交付
 * @param {Object} state
 * @returns {Object} { success, message, state }
 */
export function acceptRushOrder(state) {
  if (state.wallet.level < GAME_CONFIG.orders.rushMinLevel) {
    return { success: false, message: `限时订单需要 Lv.${GAME_CONFIG.orders.rushMinLevel} 解锁` };
  }
  if (hasRushedToday(state)) {
    return { success: false, message: "今天的限时订单已经接过了，明天再来吧" };
  }
  if (state.orders.rush && !isRushExpired(state)) {
    return { success: false, message: "限时订单进行中，抓紧时间！" };
  }

  const available = orders.filter((o) => o.unlockLevel <= state.wallet.level);
  if (!available.length) {
    return { success: false, message: "暂时没有可用的订单" };
  }
  const picked = available[Math.floor(Math.random() * available.length)];

  state.orders.rush = {
    id: picked.id,
    expireAt: Date.now() + GAME_CONFIG.orders.rushDurationSec * 1000,
  };
  logEvent(state, "rush_accept");

  return {
    success: true,
    message: `⚡ 接下限时订单「${picked.name}」，${Math.floor(GAME_CONFIG.orders.rushDurationSec / 60)} 分钟内交付奖励翻倍！`,
    state,
  };
}

/**
 * 限时订单到期未交付：清掉进行中的限时单（当天不能再接）
 * 供时钟检查调用，幂等。
 * @param {Object} state
 * @returns {boolean} 本次调用是否刚发生过期
 */
export function settleExpiredRush(state) {
  if (!state.orders.rush || !isRushExpired(state)) return false;
  state.orders.rush = null;
  state.orders.rushFinishedToday = todayKey();
  logEvent(state, "rush_fail");
  emit(Events.RUSH_EXPIRED, {});
  return true;
}

/**
 * 预购明天的订单：花 reserveCost 金币锁定指定订单，
 * 明天进入游戏时它会出现在第一个刷新位
 * @param {Object} state
 * @param {number} orderId
 * @returns {Object} { success, message, state }
 */
export function reserveOrder(state, orderId) {
  const order = getOrder(orderId);
  if (!order) {
    return { success: false, message: "订单不存在" };
  }
  if (state.wallet.level < order.unlockLevel) {
    return { success: false, message: `需要Lv.${order.unlockLevel}` };
  }
  if (state.orders.reservedId) {
    return { success: false, message: "已经预购了明天的订单" };
  }
  const cost = GAME_CONFIG.orders.reserveCost;
  if (!hasEnough(state, "coin", cost)) {
    return { success: false, message: `预购需要🪙${cost}` };
  }

  spendItem(state, "coin", cost);
  state.orders.reservedId = orderId;
  state.orders.reservedPaidAt = todayKey();
  logEvent(state, "order_reserve");

  return {
    success: true,
    message: `已预购「${order.name}」，明天上线它会出现在订单列表里`,
    state,
  };
}

/**
 * 每日结算预购：昨天付过钱的预购单今天兑现到第一个槽位（一次性）
 * 由 storage 的 rollDailyState 或启动流程调用。
 * @param {Object} state
 * @returns {boolean} 是否兑现了预购
 */
export function settleReservedOrder(state) {
  if (!state.orders.reservedId) return false;
  if (state.orders.reservedPaidAt === todayKey()) return false; // 还没跨天

  const order = getOrder(state.orders.reservedId);
  state.orders.reservedId = null;
  state.orders.reservedPaidAt = "";

  if (!order) return false;

  // 昨天的预购今天兑现：放进第一个槽位，把原来的顶掉
  state.orders.activeIds[0] = order.id;
  emit(Events.ORDER_RESERVED_DELIVERED, { orderId: order.id });
  logEvent(state, "order_reserve_deliver");
  return true;
}
