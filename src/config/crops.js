// 作物配置
// 全部是可种植、可收获的真实作物；面包/南瓜派等成品移到了加工坊（config/crafting.js）。
export const crops = [
  { id: 1001, name: "小麦", icon: "🌾", unlockLevel: 1, growTime: 30, seedPrice: 2, harvestCount: 2, sellPrice: 2 },
  { id: 1002, name: "番茄", icon: "🍅", unlockLevel: 2, growTime: 120, seedPrice: 5, harvestCount: 2, sellPrice: 6 },
  { id: 1006, name: "稻米", icon: "🌾", unlockLevel: 3, growTime: 45, seedPrice: 3, harvestCount: 3, sellPrice: 3 },
  { id: 1003, name: "草莓", icon: "🍓", unlockLevel: 4, growTime: 300, seedPrice: 10, harvestCount: 2, sellPrice: 12 },
  { id: 1007, name: "马铃薯", icon: "🥔", unlockLevel: 5, growTime: 240, seedPrice: 8, harvestCount: 2, sellPrice: 8 },
  { id: 1004, name: "玉米", icon: "🌽", unlockLevel: 6, growTime: 600, seedPrice: 18, harvestCount: 2, sellPrice: 22 },
  { id: 1008, name: "郁金香", icon: "🌷", unlockLevel: 7, growTime: 420, seedPrice: 15, harvestCount: 1, sellPrice: 18 },
  { id: 1005, name: "南瓜", icon: "🎃", unlockLevel: 8, growTime: 1800, seedPrice: 40, harvestCount: 2, sellPrice: 50 },
  { id: 1009, name: "向日葵", icon: "🌻", unlockLevel: 9, growTime: 2700, seedPrice: 55, harvestCount: 2, sellPrice: 65 },
  { id: 1010, name: "葡萄", icon: "🍇", unlockLevel: 11, growTime: 4200, seedPrice: 75, harvestCount: 2, sellPrice: 95 },
];

// 作物查询辅助函数
export function getCrop(id) {
  return crops.find((c) => c.id === id);
}
