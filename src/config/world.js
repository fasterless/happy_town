// 像素小镇专属配置
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

// 南边果园里的果树：每棵每天可摘一次，果子卖钱或交公告栏。
// 位置登记在 src/world/map.js 的 ORCHARD_TREES，这里只放果子的数值。
export const orchardFruits = {
  apple: { name: '苹果', icon: '🍎', sellPrice: 18, count: 2 },
  pear: { name: '梨子', icon: '🍐', sellPrice: 20, count: 2 },
  orange: { name: '橙子', icon: '🍊', sellPrice: 22, count: 2 },
  peach: { name: '桃子', icon: '🍑', sellPrice: 26, count: 1 },
  cherry: { name: '樱桃', icon: '🍒', sellPrice: 30, count: 3 },
};

// 公告栏每天固定一张委托，刷新页面也不会改变当天的目标。
export const boardRequests = [
  { id: 'berry-basket', name: '野莓果篮', icon: '🧺', item: 'forage_berry', count: 3, reward: 90, text: '给咖啡馆送一篮新鲜野莓' },
  { id: 'herb-tea', name: '林间茶包', icon: '🍵', item: 'forage_herb', count: 4, reward: 105, text: '为花店准备几包清香香草' },
  { id: 'mushroom-supper', name: '蘑菇晚餐', icon: '🍄', item: 'forage_mushroom', count: 2, reward: 125, text: '帮料理铺找来林地蘑菇' },
  { id: 'lake-supply', name: '湖畔补给', icon: '🎣', item: 'fish_1', count: 3, reward: 95, text: '给湖边老周准备小鲫鱼' },
  { id: 'farm-basket', name: '农夫篮子', icon: '🌾', item: 'crop_1001', count: 5, reward: 85, text: '为南边农田的邻居送去小麦' },
  { id: 'mine-supplies', name: '矿工补给', icon: '⛏️', item: 'ore_copper', count: 3, reward: 115, text: '给后山矿工送去铜矿' },
  { id: 'fruit-basket', name: '鲜果拼盘', icon: '🍎', item: 'fruit_apple', count: 3, reward: 110, text: '给咖啡馆送一篮新鲜苹果' },
];
