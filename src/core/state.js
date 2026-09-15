// 状态管理核心模块
import { avatars, INITIAL_RESOURCES, GAME_CONFIG } from '../config/constants.js';
import { defaultFriends } from '../config/npcs.js';
import { todayKey } from '../utils/time.js';
import { furnitureKey } from '../utils/format.js';

/**
 * 创建默认游戏状态
 * @returns {Object} 默认状态对象
 */
export function createDefaultState() {
  return {
    version: 3,
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
      plots: Array.from({ length: GAME_CONFIG.farm.maxPlots }, () => null),
      plantedTypes: [],
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
      loginStreak: 1,
      lastLoginDate: todayKey(),
    },
    pets: {
      owned: [],
      active: null,
      intimacy: {},
      lastFeed: {},
      lastGiftDate: "",
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
  const plotCount = GAME_CONFIG.farm.maxPlots;
  if (!Array.isArray(state.farm.plots)) {
    state.farm.plots = Array.from({ length: plotCount }, () => null);
  } else if (state.farm.plots.length < plotCount) {
    // 旧存档只有 6 块地，扩到 12 块时保留已种作物
    state.farm.plots = [
      ...state.farm.plots,
      ...Array.from({ length: plotCount - state.farm.plots.length }, () => null),
    ];
  } else if (state.farm.plots.length > plotCount) {
    state.farm.plots = state.farm.plots.slice(0, plotCount);
  }

  if (!Array.isArray(state.home.layout) || state.home.layout.length !== 36) {
    state.home.layout = Array.from({ length: 36 }, () => null);
  }

  if (!Array.isArray(state.friends)) {
    state.friends = JSON.parse(JSON.stringify(defaultFriends));
  } else {
    const friendIds = state.friends.map((f) => f.id);
    defaultFriends.forEach((npc) => {
      if (!friendIds.includes(npc.id)) {
        state.friends.push({ ...npc });
      }
    });
  }

  if (!Array.isArray(state.orders.activeIds) || state.orders.activeIds.length !== 3) {
    state.orders.activeIds = [2006, 2001, 2001];
    state.orders.cursor = 0;
  }

  if (!state.achievements) {
    state.achievements = { unlocked: [], progress: {}, loginStreak: 1, lastLoginDate: todayKey() };
  }
  if (typeof state.achievements.loginStreak !== "number") {
    state.achievements.loginStreak = 1;
  }

  if (!state.pets) {
    state.pets = { owned: [], active: null, intimacy: {}, lastFeed: {}, lastGiftDate: "" };
  }
  if (!Array.isArray(state.farm.plantedTypes)) {
    state.farm.plantedTypes = [];
  }

  if (!state.pets.lastFeed || typeof state.pets.lastFeed !== "object") {
    state.pets.lastFeed = {};
  }
  // 把旧存档里散落的 `${petId}_lastFeed` 迁到 lastFeed 对象
  Object.keys(state.pets).forEach((key) => {
    if (key.endsWith("_lastFeed")) {
      const petId = key.slice(0, -"_lastFeed".length);
      if (!state.pets.lastFeed[petId]) {
        state.pets.lastFeed[petId] = state.pets[key];
      }
      delete state.pets[key];
    }
  });

  state.version = 3;
  return state;
}
