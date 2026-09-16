// 作物配置
// 作物配置
export const crops = [
  { id: 1001, name: "小麦", icon: "🌾", unlockLevel: 1, growTime: 30, seedPrice: 2, harvestCount: 2, sellPrice: 2 },
  { id: 1002, name: "番茄", icon: "🍅", unlockLevel: 2, growTime: 120, seedPrice: 5, harvestCount: 2, sellPrice: 6 },
  { id: 1003, name: "草莓", icon: "🍓", unlockLevel: 4, growTime: 300, seedPrice: 10, harvestCount: 2, sellPrice: 12 },
  { id: 1004, name: "玉米", icon: "🌽", unlockLevel: 6, growTime: 600, seedPrice: 18, harvestCount: 2, sellPrice: 22 },
  { id: 1005, name: "南瓜", icon: "🎃", unlockLevel: 8, growTime: 1800, seedPrice: 40, harvestCount: 2, sellPrice: 50 },
  // 新增作物 - 丰富游戏内容
  { id: 1006, name: "稻米", icon: "🌾", unlockLevel: 3, growTime: 45, seedPrice: 3, harvestCount: 3, sellPrice: 3 },
  { id: 1007, name: "马铃薯", icon: "🥔", unlockLevel: 5, growTime: 240, seedPrice: 8, harvestCount: 2, sellPrice: 8 },
  { id: 1008, name: "郁金香", icon: "🌷", unlockLevel: 7, growTime: 420, seedPrice: 15, harvestCount: 1, sellPrice: 18 },
  { id: 1009, name: "小麦面包", icon: "🍞", unlockLevel: 10, growTime: 0, seedPrice: 0, harvestCount: 5, sellPrice: 15 },
  { id: 1010, name: "南瓜派", icon: "🎃", unlockLevel: 12, growTime: 0, seedPrice: 0, harvestCount: 3, sellPrice: 25 },
];

// 作物查询辅助函数
export function getCrop(id) {
  return crops.find((c) => c.id === id);
}
