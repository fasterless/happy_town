// 季节活动配置
//
// 按现实月份轮换的限定活动：活动期间登录即可领一份季节礼物，
// 每个活动周期内只能领一次。没到季节的条目展示为「未开放」预告。
//
// seasonal 下挂三个维度的「限定内容」：
//   crops     —— 限定作物：只在活动月份出现在种子铺，可种植可收获
//   furniture —— 限定家具：只在活动月份出现在家具商店
//   orders    —— 限定订单：只在活动月份进入订单轮换池，奖励比普通单高
export const seasonalEvents = [
  {
    id: "spring_bloom",
    name: "春日花朝",
    icon: "🌸",
    startMonth: 3,
    endMonth: 5,
    description: "小镇开满了鲜花，来领一份春日礼物吧！",
    rewards: { crop_1003: 5, crop_1008: 3, diamond: 20 },
    seasonal: {
      crops: [
        { id: 1101, name: "樱花茶树", icon: "🌸", unlockLevel: 4, growTime: 360, seedPrice: 12, harvestCount: 2, sellPrice: 20 },
        { id: 1102, name: "春笋", icon: "🎍", unlockLevel: 6, growTime: 540, seedPrice: 15, harvestCount: 3, sellPrice: 14 },
      ],
      furniture: [
        { id: 3101, name: "樱花树盆栽", icon: "🌳", category: "活动", priceType: "diamond", price: 60, unlockLevel: 1 },
      ],
      orders: [
        { id: 3001, name: "花朝节礼盒", unlockLevel: 4, requires: [{ item: "crop_1101", count: 3 }], coin: 150, exp: 25, type: "限定" },
      ],
    },
  },
  {
    id: "summer_cool",
    name: "夏日清凉祭",
    icon: "🏖️",
    startMonth: 6,
    endMonth: 8,
    description: "湖边挤满了乘凉的居民，还有冰镇西瓜分享！",
    rewards: { crop_1002: 6, fish_1: 3, coin: 300 },
    seasonal: {
      crops: [
        { id: 1103, name: "西瓜", icon: "🍉", unlockLevel: 3, growTime: 600, seedPrice: 20, harvestCount: 1, sellPrice: 48 },
        { id: 1104, name: "冰薄荷叶", icon: "🍃", unlockLevel: 8, growTime: 300, seedPrice: 10, harvestCount: 4, sellPrice: 8 },
      ],
      furniture: [
        { id: 3102, name: "遮阳伞", icon: "⛱️", category: "活动", priceType: "diamond", price: 45, unlockLevel: 1 },
      ],
      orders: [
        { id: 3002, name: "消暑果盘", unlockLevel: 3, requires: [{ item: "crop_1103", count: 2 }], coin: 120, exp: 20, type: "限定" },
      ],
    },
  },
  {
    id: "autumn_harvest",
    name: "丰收庆典",
    icon: "🍂",
    startMonth: 9,
    endMonth: 10,
    description: "收获的季节到了，镇长给每位居民准备了谢礼。",
    rewards: { crop_1005: 2, crop_1009: 3, wood: 30 },
    seasonal: {
      crops: [
        { id: 1105, name: "金菊", icon: "🌼", unlockLevel: 5, growTime: 420, seedPrice: 14, harvestCount: 2, sellPrice: 24 },
        { id: 1106, name: "板栗", icon: "🌰", unlockLevel: 9, growTime: 900, seedPrice: 30, harvestCount: 3, sellPrice: 30 },
      ],
      furniture: [
        { id: 3103, name: "麦草垛", icon: "🌾", category: "活动", priceType: "diamond", price: 40, unlockLevel: 1 },
      ],
      orders: [
        { id: 3003, name: "丰收藏篮", unlockLevel: 5, requires: [{ item: "crop_1105", count: 3 }], coin: 160, exp: 28, type: "限定" },
      ],
    },
  },
  {
    id: "winter_feast",
    name: "冬雪家宴",
    icon: "❄️",
    startMonth: 11,
    endMonth: 12,
    description: "雪花落在屋顶上，家家户户飘出烘焙的香气。",
    rewards: { goods_5001: 2, diamond: 30, cloth: 10 },
    seasonal: {
      crops: [
        { id: 1107, name: "冬小麦", icon: "🌾", unlockLevel: 2, growTime: 240, seedPrice: 4, harvestCount: 3, sellPrice: 5 },
        { id: 1108, name: "糖霜浆果", icon: "🫐", unlockLevel: 10, growTime: 1200, seedPrice: 35, harvestCount: 2, sellPrice: 55 },
      ],
      furniture: [
        { id: 3104, name: "圣诞袜挂饰", icon: "🧦", category: "活动", priceType: "diamond", price: 35, unlockLevel: 1 },
      ],
      orders: [
        { id: 3004, name: "家宴烤篮", unlockLevel: 2, requires: [{ item: "crop_1107", count: 4 }], coin: 90, exp: 15, type: "限定" },
      ],
    },
  },
  {
    id: "new_year",
    name: "新年庙会",
    icon: "🏮",
    startMonth: 1,
    endMonth: 2,
    description: "新的一年，小镇挂起了红灯笼，见面都说吉祥话！",
    rewards: { coin: 500, diamond: 50, lottery_ticket: 2 },
    seasonal: {
      crops: [
        { id: 1109, name: "金桔树", icon: "🍊", unlockLevel: 3, growTime: 480, seedPrice: 16, harvestCount: 2, sellPrice: 26 },
        { id: 1110, name: "迎春水仙", icon: "💧", unlockLevel: 7, growTime: 360, seedPrice: 12, harvestCount: 2, sellPrice: 18 },
      ],
      furniture: [
        { id: 3105, name: "红灯笼", icon: "🏮", category: "活动", priceType: "diamond", price: 50, unlockLevel: 1 },
      ],
      orders: [
        { id: 3005, name: "年货大集", unlockLevel: 3, requires: [{ item: "crop_1109", count: 3 }], coin: 140, exp: 24, type: "限定" },
      ],
    },
  },
];

/**
 * 当前月份正在进行的活动（可能为 null）
 */
export function getCurrentSeasonalEvent() {
  const month = new Date().getMonth() + 1;
  return seasonalEvents.find(
    (event) => month >= event.startMonth && month <= event.endMonth
  ) || null;
}

/**
 * 当前活动的限定作物（无活动时空数组）
 */
export function getSeasonalCrops() {
  return getCurrentSeasonalEvent()?.seasonal?.crops || [];
}

/**
 * 当前活动的限定家具（无活动时空数组）
 */
export function getSeasonalFurniture() {
  return getCurrentSeasonalEvent()?.seasonal?.furniture || [];
}

/**
 * 当前活动的限定订单（无活动时空数组）
 */
export function getSeasonalOrders() {
  return getCurrentSeasonalEvent()?.seasonal?.orders || [];
}

/**
 * 全部季节限定作物（含未开放的，图鉴/预览用）
 */
export function getAllSeasonalCrops() {
  return seasonalEvents.flatMap((e) => e.seasonal?.crops || []);
}

/**
 * 活动状态：active（可领）/ claimedToday（已领）/ inactive（不在活动期）
 */
export function getSeasonalEventStatus(state, event) {
  if (getCurrentSeasonalEvent()?.id !== event.id) {
    return "inactive";
  }
  return state.seasons.claimedEventId === event.id ? "claimedToday" : "active";
}
