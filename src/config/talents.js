// 天赋树配置（第七轮 1/3）
//
// 天赋是贯穿所有系统的元成长：升级攒天赋点，点亮一条分支里的节点，
// 得到一个永久的小加成。和护符、料理不同——护符同一时刻只能挂一枚、
// 料理是限时的，天赋点亮了就一直在，而且五条分支各管各的系统，
// 所以「先点哪条」本身就是个取舍。
//
// 每条分支 4 个节点，必须按顺序点（先点 rank 1 才能点 rank 2）。
// 数值刻意温和：单节点 5%~8%，一条分支点满也就是两成出头，
// 和料理、护符叠乘也不会把收益放大到失控。

// 天赋树解锁等级
export const TALENT_MIN_LEVEL = 5;

// 天赋点来源：每升一级给一点，再加起步的一点（Lv.5 解锁时手里就有 6 点可花）
export const TALENT_POINT_BASE = 1;

/**
 * 某个等级一共能拿到多少天赋点
 * @param {number} level
 * @returns {number}
 */
export function getTalentPointsForLevel(level) {
  return Math.max(0, level) + TALENT_POINT_BASE;
}

// 分支定义。effect 是加成类型，每级的数值在节点里。
export const talentBranches = [
  { id: "farm", name: "田园", icon: "🌾", desc: "种得更快、收得更多" },
  { id: "fishing", name: "湖畔", icon: "🎣", desc: "稀有鱼更容易上钩" },
  { id: "mine", name: "矿洞", icon: "⛏️", desc: "挖得更深、宝石更多" },
  { id: "order", name: "集市", icon: "📋", desc: "订单卖得更贵" },
  { id: "craft", name: "匠心", icon: "🥖", desc: "加工更快完成" },
];

// 节点列表。rank 是分支内的顺序（1 起），cost 是点亮花费的天赋点。
// effect.value 的含义取决于 effect.type：
//   growthSpeed —— 生长速度倍率（>1 更快）
//   harvestBonus —— 收获产量倍率
//   fishingLuck / miningLuck —— 稀有掉落权重倍数
//   orderBonus —— 订单金币倍率
//   craftSpeed —— 加工耗时倍率（<1 更快）
export const talentNodes = [
  // —— 田园 ——
  { id: "farm_1", branch: "farm", rank: 1, name: "勤浇灌", cost: 1,
    effect: { type: "growthSpeed", value: 1.05 }, desc: "作物生长快 5%" },
  { id: "farm_2", branch: "farm", rank: 2, name: "好收成", cost: 1,
    effect: { type: "harvestBonus", value: 1.05 }, desc: "收获产量 +5%" },
  { id: "farm_3", branch: "farm", rank: 3, name: "沃土", cost: 2,
    effect: { type: "growthSpeed", value: 1.08 }, desc: "作物生长再快 8%" },
  { id: "farm_4", branch: "farm", rank: 4, name: "丰年", cost: 2,
    effect: { type: "harvestBonus", value: 1.08 }, desc: "收获产量再 +8%" },

  // —— 湖畔 ——
  { id: "fish_1", branch: "fishing", rank: 1, name: "识水性", cost: 1,
    effect: { type: "fishingLuck", value: 1.1 }, desc: "稀有鱼权重 +10%" },
  { id: "fish_2", branch: "fishing", rank: 2, name: "老钓手", cost: 1,
    effect: { type: "fishingLuck", value: 1.15 }, desc: "稀有鱼权重再 +15%" },
  { id: "fish_3", branch: "fishing", rank: 3, name: "观鱼", cost: 2,
    effect: { type: "fishingLuck", value: 1.2 }, desc: "稀有鱼权重再 +20%" },
  { id: "fish_4", branch: "fishing", rank: 4, name: "湖主", cost: 2,
    effect: { type: "fishingLuck", value: 1.25 }, desc: "稀有鱼权重再 +25%" },

  // —— 矿洞 ——
  { id: "mine_1", branch: "mine", rank: 1, name: "识矿脉", cost: 1,
    effect: { type: "miningLuck", value: 1.1 }, desc: "稀有矿藏权重 +10%" },
  { id: "mine_2", branch: "mine", rank: 2, name: "老矿工", cost: 1,
    effect: { type: "miningLuck", value: 1.15 }, desc: "稀有矿藏权重再 +15%" },
  { id: "mine_3", branch: "mine", rank: 3, name: "寻宝", cost: 2,
    effect: { type: "miningLuck", value: 1.2 }, desc: "稀有矿藏权重再 +20%" },
  { id: "mine_4", branch: "mine", rank: 4, name: "矿主", cost: 2,
    effect: { type: "miningLuck", value: 1.25 }, desc: "稀有矿藏权重再 +25%" },

  // —— 集市 ——
  { id: "order_1", branch: "order", rank: 1, name: "会算账", cost: 1,
    effect: { type: "orderBonus", value: 1.05 }, desc: "订单金币 +5%" },
  { id: "order_2", branch: "order", rank: 2, name: "老主顾", cost: 1,
    effect: { type: "orderBonus", value: 1.05 }, desc: "订单金币再 +5%" },
  { id: "order_3", branch: "order", rank: 3, name: "好口碑", cost: 2,
    effect: { type: "orderBonus", value: 1.08 }, desc: "订单金币再 +8%" },
  { id: "order_4", branch: "order", rank: 4, name: "供货王", cost: 2,
    effect: { type: "orderBonus", value: 1.08 }, desc: "订单金币再 +8%" },

  // —— 匠心 ——
  { id: "craft_1", branch: "craft", rank: 1, name: "熟手", cost: 1,
    effect: { type: "craftSpeed", value: 0.95 }, desc: "加工快 5%" },
  { id: "craft_2", branch: "craft", rank: 2, name: "巧匠", cost: 1,
    effect: { type: "craftSpeed", value: 0.93 }, desc: "加工再快 7%" },
  { id: "craft_3", branch: "craft", rank: 3, name: "流水线", cost: 2,
    effect: { type: "craftSpeed", value: 0.9 }, desc: "加工再快 10%" },
  { id: "craft_4", branch: "craft", rank: 4, name: "大师傅", cost: 2,
    effect: { type: "craftSpeed", value: 0.88 }, desc: "加工再快 12%" },
];

/** 取一个节点的配置 */
export function getTalentNode(id) {
  return talentNodes.find((node) => node.id === id);
}

/** 取一条分支的全部节点（按 rank 升序） */
export function getBranchNodes(branchId) {
  return talentNodes.filter((node) => node.branch === branchId).sort((a, b) => a.rank - b.rank);
}
