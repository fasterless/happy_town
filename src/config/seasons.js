// 季节活动配置
//
// 按现实月份轮换的限定活动：活动期间登录即可领一份季节礼物，
// 每个活动周期内只能领一次。没到季节的条目展示为「未开放」预告。
export const seasonalEvents = [
  {
    id: "spring_bloom",
    name: "春日花朝",
    icon: "🌸",
    startMonth: 3,
    endMonth: 5,
    description: "小镇开满了鲜花，来领一份春日礼物吧！",
    rewards: { crop_1003: 5, crop_1008: 3, diamond: 20 },
  },
  {
    id: "summer_cool",
    name: "夏日清凉祭",
    icon: "🏖️",
    startMonth: 6,
    endMonth: 8,
    description: "湖边挤满了乘凉的居民，还有冰镇西瓜分享！",
    rewards: { crop_1002: 6, fish_1: 3, coin: 300 },
  },
  {
    id: "autumn_harvest",
    name: "丰收庆典",
    icon: "🍂",
    startMonth: 9,
    endMonth: 10,
    description: "收获的季节到了，镇长给每位居民准备了谢礼。",
    rewards: { crop_1005: 2, crop_1009: 3, wood: 30 },
  },
  {
    id: "winter_feast",
    name: "冬雪家宴",
    icon: "❄️",
    startMonth: 11,
    endMonth: 12,
    description: "雪花落在屋顶上，家家户户飘出烘焙的香气。",
    rewards: { goods_5001: 2, diamond: 30, cloth: 10 },
  },
  {
    id: "new_year",
    name: "新年庙会",
    icon: "🏮",
    startMonth: 1,
    endMonth: 2,
    description: "新的一年，小镇挂起了红灯笼，见面都说吉祥话！",
    rewards: { coin: 500, diamond: 50, lottery_ticket: 2 },
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
 * 活动状态：active（可领）/ claimedToday（已领）/ inactive（不在活动期）
 */
export function getSeasonalEventStatus(state, event) {
  if (getCurrentSeasonalEvent()?.id !== event.id) {
    return "inactive";
  }
  return state.seasons.claimedEventId === event.id ? "claimedToday" : "active";
}
