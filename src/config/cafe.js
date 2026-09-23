// 咖啡馆配置（第七轮 3/3）
//
// 咖啡馆是料理铺的下游出口：料理铺做出来的菜以前只能自己吃（换一段限时增益），
// 现在多了一条路——端给每天上门的客人。客人点名要某道菜，端上就给金币，
// 有人还会留下一笔小费。菜只有一份，自己吃还是卖给客人，由玩家挑。
//
// 客人不挑季节、不挑天气，每天固定来几位，点的菜从玩家当前等级做得出的料理里抽。

// 咖啡馆解锁等级（跟着第一道料理走，做得出菜才有得端）
export const CAFE_MIN_LEVEL = 8;

// 每天上门的客人数
export const CAFE_GUESTS_PER_DAY = 4;

// 客人名录。tipChance 是留下小费的概率，tipCoin 是小费金额。
export const cafeGuests = [
  { id: "baker", name: "麦香面包师", icon: "🧑‍🍳", tipChance: 0.3, tipCoin: 20 },
  { id: "mayor", name: "林镇长", icon: "👴", tipChance: 0.5, tipCoin: 40 },
  { id: "gardener", name: "花园阿梨", icon: "👩‍🌾", tipChance: 0.25, tipCoin: 15 },
  { id: "fisher", name: "湖边老周", icon: "🎣", tipChance: 0.2, tipCoin: 25 },
  { id: "miner", name: "矿洞阿石", icon: "⛏️", tipChance: 0.35, tipCoin: 30 },
  { id: "traveler", name: "过路旅人", icon: "🧳", tipChance: 0.6, tipCoin: 50 },
];

/**
 * 端一道菜给客人的金币：按菜的原料价值算，再给一点手艺钱
 * @param {Object} dish - 料理配置
 * @returns {number}
 */
export function getCafePrice(dish) {
  return Math.round(dish.value * 1.3) + 10;
}
