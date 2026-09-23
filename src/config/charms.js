// 宝石护符配置（第六轮 3/3）
//
// 护符是矿洞宝石的「长期出口」：用宝石 + 矿锭做成一枚护符，
// 装备后给挖矿/钓鱼/收获/订单一个永久的小加成。和料理不同——
// 料理是短时爆发（吃了才有、过期就没），护符是一直挂着的底子。
//
// 同一时刻只能装备一枚（换一枚就换一种加成），所以选哪枚是个取舍。
// 护符做成之后一直在，不消耗；想换别的就再做一枚。

// 护符系统解锁等级（和矿洞同一档，但第一枚护符本身要 Lv.10 的铁锭）
export const CHARM_MIN_LEVEL = 10;

// 护符列表。buff 的 value 是倍率（harvestBonus/orderBonus）或权重倍数（miningLuck/fishingLuck）。
export const charms = [
  {
    id: 8001,
    name: "黄水晶护符",
    icon: "🔶",
    unlockLevel: 10,
    requires: [{ item: "gem_topaz", count: 3 }, { item: "ingot_iron", count: 1 }],
    buff: { type: "harvestBonus", value: 1.1 },
    desc: "收获产量 +10%",
  },
  {
    id: 8002,
    name: "紫水晶护符",
    icon: "💜",
    unlockLevel: 12,
    requires: [{ item: "gem_amethyst", count: 3 }, { item: "ingot_silver", count: 1 }],
    buff: { type: "miningLuck", value: 1.5 },
    desc: "挖矿稀有掉落权重 +50%",
  },
  {
    id: 8003,
    name: "祖母绿护符",
    icon: "💚",
    unlockLevel: 14,
    requires: [{ item: "gem_emerald", count: 2 }, { item: "ingot_silver", count: 2 }],
    buff: { type: "orderBonus", value: 1.1 },
    desc: "订单金币 +10%",
  },
  {
    id: 8004,
    name: "幻彩护符",
    icon: "💠",
    unlockLevel: 16,
    requires: [{ item: "gem_crystal", count: 1 }, { item: "gem_emerald", count: 1 }, { item: "ingot_silver", count: 2 }],
    buff: { type: "fishingLuck", value: 1.5 },
    desc: "钓鱼稀有鱼权重 +50%",
  },
];

/** 取一枚护符的配置 */
export function getCharm(id) {
  return charms.find((c) => c.id === id);
}
