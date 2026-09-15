// 季节限定活动系统
// 添加季节轮换事件，增加重复玩乐感和活动感

export const seasonalEvents = [
  {
    id: "spring_festival",
    name: "春节限定",
    icon: "🎉",
    startMonth: 1,
    endMonth: 1,
    durationDays: 7,
    description: "春节快乐！",
    rewards: [
      { type: "coin", amount: 200, message: "恭喜获得200金币" },
      { type: "crop_1001", amount: 10, message: "送你10个小麦种子" },
      { type: "diamond", amount: 30, message: "获得30钻石" },
      { type: "f_3001", amount: 1, message: "获得木椅！" }
    ],
    unlockLevel: 7
  },
  {
    id: "summer_vacation",
    name: "暑假活动",
    icon: "☀️",
    startMonth: 6,
    endMonth: 8,
    durationDays: 14,
    description: "暑假快乐！",
    rewards: [
      { type: "coin", amount: 300, message: "获得300金币" },
      { type: "diamond", amount: 50, message: "获得50钻石" },
      { type: "crop_1002", amount: 15, message: "送你15个番茄种子" },
      { type: "lucky_coin", amount: 5, message: "获得5个幸运币" }
    ],
    unlockLevel: 9
  },
  {
    id: "autumn_event",
    name: "秋季收割",
    icon: "🍂",
    startMonth: 9,
    endMonth: 11,
    durationDays: 10,
    description: "收获季来啦！",
    rewards: [
      { type: "coin", amount: 250, message: "获得250金币" },
      { type: "crop_1003", amount: 12, message: "送你12个草莓种子" },
      { type: "fish", amount: 8, message: "钓鱼奖励" },
      { type: "wood", amount: 50, message: "获得50木头" }
    ],
    unlockLevel: 10
  },
  {
    id: "winter_holiday",
    name: "冬季节庆",
    icon: "❄️",
    startMonth: 11,
    endMonth: 11,
    durationDays: 5,
    description: "圣诞快乐！",
    rewards: [
      { type: "coin", amount: 400, message: "获得400金币" },
      { type: "diamond", amount: 80, message: "获得80钻石" },
      { type: "crop_1004", amount: 8, message: "送你8个玉米种子" },
      { type: "f_3002", amount: 1, message: "获得木桌！" }
    ],
    unlockLevel: 12
  }
];

// 季节活动管理器
export function getCurrentSeasonalEvent(state) {
  const now = new Date();
  const month = now.getMonth() + 1; // 0-11 → 1-12

  return seasonalEvents.find(event => {
    if (state.wallet.level < event.unlockLevel) return false;
    return month >= event.startMonth && month <= event.endMonth;
  });
}

export function claimSeasonalReward(state, eventId) {
  const event = seasonalEvents.find(e => e.id === eventId);
  if (!event) return false;

  // 检查是否在活动期间
  const now = new Date();
  const month = now.getMonth() + 1;
  if (month < event.startMonth || month > event.endMonth) {
    return false;
  }

  // 发放奖励
  event.rewards.forEach(reward => {
    addItem(state, reward.type, reward.amount);
    showToast(reward.message, "success");
  });

  playSound("success");
  return true;
}