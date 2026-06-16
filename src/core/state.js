// 状态管理核心模块
import { avatars, INITIAL_RESOURCES } from '../config/constants.js';
import { defaultFriends } from '../config/npcs.js';
import { todayKey } from '../utils/time.js';
import { furnitureKey } from '../utils/format.js';

/**
 * 创建默认游戏状态
 * @returns {Object} 默认状态对象
 */
export function createDefaultState() {
  return {
    version: 2,
    user: {
      created: false,
      userId: `U${Math.floor(100000 + Math.random() * 900000)}`,
      nickname: "小镇居民",
      avatar: avatars[0],
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    },
    wallet: {
      coin: INITIAL_RESOURCES.coin,
      diamond: INITIAL_RESOURCES.diamond,
      friendPoint: 0,
      exp: 0,
      level: 1,
      communityContribution: 0,
    },
    inventory: {
      wood: INITIAL_RESOURCES.wood,
      stone: INITIAL_RESOURCES.stone,
      cloth: INITIAL_RESOURCES.cloth,
      [furnitureKey(3001)]: 1,
    },
    farm: {
      plots: Array.from({ length: 6 }, () => null),
    },
    orders: {
      activeIds: [2006, 2001, 2001],
      cursor: 0,
    },
    home: {
      layout: Array.from({ length: 36 }, () => null),
      savedAt: null,
    },
    friends: JSON.parse(JSON.stringify(defaultFriends)),
    community: {
      joined: false,
      name: "暖阳社区",
      role: "成员",
      stage: 1,
      progress: 0,
      members: [
        { name: "林镇长", role: "社长", contribution: 520 },
        { name: "麦香面包师", role: "副社长", contribution: 280 },
        { name: "花园阿梨", role: "成员", contribution: 130 },
      ],
    },
    daily: createDailyState(),
    shop: {
      monthlyCard: false,
      monthlyClaimedDate: "",
      boughtGoods: {},
    },
    // 新增系统状态
    achievements: {
      unlocked: [],
      progress: {},
    },
    pets: {
      owned: [],
      active: null,
      intimacy: {},
    },
    weather: {
      current: "sunny",
      lastUpdate: todayKey(),
    },
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      tutorialCompleted: false,
    },
    analytics: {},
  };
}

/**
 * 创建每日状态
 * @returns {Object} 每日状态对象
 */
export function createDailyState() {
  return {
    date: todayKey(),
    progress: { login: 1 },
    claimedTasks: {},
    claimedBoxes: {},
    activeScore: 0,
    friendLikes: {},
  };
}

/**
 * 合并已保存状态和默认状态
 * @param {Object} base - 基础状态
 * @param {Object} saved - 已保存的状态
 * @returns {Object} 合并后的状态
 */
export function mergeState(base, saved) {
  return {
    ...base,
    ...saved,
    user: { ...base.user, ...(saved.user || {}) },
    wallet: { ...base.wallet, ...(saved.wallet || {}) },
    inventory: { ...base.inventory, ...(saved.inventory || {}) },
    farm: { ...base.farm, ...(saved.farm || {}) },
    orders: { ...base.orders, ...(saved.orders || {}) },
    home: { ...base.home, ...(saved.home || {}) },
    friends: saved.friends || base.friends,
    community: { ...base.community, ...(saved.community || {}) },
    daily: { ...base.daily, ...(saved.daily || {}) },
    shop: { ...base.shop, ...(saved.shop || {}) },
    achievements: { ...base.achievements, ...(saved.achievements || {}) },
    pets: { ...base.pets, ...(saved.pets || {}) },
    weather: { ...base.weather, ...(saved.weather || {}) },
    settings: { ...base.settings, ...(saved.settings || {}) },
    analytics: { ...base.analytics, ...(saved.analytics || {}) },
  };
}

/**
 * 规范化状态数据（修复数组长度、同步NPC等）
 * @param {Object} state - 状态对象
 * @returns {Object} 规范化后的状态
 */
export function normalizeState(state) {
  // 确保农田数组长度
  if (!Array.isArray(state.farm.plots) || state.farm.plots.length !== 6) {
    state.farm.plots = Array.from({ length: 6 }, () => null);
  }

  // 确保房间布局数组长度
  if (!Array.isArray(state.home.layout) || state.home.layout.length !== 36) {
    state.home.layout = Array.from({ length: 36 }, () => null);
  }

  // 确保好友列表包含所有 NPC
  const friendIds = state.friends.map(f => f.id);
  defaultFriends.forEach(npc => {
    if (!friendIds.includes(npc.id)) {
      state.friends.push({ ...npc });
    }
  });

  // 确保订单槽位数量
  if (!Array.isArray(state.orders.activeIds) || state.orders.activeIds.length !== 3) {
    state.orders.activeIds = [2006, 2001, 2001];
    state.orders.cursor = 0;
  }

  return state;
}
