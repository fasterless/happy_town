// 温室大棚配置（第七轮 2/3）
//
// 温室是农场旁边的高级地块：玻璃房里恒温恒湿，所以
//   1. 不受天气影响（雨天加速、阴天减速都进不来）；
//   2. 任何季节的限定作物全年都能种，不用等活动月份。
// 代价是每块地一天只能种一次——温室小，一天一轮，种什么要挑。
//
// 温室作物用独立的 id 段（1300），和普通作物、季节作物、杂交作物互不冲突。

// 温室解锁等级
export const GREENHOUSE_MIN_LEVEL = 9;

// 温室地块数量
export const GREENHOUSE_PLOTS = 6;

// 温室专属作物：生长偏慢、售价偏高，配合「一天一轮」给一个值得等的收成
export const greenhouseCrops = [
  { id: 1301, name: "温室草莓", icon: "🍓", unlockLevel: 9, growTime: 900, harvestCount: 3, sellPrice: 30 },
  { id: 1302, name: "温室番茄", icon: "🍅", unlockLevel: 9, growTime: 1200, harvestCount: 4, sellPrice: 22 },
  { id: 1303, name: "温室葡萄", icon: "🍇", unlockLevel: 11, growTime: 2400, harvestCount: 3, sellPrice: 70 },
  { id: 1304, name: "温室向日葵", icon: "🌻", unlockLevel: 12, growTime: 1800, harvestCount: 2, sellPrice: 55 },
  { id: 1305, name: "温室南瓜", icon: "🎃", unlockLevel: 14, growTime: 3600, harvestCount: 2, sellPrice: 120 },
  { id: 1306, name: "温室郁金香", icon: "🌷", unlockLevel: 16, growTime: 2700, harvestCount: 2, sellPrice: 90 },
];

/** 取一株温室作物的配置 */
export function getGreenhouseCrop(id) {
  return greenhouseCrops.find((crop) => crop.id === id);
}

/** 是否温室专属作物（1300 段 id） */
export function isGreenhouseCrop(cropId) {
  return greenhouseCrops.some((crop) => crop.id === cropId);
}
