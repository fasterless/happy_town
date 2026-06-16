// 商城系统模块
import { shopGoods } from '../config/shop.js';
import { canAfford, spendPrice, addRewards } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';

/**
 * 购买商品
 * @param {Object} state - 游戏状态
 * @param {number} goodsId - 商品ID
 * @returns {Object} 结果 { success, message, state }
 */
export function buyGoods(state, goodsId) {
  const goods = shopGoods.find(g => g.id === goodsId);
  if (!goods) {
    return { success: false, message: "商品不存在" };
  }

  // 检查货币
  if (!canAfford(state, goods.priceType, goods.price)) {
    const currency = goods.priceType === "coin" ? "金币" : goods.priceType === "diamond" ? "钻石" : "人民币";
    return { success: false, message: `${currency}不足` };
  }

  // 扣除货币
  spendPrice(state, goods.priceType, goods.price);

  // 发放奖励
  addRewards(state, goods.rewards);

  // 如果是月卡，激活月卡
  if (goods.monthlyCard) {
    state.shop.monthlyCard = true;
    state.shop.monthlyCardExpireDate = getMonthlyCardExpireDate();
  }

  // 记录购买
  if (!state.shop.boughtGoods[goodsId]) {
    state.shop.boughtGoods[goodsId] = 0;
  }
  state.shop.boughtGoods[goodsId]++;

  logEvent(state, "shop_buy");

  return { success: true, message: `购买了${goods.name}`, state };
}

/**
 * 领取月卡每日奖励
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, message, state }
 */
export function claimMonthlyCard(state) {
  if (!state.shop.monthlyCard) {
    return { success: false, message: "尚未购买月卡" };
  }

  // 检查今天是否已领取
  if (state.shop.monthlyClaimedDate === todayKey()) {
    return { success: false, message: "今天已经领取过了" };
  }

  // 发放每日奖励
  addRewards(state, { diamond: 60, coin: 500 });
  state.shop.monthlyClaimedDate = todayKey();

  return { success: true, message: "领取了月卡奖励：60钻石 + 500金币", state };
}

/**
 * 检查月卡是否已过期
 * @param {Object} state - 游戏状态
 * @returns {boolean} 是否过期
 */
export function isMonthlyCardExpired(state) {
  if (!state.shop.monthlyCard) return true;
  if (!state.shop.monthlyCardExpireDate) return false; // 旧版本兼容

  const expireDate = new Date(state.shop.monthlyCardExpireDate);
  const now = new Date();
  return now > expireDate;
}

/**
 * 获取月卡到期日期（购买后30天）
 * @returns {string} ISO日期字符串
 */
function getMonthlyCardExpireDate() {
  const now = new Date();
  now.setDate(now.getDate() + 30);
  return now.toISOString();
}

/**
 * 检查今天是否可以领取月卡
 * @param {Object} state - 游戏状态
 * @returns {boolean} 是否可领取
 */
export function canClaimMonthlyCard(state) {
  if (!state.shop.monthlyCard) return false;
  if (isMonthlyCardExpired(state)) return false;
  return state.shop.monthlyClaimedDate !== todayKey();
}
