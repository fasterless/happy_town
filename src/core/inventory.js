// 库存和货币系统核心模块
import { getLevelFromExp } from '../config/levels.js';
import { logEvent } from '../utils/analytics.js';

/**
 * 获取物品数量
 * @param {Object} state - 游戏状态
 * @param {string} key - 物品键名
 * @returns {number} 物品数量
 */
export function getCount(state, key) {
  if (key === "coin" || key === "diamond" || key === "friendPoint" || key === "communityContribution") {
    return state.wallet[key] || 0;
  }
  return state.inventory[key] || 0;
}

/**
 * 添加物品
 * @param {Object} state - 游戏状态
 * @param {string} key - 物品键名
 * @param {number} count - 数量
 * @returns {Object} 更新后的状态
 */
export function addItem(state, key, count = 1) {
  if (key === "coin" || key === "diamond" || key === "friendPoint" || key === "communityContribution") {
    state.wallet[key] = (state.wallet[key] || 0) + count;
  } else if (key === "exp") {
    const oldLevel = state.wallet.level;
    state.wallet.exp = (state.wallet.exp || 0) + count;
    state.wallet.level = getLevelFromExp(state.wallet.exp);

    // 检查是否升级
    if (state.wallet.level > oldLevel) {
      logEvent(state, "level_up");
    }
  } else {
    state.inventory[key] = (state.inventory[key] || 0) + count;
  }
  return state;
}

/**
 * 扣除物品
 * @param {Object} state - 游戏状态
 * @param {string} key - 物品键名
 * @param {number} count - 数量
 * @returns {Object} 更新后的状态
 */
export function spendItem(state, key, count = 1) {
  if (key === "coin" || key === "diamond" || key === "friendPoint" || key === "communityContribution") {
    state.wallet[key] = Math.max(0, (state.wallet[key] || 0) - count);
  } else {
    state.inventory[key] = Math.max(0, (state.inventory[key] || 0) - count);
  }
  return state;
}

/**
 * 检查是否有足够的物品
 * @param {Object} state - 游戏状态
 * @param {string} key - 物品键名
 * @param {number} count - 需要数量
 * @returns {boolean} 是否足够
 */
export function hasEnough(state, key, count = 1) {
  return getCount(state, key) >= count;
}

/**
 * 批量添加奖励
 * @param {Object} state - 游戏状态
 * @param {Object} rewards - 奖励对象
 * @returns {Object} 更新后的状态
 */
export function addRewards(state, rewards) {
  for (const [key, value] of Object.entries(rewards)) {
    addItem(state, key, value);
  }
  return state;
}

/**
 * 检查是否能够支付价格
 * @param {Object} state - 游戏状态
 * @param {string} priceType - 价格类型
 * @param {number} price - 价格
 * @returns {boolean} 是否能支付
 */
export function canAfford(state, priceType, price) {
  if (priceType === "coin") return state.wallet.coin >= price;
  if (priceType === "diamond") return state.wallet.diamond >= price;
  if (priceType === "rmb") return true; // 模拟充值，始终返回true
  return false;
}

/**
 * 支付价格
 * @param {Object} state - 游戏状态
 * @param {string} priceType - 价格类型
 * @param {number} price - 价格
 * @returns {Object} 更新后的状态
 */
export function spendPrice(state, priceType, price) {
  if (priceType === "coin") {
    state.wallet.coin -= price;
  } else if (priceType === "diamond") {
    state.wallet.diamond -= price;
  }
  // rmb 类型不扣除（模拟充值）
  return state;
}

/**
 * 获取背包物品列表
 * @param {Object} state - 游戏状态
 * @param {number} limit - 限制数量
 * @returns {Array} 物品列表
 */
export function getInventoryItems(state, limit = 12) {
  const items = [];

  // 优先显示材料
  if (state.inventory.wood) items.push({ key: "wood", count: state.inventory.wood });
  if (state.inventory.stone) items.push({ key: "stone", count: state.inventory.stone });
  if (state.inventory.cloth) items.push({ key: "cloth", count: state.inventory.cloth });

  // 然后是作物和家具
  for (const [key, count] of Object.entries(state.inventory)) {
    if (count > 0 && !["wood", "stone", "cloth"].includes(key)) {
      items.push({ key, count });
    }
  }

  return items.slice(0, limit);
}
