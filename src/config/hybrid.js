// 杂交配置
//
// 两种基础作物 + 金币/时间 → 一包新种子（seed_<id> 进背包，
// 种植时消耗种子而不是买种）。杂交作物不能再次杂交（保持图谱有限），
// 每个配方解锁后永久记录进 state.hybrid.discovered。
//
// seedPrice 在杂交体系里是「补种价」：收获后还想再种，可以去种子铺
// 用补种价买（比杂交便宜但不稳定），或者重新杂交白拿一包。
export const hybridRecipes = [
  {
    id: 1201,
    name: "蜜糖番茄",
    icon: "🍯",
    unlockLevel: 4,
    requires: [{ item: "crop_1001", count: 3 }, { item: "crop_1002", count: 3 }], // 小麦 + 番茄
    coin: 80,
    growTime: 180,
    harvestCount: 2,
    sellPrice: 28,
    seedPrice: 12,
  },
  {
    id: 1202,
    name: "奶油草莓",
    icon: "🍨",
    unlockLevel: 6,
    requires: [{ item: "crop_1003", count: 3 }, { item: "crop_1006", count: 3 }], // 草莓 + 稻米
    coin: 150,
    growTime: 360,
    harvestCount: 2,
    sellPrice: 45,
    seedPrice: 22,
  },
  {
    id: 1203,
    name: "黄金玉米",
    icon: "🌽",
    unlockLevel: 8,
    requires: [{ item: "crop_1004", count: 2 }, { item: "crop_1005", count: 1 }], // 玉米 + 南瓜
    coin: 300,
    growTime: 900,
    harvestCount: 3,
    sellPrice: 110,
    seedPrice: 60,
  },
  {
    id: 1204,
    name: "星彩葡萄",
    icon: "🌠",
    unlockLevel: 12,
    requires: [{ item: "crop_1010", count: 2 }, { item: "crop_1009", count: 1 }], // 葡萄 + 向日葵
    coin: 600,
    growTime: 3600,
    harvestCount: 2,
    sellPrice: 240,
    seedPrice: 130,
  },
];

export function getHybridRecipe(id) {
  return hybridRecipes.find((r) => r.id === id);
}
