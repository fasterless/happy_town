// 成就系统模块
import { addRewards } from '../core/inventory.js';
import { emit, Events } from '../core/events.js';

// 成就配置
export const achievements = [
  {
    id: "harvest_100",
    name: "种植大师",
    desc: "收获作物100次",
    icon: "🌾",
    target: 100,
    trackKey: "harvest_crop",
    rewards: { diamond: 50, coin: 1000 },
  },
  {
    id: "order_50",
    name: "订单达人",
    desc: "完成50个订单",
    icon: "📋",
    target: 50,
    trackKey: "order_complete",
    rewards: { diamond: 30, coin: 500 },
  },
  {
    id: "visit_30",
    name: "社交之星",
    desc: "拜访好友30次",
    icon: "👥",
    target: 30,
    trackKey: "friend_visit",
    rewards: { friendPoint: 100, diamond: 20 },
  },
  {
    id: "furniture_all",
    name: "装饰专家",
    desc: "购买所有类型的家具",
    icon: "🏠",
    target: 8,
    trackKey: "furniture_types",
    rewards: { diamond: 100 },
  },
  {
    id: "level_20",
    name: "满级玩家",
    desc: "达到Lv.20",
    icon: "⭐",
    target: 20,
    trackKey: "level",
    rewards: { diamond: 200, coin: 5000 },
  },
  {
    id: "community_stage5",
    name: "社区领袖",
    desc: "完成喷泉第5阶段",
    icon: "⛲",
    target: 5,
    trackKey: "community_stage",
    rewards: { diamond: 150, f_3007: 1 },
  },
  {
    id: "coin_10000",
    name: "土豪",
    desc: "拥有10000金币",
    icon: "💰",
    target: 10000,
    trackKey: "coin",
    rewards: { diamond: 50 },
  },
  {
    id: "diamond_1000",
    name: "钻石收藏家",
    desc: "拥有1000钻石",
    icon: "💎",
    target: 1000,
    trackKey: "diamond",
    rewards: { coin: 5000 },
  },
  {
    id: "order_10_daily",
    name: "速度狂人",
    desc: "单日完成10个订单",
    icon: "🚀",
    target: 10,
    trackKey: "order_daily",
    rewards: { diamond: 30, coin: 500 },
  },
  {
    id: "room_score_s",
    name: "完美家园",
    desc: "房间装饰评分达到S级",
    icon: "🏅",
    target: 500,
    trackKey: "room_score",
    rewards: { diamond: 100, coin: 2000 },
  },
  {
    id: "plant_all_crops",
    name: "农场大亨",
    desc: "种植过所有类型的作物",
    icon: "🎃",
    target: 5,
    trackKey: "crop_types",
    rewards: { diamond: 40, coin: 800 },
  },
  {
    id: "login_7",
    name: "忠实玩家",
    desc: "连续登录7天",
    icon: "📅",
    target: 7,
    trackKey: "login_streak",
    rewards: { diamond: 70, coin: 1500 },
  },
];

/**
 * 检查并解锁成就
 * @param {Object} state - 游戏状态
 * @returns {Array} 新解锁的成就列表
 */
export function checkAchievements(state) {
  const newUnlocked = [];

  achievements.forEach(achievement => {
    // 跳过已解锁的
    if (state.achievements.unlocked.includes(achievement.id)) {
      return;
    }

    // 获取当前进度
    const progress = getAchievementProgress(state, achievement);

    // 更新进度
    state.achievements.progress[achievement.id] = progress;

    // 检查是否达成
    if (progress >= achievement.target) {
      unlockAchievement(state, achievement.id);
      newUnlocked.push(achievement);
    }
  });

  return newUnlocked;
}

/**
 * 解锁成就
 * @param {Object} state - 游戏状态
 * @param {string} achievementId - 成就ID
 * @returns {Object} 更新后的状态
 */
export function unlockAchievement(state, achievementId) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return state;

  // 添加到已解锁列表
  if (!state.achievements.unlocked.includes(achievementId)) {
    state.achievements.unlocked.push(achievementId);

    // 发放奖励
    addRewards(state, achievement.rewards);

    // 触发事件
    emit(Events.ACHIEVEMENT_UNLOCKED, { achievement });
  }

  return state;
}

/**
 * 获取成就当前进度
 * @param {Object} state - 游戏状态
 * @param {Object} achievement - 成就对象
 * @returns {number} 当前进度值
 */
function getAchievementProgress(state, achievement) {
  switch (achievement.trackKey) {
    case "harvest_crop":
    case "order_complete":
    case "friend_visit":
      return state.analytics[achievement.trackKey] || 0;

    case "level":
      return state.wallet.level;

    case "coin":
      return state.wallet.coin;

    case "diamond":
      return state.wallet.diamond;

    case "community_stage":
      return state.community.stage - 1; // 当前完成的阶段数

    case "order_daily":
      return state.daily.progress.order || 0;

    case "room_score":
      // 需要计算房间评分
      const { calculateRoomScore } = require('./home.js');
      return calculateRoomScore(state).score;

    case "furniture_types":
      // 统计购买过的家具种类
      return Object.keys(state.inventory).filter(key => key.startsWith('f_')).length;

    case "crop_types":
      // 统计种植过的作物种类（通过分析背包）
      return Object.keys(state.inventory).filter(key => key.startsWith('crop_')).length;

    case "login_streak":
      // 连续登录天数（需要额外追踪）
      return state.achievements.loginStreak || 1;

    default:
      return 0;
  }
}

/**
 * 获取成就完成进度百分比
 * @param {Object} state - 游戏状态
 * @param {string} achievementId - 成就ID
 * @returns {number} 进度百分比 (0-100)
 */
export function getAchievementProgressPercent(state, achievementId) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return 0;

  const progress = state.achievements.progress[achievementId] || getAchievementProgress(state, achievement);
  return Math.min(100, Math.floor((progress / achievement.target) * 100));
}

/**
 * 获取已解锁的成就
 * @param {Object} state - 游戏状态
 * @returns {Array} 已解锁的成就列表
 */
export function getUnlockedAchievements(state) {
  return achievements.filter(a => state.achievements.unlocked.includes(a.id));
}

/**
 * 获取未解锁的成就
 * @param {Object} state - 游戏状态
 * @returns {Array} 未解锁的成就列表
 */
export function getLockedAchievements(state) {
  return achievements.filter(a => !state.achievements.unlocked.includes(a.id));
}

/**
 * 获取成就完成统计
 * @param {Object} state - 游戏状态
 * @returns {Object} { total, unlocked, percent }
 */
export function getAchievementStats(state) {
  const total = achievements.length;
  const unlocked = state.achievements.unlocked.length;
  const percent = Math.floor((unlocked / total) * 100);

  return { total, unlocked, percent };
}
