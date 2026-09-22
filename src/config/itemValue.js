// 物品基准价值表
//
// 游戏里有三处需要知道「一件东西大概值多少」：
//   1. 料理铺：按原料价值算一份料理的基准价值
//   2. 小镇委托榜：按需求物品的价值算委托报酬
//   3. 界面：给委托单标注「这单划不划算」
//
// 这些价值以前散落在各处（卖价、配方、收购价各一套），这里统一成一份表。
// 加工成品没有卖价，价值按它的原料递归算出来（带环保护，防止配置写错时死循环）。
import { getCrop } from './crops.js';
import { craftingRecipes } from './crafting.js';

// 基础材料 / 非配方产出物的价值
const RAW_VALUES = {
  wood: 1,
  stone: 1,
  cloth: 2,
  egg: 6,
  wool: 12,
  milk: 15,
  speed_ticket: 8,
  lottery_ticket: 12,
};

// 递归计算时的防环标记
const RESOLVING = new Set();

/**
 * 查询一件物品的基准价值
 * @param {string} key - 物品键名（crop_<id> / gold_<id> / goods_<id> / wood …）
 * @returns {number} 价值，未知物品返回 1（不阻断调用方）
 */
export function itemValue(key) {
  if (RAW_VALUES[key]) return RAW_VALUES[key];

  // 作物按卖价，金穗作物按 3 倍卖价
  const cropMatch = /^(crop|gold)_(\d+)$/.exec(key || '');
  if (cropMatch) {
    const crop = getCrop(Number(cropMatch[2]));
    if (crop) return cropMatch[1] === 'gold' ? crop.sellPrice * 3 : crop.sellPrice;
  }

  // 加工成品：原料价值之和（配方之间可能互相引用，如南瓜派要用面包）
  if (/^goods_\d+$/.test(key || '')) {
    const recipe = craftingRecipes.find((r) => r.result.key === key);
    if (recipe) {
      if (RESOLVING.has(key)) return 1; // 环保护
      RESOLVING.add(key);
      const value = recipe.requires.reduce(
        (sum, req) => sum + itemValue(req.item) * req.count,
        0
      );
      RESOLVING.delete(key);
      return value || 1;
    }
  }

  return 1;
}

/**
 * 一批需求物品的总价值（供委托报酬计算）
 * @param {Array<{item: string, count: number}>} requires
 * @returns {number}
 */
export function requiresValue(requires) {
  return (requires || []).reduce(
    (sum, req) => sum + itemValue(req.item) * req.count,
    0
  );
}
