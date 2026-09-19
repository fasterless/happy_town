// 小镇集市
//
// 卖仓之外的进阶出货口：NPC 买家每天对每种作物有不同「需求热度」，
// 热度高收购价上浮（最高 +60%），但今天同种作物挂得越多供给压价越狠。
// 想卖高价就要挑「热但没人抢」的作物挂 —— 给囤货玩家一个每日决策点。
//
// 价格公式：单价 = sellPrice × (0.7 + 热度/100 × 0.9) × 供给折扣
//   热度 100 → 上限 1.6 倍；热度 0 → 保底 0.7 倍
//   供给折扣 = max(0.4, 1 - 今日已挂数 × 0.06)：挂 10 份以上就只剩 0.4 倍
import { crops, getCrop } from '../config/crops.js';
import { getCount, addItem, spendItem } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';
import { emit, Events } from '../core/events.js';

// 每天为每种作物随机生成 0-100 的需求热度
// （用日期键 + 作物 id 做种子，同一天内数值稳定，重进游戏不跳）
function rollDailyDemand(state) {
  const today = todayKey();
  if (state.market.date === today) return;

  state.market.date = today;
  state.market.listedToday = {};

  const demand = {};
  crops.forEach((crop) => {
    let hash = 0;
    const seed = `${today}|${crop.id}`;
    for (const ch of seed) {
      hash = (hash * 31 + ch.charCodeAt(0)) | 0;
    }
    demand[crop.id] = Math.abs(hash) % 101;
  });
  state.market.demand = demand;
}

/**
 * 获取某种作物的当前需求热度（0-100），当日稳定
 */
export function getDemand(state, cropId) {
  rollDailyDemand(state);
  return state.market.demand[cropId] ?? 50;
}

/**
 * 计算某种作物当前的挂售单价（含热度上浮和供给压价）
 * @param {Object} state
 * @param {number} cropId
 * @returns {number} 单个作物的收购价
 */
export function getMarketPrice(state, cropId) {
  const crop = getCrop(cropId);
  if (!crop) return 0;

  rollDailyDemand(state);
  const demand = getDemand(state, cropId);
  const listed = state.market.listedToday[cropId] || 0;
  const supplyPenalty = Math.max(0.4, 1 - listed * 0.06);

  return Math.max(1, Math.round(crop.sellPrice * (0.7 + (demand / 100) * 0.9) * supplyPenalty));
}

/**
 * 挂售：把背包里的作物卖给当前需求最高的 NPC 买家
 * @param {Object} state
 * @param {number} cropId
 * @param {number} [count] - 挂售数量，缺省为全部
 * @returns {Object} { success, message, state }
 */
export function sellOnMarket(state, cropId, count) {
  const crop = getCrop(cropId);
  if (!crop) {
    return { success: false, message: "作物不存在" };
  }

  const itemKey = `crop_${cropId}`;
  const owned = getCount(state, itemKey);
  if (owned < 1) {
    return { success: false, message: "背包里没有这种作物" };
  }

  const amount = Math.min(owned, Math.max(1, Math.floor(count ?? owned)));
  const unitPrice = getMarketPrice(state, cropId);

  spendItem(state, itemKey, amount);
  addItem(state, "coin", unitPrice * amount);
  state.market.listedToday[cropId] = (state.market.listedToday[cropId] || 0) + amount;

  logEvent(state, "market_sell");
  emit(Events.MARKET_SOLD, { cropId, amount, unitPrice });

  const demand = getDemand(state, cropId);
  const mood = demand >= 75 ? "镇上抢着要" : demand >= 40 ? "行情平稳" : "今天不太想要这个";

  return {
    success: true,
    message: `挂售${amount}个${crop.icon}${crop.name}，单价🪙${unitPrice}（${mood}），共得🪙${unitPrice * amount}`,
    state,
  };
}

/**
 * 集市行情面板数据：按「当前单价 / 基准价」倍率降序
 * @param {Object} state
 * @returns {Array} [{ crop, demand, unitPrice, ratio, owned }]
 */
export function getMarketBoard(state) {
  rollDailyDemand(state);
  return crops
    .map((crop) => {
      const unitPrice = getMarketPrice(state, crop.id);
      return {
        crop,
        demand: state.market.demand[crop.id] ?? 50,
        unitPrice,
        ratio: crop.sellPrice ? unitPrice / crop.sellPrice : 1,
        owned: getCount(state, `crop_${crop.id}`),
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}
