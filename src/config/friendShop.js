// 友情商店配置
//
// 友情点（friendPoint）的专属去处：拜访、点赞、帮浇攒下的友情点
// 在这里换稀罕道具。价格定的比来源增速高一点，攒几天换一件，
// 保持「社交有收益但不逼肝」。
// 全部商品走 friendPoint 计价通道（inventory.canAfford/spendPrice 已支持）。
export const friendShopGoods = [
  {
    id: 6001,
    name: "神秘种子袋",
    icon: "🎲",
    desc: "随机获得 3 包当前可种植的种子",
    price: 40,
    // 购买时动态结算：随机 3 种解锁作物的种子×2
    dynamic: "seedBag",
  },
  {
    id: 6002,
    name: "鱼饵桶",
    icon: "🪣",
    desc: "钓鱼补给：speed_ticket×1 + 鱼饵金币×20",
    price: 30,
    rewards: { speed_ticket: 1, coin: 20 },
  },
  {
    id: 6003,
    name: "邻居的裁缝包",
    icon: "🧵",
    desc: "布料×3 + 木材×3，装修救急",
    price: 35,
    rewards: { cloth: 3, wood: 3 },
  },
  {
    id: 6004,
    name: "友情加速券",
    icon: "⏩",
    desc: "speed_ticket×2，邻居们凑给你的",
    price: 50,
    rewards: { speed_ticket: 2 },
  },
  {
    id: 6005,
    name: "小镇幸运饼干",
    icon: "🥠",
    desc: "lottery_ticket×2 + 💎5",
    price: 60,
    rewards: { lottery_ticket: 2, diamond: 5 },
  },
  {
    id: 6006,
    name: "稀有鱼苗卡",
    icon: "🐠",
    desc: "fish_3×1（小龙虾）+ fish_1×2",
    price: 55,
    rewards: { fish_3: 1, fish_1: 2 },
  },
];

/**
 * 查询商品
 */
export function getFriendShopGoods(id) {
  return friendShopGoods.find((g) => g.id === id);
}
