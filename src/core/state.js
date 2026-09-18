// 状态管理核心模块
import { avatars, INITIAL_RESOURCES, GAME_CONFIG } from '../config/constants.js';
import { defaultFriends } from '../config/npcs.js';
import { todayKey } from '../utils/time.js';
import { furnitureKey } from '../utils/format.js';
import { initNeighborEvents } from '../systems/events.js';

// 当前存档结构版本：每次给 state 增加新字段时 +1，并在 core/migrations.js 里补一条迁移
export const CURRENT_VERSION = 5;

/**
 * 创建默认游戏状态
 * @returns {Object} 默认状态对象
 */
export function createDefaultState() {
  return {
    version: CURRENT_VERSION,
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
      expansions: [],          // 土地扩建记录（v5 预留，第二阶段启用）
      goldStats: { totalGold: 0 }, // 金穗作物统计（v5 预留，第二阶段启用）
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
    // 加工坊：正在进行的加工批次
    crafting: {
      queue: [],
    },
    // 湖畔钓鱼：每日免费次数使用记录
    fishing: {
      lastFreeDate: "",
      freeCastsUsed: 0,
    },
    // 幸运转盘：保底计数与累计抽数
    lottery: {
      pity: 0,
      spins: 0,
    },
    // 季节活动：本次活动已领标记
    seasons: {
      claimedEventId: "",
    },
    // 邻居回礼：每天每位邻居的领取标记
    npcEvents: {
      claimedToday: {},
    },
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
    crafting: { ...base.crafting, ...(saved.crafting || {}) },
    fishing: { ...base.fishing, ...(saved.fishing || {}) },
    lottery: { ...base.lottery, ...(saved.lottery || {}) },
    seasons: { ...base.seasons, ...(saved.seasons || {}) },
    npcEvents: { ...base.npcEvents, ...(saved.npcEvents || {}) },
    achievements: { ...base.achievements, ...(saved.achievements || {}) },
    pets: { ...base.pets, ...(saved.pets || {}) },
    weather: { ...base.weather, ...(saved.weather || {}) },
    settings: { ...base.settings, ...(saved.settings || {}) },
    analytics: { ...base.analytics, ...(saved.analytics || {}) },
  };
}

/**
 * 规范化状态数据（修复数组长度、同步NPC、迁移旧存档等）
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

  // 引入了向日葵（1009）/葡萄（1010）作为真作物后，老存档里「种过所有作物」的
  // 记录可能引用了旧版不可收获的 1009/1010 假作物，把它们清掉，玩家重种即可
  if (Array.isArray(state.farm.plantedTypes)) {
    state.farm.plantedTypes = state.farm.plantedTypes.filter((id) => id !== 1009 && id !== 1010);
  }

  // 地块上如果还留着旧版假作物，直接清空并退还种子钱
  state.farm.plots.forEach((plot, index) => {
    if (plot && (plot.cropId === 1009 || plot.cropId === 1010)) {
      state.farm.plots[index] = null;
      state.wallet.coin += 10;
    }
  });

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

  // 新系统状态兜底（老存档合并时已由 mergeState 带上默认值，这里再做形状校验）
  if (!Array.isArray(state.crafting.queue)) state.crafting.queue = [];
  if (typeof state.fishing.lastFreeDate !== "string") state.fishing.lastFreeDate = "";
  if (typeof state.fishing.freeCastsUsed !== "number") state.fishing.freeCastsUsed = 0;
  if (typeof state.lottery.pity !== "number") state.lottery.pity = 0;
  if (typeof state.lottery.spins !== "number") state.lottery.spins = 0;
  if (typeof state.seasons.claimedEventId !== "string") state.seasons.claimedEventId = "";
  initNeighborEvents(state);

  state.version = CURRENT_VERSION;
  return state;
}
