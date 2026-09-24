// 2.5D 小镇专属配置
//
// 这里的资源不会污染主游戏的存档与物品表，只服务像素小镇自己的
// 探索循环：走到地图边角采集，再把成果交给公告栏或货摊。

export const FORAGE_LIMIT_PER_DAY = 3;

export const forageLoot = [
  { key: 'forage_berry', name: '野莓', icon: '🫐', weight: 38, min: 1, max: 2, sellPrice: 14 },
  { key: 'forage_herb', name: '香草', icon: '🌿', weight: 30, min: 1, max: 2, sellPrice: 11 },
  { key: 'forage_mushroom', name: '林地蘑菇', icon: '🍄', weight: 20, min: 1, max: 1, sellPrice: 26 },
  { key: 'forage_wood', name: '干燥木材', icon: '🪵', weight: 12, min: 1, max: 2, sellPrice: 8 },
];

// 公告栏每天固定一张委托，刷新页面也不会改变当天的目标。
export const boardRequests = [
  { id: 'berry-basket', name: '野莓果篮', icon: '🧺', item: 'forage_berry', count: 3, reward: 90, text: '给咖啡馆送一篮新鲜野莓' },
  { id: 'herb-tea', name: '林间茶包', icon: '🍵', item: 'forage_herb', count: 4, reward: 105, text: '为花店准备几包清香香草' },
  { id: 'mushroom-supper', name: '蘑菇晚餐', icon: '🍄', item: 'forage_mushroom', count: 2, reward: 125, text: '帮料理铺找来林地蘑菇' },
  { id: 'lake-supply', name: '湖畔补给', icon: '🎣', item: 'fish_1', count: 3, reward: 95, text: '给湖边老周准备小鲫鱼' },
  { id: 'farm-basket', name: '农夫篮子', icon: '🌾', item: 'crop_1001', count: 5, reward: 85, text: '为南边农田的邻居送去小麦' },
  { id: 'mine-supplies', name: '矿工补给', icon: '⛏️', item: 'ore_copper', count: 3, reward: 115, text: '给后山矿工送去铜矿' },
];
