// 后山矿洞配置
//
// 矿洞是一条和「湖畔钓鱼」并列的日常玩法，但多了一条自成体系的成长线：
//   下矿（消耗体力）→ 挖到矿石/宝石/碎金 → 升级镐子 → 解锁更深的矿层与更好的掉落。
// 矿石/宝石都是「裸键」道具（像 egg/wool/milk 一样直接存 inventory），
// 显示名与图标登记在 utils/format.js 的 BASIC_LABELS / BASIC_ICONS 里。

// 矿洞解锁等级（玉米档之后，材料需求开始变大，正好给一条稳定的材料来源）
export const MINE_MIN_LEVEL = 8;

// 免费体力用完后，每多挖一次的金币成本（对应钓鱼的“买鱼饵”）
export const EXTRA_DIG_COST = 8;

// 矿石 / 宝石的卖价（sellOre 用）。裸键与卖价一一对应。
export const oreValues = {
  ore_copper: 12,
  ore_iron: 28,
  ore_silver: 60,
  gem_topaz: 120,
  gem_amethyst: 240,
  gem_emerald: 480,
  gem_crystal: 1000,
};

// 矿洞收藏册的展示顺序（矿石在前、宝石在后，深层在后）
export const mineTrove = [
  'ore_copper',
  'ore_iron',
  'ore_silver',
  'gem_topaz',
  'gem_amethyst',
  'gem_emerald',
  'gem_crystal',
];

// 镐子成长线：level 决定每日体力上限与可挖到的矿层深度（minPick）。
// upgrade 是从上一级升到本级需要的材料（首级无需升级）。
export const pickaxes = [
  { level: 1, name: '木镐', icon: '🪵', maxStamina: 10, upgrade: null },
  { level: 2, name: '石镐', icon: '⛏️', maxStamina: 12, upgrade: { coin: 500, ore_copper: 15 } },
  { level: 3, name: '铜镐', icon: '⛏️', maxStamina: 15, upgrade: { coin: 1500, ore_copper: 20, ore_iron: 12 } },
  { level: 4, name: '铁镐', icon: '⛏️', maxStamina: 18, upgrade: { coin: 4000, ore_iron: 20, ore_silver: 8 } },
  { level: 5, name: '银镐', icon: '⛏️', maxStamina: 22, upgrade: { coin: 10000, ore_silver: 15, gem_amethyst: 3 } },
];

// 掉落表：每次下矿从中按权重抽一项，roll [min,max] 个。
//   minPick —— 该矿层需要几级镐才能挖到（镐越好，池子里稀有项越多）。
//   lucky   —— 稀有掉落，会被“幸运倍率”（镐等级 + 宠物/料理）放大权重。
export const mineLoot = [
  { key: 'stone', name: '石头', min: 1, max: 3, weight: 40, minPick: 1 },
  { key: 'ore_copper', name: '铜矿', min: 1, max: 2, weight: 30, minPick: 1 },
  { key: 'coin', name: '碎金', min: 20, max: 45, weight: 14, minPick: 1 },
  { key: 'ore_iron', name: '铁矿', min: 1, max: 2, weight: 26, minPick: 2 },
  { key: 'gem_topaz', name: '黄水晶', min: 1, max: 1, weight: 10, minPick: 2, lucky: true },
  { key: 'ore_silver', name: '银矿', min: 1, max: 1, weight: 20, minPick: 3 },
  { key: 'gem_amethyst', name: '紫水晶', min: 1, max: 1, weight: 8, minPick: 3, lucky: true },
  { key: 'diamond', name: '钻石', min: 2, max: 5, weight: 5, minPick: 3, lucky: true },
  { key: 'gem_emerald', name: '祖母绿', min: 1, max: 1, weight: 5, minPick: 4, lucky: true },
  { key: 'gem_crystal', name: '幻彩水晶', min: 1, max: 1, weight: 2, minPick: 5, lucky: true },
];

/** 取某个镐等级的配置（越界时夹到有效范围） */
export function getPickaxe(level) {
  const idx = Math.max(0, Math.min(pickaxes.length - 1, level - 1));
  return pickaxes[idx];
}

/** 是否已是满级镐 */
export function isMaxPick(level) {
  return level >= pickaxes.length;
}
