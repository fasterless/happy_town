// 加工坊配方配置
//
// 作物 -> 成品的加工流水线，成品的库存键是 `goods_<id>`，
// 高等级订单会需要这些成品，让后期金币有去处。
export const craftingRecipes = [
  {
    id: 5001,
    name: "小麦面包",
    icon: "🍞",
    unlockLevel: 4,
    time: 300, // 加工秒数
    requires: [{ item: "crop_1001", count: 4 }],
    result: { key: "goods_5001", count: 1 },
  },
  {
    id: 5002,
    name: "番茄酱",
    icon: "🥫",
    unlockLevel: 6,
    time: 600,
    requires: [{ item: "crop_1002", count: 3 }],
    result: { key: "goods_5002", count: 1 },
  },
  {
    id: 5003,
    name: "草莓果酱",
    icon: "🍯",
    unlockLevel: 8,
    time: 900,
    requires: [{ item: "crop_1003", count: 3 }],
    result: { key: "goods_5003", count: 1 },
  },
  {
    id: 5004,
    name: "香浓薯条",
    icon: "🍟",
    unlockLevel: 10,
    time: 1200,
    requires: [{ item: "crop_1007", count: 4 }],
    result: { key: "goods_5004", count: 1 },
  },
  {
    id: 5005,
    name: "南瓜派",
    icon: "🥧",
    unlockLevel: 12,
    time: 1800,
    requires: [{ item: "crop_1005", count: 2 }, { item: "goods_5001", count: 1 }],
    result: { key: "goods_5005", count: 1 },
  },
  {
    id: 5006,
    name: "向日葵花束",
    icon: "💐",
    unlockLevel: 14,
    time: 1500,
    requires: [{ item: "crop_1009", count: 2 }, { item: "crop_1008", count: 1 }],
    result: { key: "goods_5006", count: 1 },
  },
  {
    id: 5007,
    name: "手工奶酪",
    icon: "🧀",
    unlockLevel: 6,
    time: 720,
    requires: [{ item: "milk", count: 1 }, { item: "crop_1001", count: 2 }],
    result: { key: "goods_5007", count: 1 },
  },
  {
    id: 5008,
    name: "羊毛毯",
    icon: "🛏️",
    unlockLevel: 8,
    time: 1080,
    requires: [{ item: "wool", count: 2 }, { item: "cloth", count: 1 }],
    result: { key: "goods_5008", count: 1 },
  },
];

// 配方查询辅助函数
export function getRecipe(id) {
  return craftingRecipes.find((r) => r.id === id);
}
