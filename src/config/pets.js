// 宠物配置
//
// pets 数组也在这里（从 systems/pets.js 抽出来，避免系统模块反向依赖 UI 配置）。
export const pets = [
  {
    id: "cat",
    name: "农场小猫",
    icon: "🐱",
    desc: "加速作物生长5%",
    price: 200,
    priceType: "diamond",
    buff: { type: "growthSpeed", value: 1.05 },
    foodCost: { crop_1001: 2 }, // 小麦
  },
  {
    id: "dog",
    name: "牧羊犬",
    icon: "🐶",
    desc: "增加订单奖励10%",
    price: 250,
    priceType: "diamond",
    buff: { type: "orderBonus", value: 1.10 },
    foodCost: { crop_1002: 2 }, // 番茄
  },
  {
    id: "rabbit",
    name: "兔子",
    icon: "🐰",
    desc: "每日赠送随机作物",
    price: 180,
    priceType: "diamond",
    buff: { type: "dailyGift", value: "random_crop" },
    foodCost: { crop_1003: 1 }, // 草莓
  },
  {
    id: "duck",
    name: "鸭子",
    icon: "🦆",
    desc: "增加好友点获取50%",
    price: 150,
    priceType: "diamond",
    buff: { type: "friendPointBonus", value: 1.50 },
    foodCost: { crop_1001: 3 }, // 小麦
  },
  {
    id: "pig",
    name: "小猪",
    icon: "🐷",
    desc: "降低种子价格10%",
    price: 220,
    priceType: "diamond",
    buff: { type: "seedDiscount", value: 0.90 },
    foodCost: { crop_1004: 1 }, // 玉米
  },
  {
    id: "fox",
    name: "小狐狸",
    icon: "🦊",
    desc: "钓鱼更容易钓到大家伙（稀有鱼概率提升）",
    price: 320,
    priceType: "diamond",
    buff: { type: "fishingLuck", value: 1.5 },
    foodCost: { crop_1006: 2 }, // 稻米
  },
  {
    id: "parrot",
    name: "鹦鹉",
    icon: "🦜",
    desc: "加工时间缩短20%",
    price: 380,
    priceType: "diamond",
    buff: { type: "craftSpeed", value: 0.8 },
    foodCost: { crop_1008: 1 }, // 郁金香
  },
];

// 宠物查询辅助函数
export function getPet(id) {
  return pets.find((p) => p.id === id);
}
