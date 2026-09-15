// 订单系统模块
import { orders, getOrder } from '../config/orders.js';
import { getCrop } from '../config/crops.js';
import { addItem, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { applyWeatherToReward } from './weather.js';
import { applyPetToOrderReward } from './pets.js';

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

  // 发放奖励（天气 + 宠物加成作用于金币）
  const coin = getOrderCoinReward(state, order);
  addItem(state, "coin", coin);
  addItem(state, "exp", order.exp);

  // 刷新订单
  state.orders.activeIds[orderIndex] = pickOrderId(state);

  // 记录事件
  logEvent(state, "order_complete");
  trackDaily(state, "order", 1);
  emit(Events.ORDER_COMPLETED, { orderId, orderIndex });

  const bonusHint = coin > order.coin ? `（加成 +${coin - order.coin}）` : "";

  return {
    success: true,
    message: `完成订单获得${coin}金币和${order.exp}经验${bonusHint}`,
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
  const availableOrders = orders.filter(o => o.unlockLevel <= state.wallet.level);

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
