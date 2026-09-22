// 料理配置
//
// 料理铺是加工坊的下游：用作物 + 加工成品 + 牧场/钓场产出拼成一道菜，
// 做出来的菜放背包里（库存键 dish_<id>），什么时候「上菜」由玩家自己决定。
// 这是它与加工坊最大的区别：加工坊是产能，料理铺是决策 ——
// 玩家要在「这单订单值不值得吃块蛋糕加成」上做选择。
//
// buff 字段是一段有时效的增益，systems/dishes.js 负责结算到 state.buff。
// value 是这份料理的基准价值（供委托榜算报酬），由 itemValue 统一算出。
import { itemValue } from './itemValue.js';

export const dishes = [
  {
    id: 7001,
    name: "田园沙拉",
    icon: "🥗",
    unlockLevel: 6,
    requires: [{ item: "crop_1002", count: 3 }, { item: "crop_1006", count: 2 }],
    buff: { type: "growthSpeed", value: 1.2, durationSec: 1800 },
    desc: "30 分钟内作物生长加速 20%",
  },
  {
    id: 7002,
    name: "草莓奶油蛋糕",
    icon: "🍰",
    unlockLevel: 8,
    requires: [{ item: "crop_1003", count: 3 }, { item: "goods_5007", count: 1 }],
    buff: { type: "orderBonus", value: 1.25, durationSec: 1800 },
    desc: "30 分钟内订单金币 +25%",
  },
  {
    id: 7003,
    name: "香酥拼盘",
    icon: "🍟",
    unlockLevel: 10,
    requires: [{ item: "goods_5004", count: 1 }, { item: "goods_5002", count: 1 }],
    buff: { type: "craftSpeed", value: 0.7, durationSec: 3600 },
    desc: "1 小时内加工时间 -30%",
  },
  {
    id: 7004,
    name: "海鲜浓汤",
    icon: "🍲",
    unlockLevel: 12,
    requires: [{ item: "fish_2", count: 2 }, { item: "fish_3", count: 1 }, { item: "goods_5007", count: 1 }],
    buff: { type: "fishingLuck", value: 2, durationSec: 1800 },
    desc: "30 分钟内稀有鱼权重翻倍",
  },
  {
    id: 7005,
    name: "蜂蜜松饼",
    icon: "🥞",
    unlockLevel: 9,
    requires: [{ item: "goods_5001", count: 2 }, { item: "goods_5003", count: 1 }],
    buff: { type: "sellBonus", value: 1.2, durationSec: 1800 },
    desc: "30 分钟内卖出作物单价 +20%",
  },
  {
    id: 7006,
    name: "邻里下午茶",
    icon: "🫖",
    unlockLevel: 11,
    requires: [{ item: "crop_1008", count: 2 }, { item: "goods_5007", count: 1 }, { item: "milk", count: 1 }],
    buff: { type: "friendPointBonus", value: 1.5, durationSec: 1800 },
    desc: "30 分钟内友情点 +50%",
  },
  {
    id: 7007,
    name: "丰收盛宴",
    icon: "🍛",
    unlockLevel: 14,
    requires: [{ item: "crop_1005", count: 2 }, { item: "crop_1004", count: 2 }, { item: "goods_5007", count: 1 }],
    buff: { type: "harvestBonus", value: 1.5, durationSec: 1800 },
    desc: "30 分钟内收获产量 +50%",
  },
  {
    id: 7008,
    name: "金穗珍馐",
    icon: "🍾",
    unlockLevel: 16,
    requires: [{ item: "gold_1001", count: 1 }, { item: "goods_5005", count: 1 }, { item: "crop_1010", count: 2 }],
    buff: { type: "goldChance", value: 3, durationSec: 1800 },
    desc: "30 分钟内金穗变异概率 ×3",
  },
  {
    id: 7009,
    name: "学问蘑菇汤",
    icon: "🍄",
    unlockLevel: 13,
    requires: [{ item: "crop_1007", count: 3 }, { item: "crop_1006", count: 2 }, { item: "milk", count: 1 }],
    buff: { type: "expBonus", value: 1.4, durationSec: 1800 },
    desc: "30 分钟内获得经验 +40%",
  },
];

dishes.forEach((dish) => {
  dish.value = dish.requires.reduce(
    (sum, req) => sum + itemValue(req.item) * req.count,
    0
  );
});

// 料理查询辅助函数
export function getDish(id) {
  return dishes.find((d) => d.id === id);
}

/** 某道料理当前能做几份（按最缺的原料算） */
export function getDishAffordableCount(state, dish) {
  let min = Infinity;
  for (const req of dish.requires) {
    const owned = req.item === 'coin' || req.item === 'diamond'
      ? state.wallet[req.item] || 0
      : state.inventory[req.item] || 0;
    min = Math.min(min, Math.floor(owned / req.count));
  }
  return min === Infinity ? 0 : min;
}
