// 作物配置
export const crops = [
  { id: 1001, name: "小麦", icon: "🌾", unlockLevel: 1, growTime: 30, seedPrice: 2, harvestCount: 2, sellPrice: 2 },
  { id: 1002, name: "番茄", icon: "🍅", unlockLevel: 2, growTime: 120, seedPrice: 5, harvestCount: 2, sellPrice: 6 },
  { id: 1003, name: "草莓", icon: "🍓", unlockLevel: 4, growTime: 300, seedPrice: 10, harvestCount: 2, sellPrice: 12 },
  { id: 1004, name: "玉米", icon: "🌽", unlockLevel: 6, growTime: 600, seedPrice: 18, harvestCount: 2, sellPrice: 22 },
  { id: 1005, name: "南瓜", icon: "🎃", unlockLevel: 8, growTime: 1800, seedPrice: 40, harvestCount: 2, sellPrice: 50 },
];

// 作物查询辅助函数
export function getCrop(id) {
  return crops.find((c) => c.id === id);
}
