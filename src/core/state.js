// 状态管理核心模块
import { avatars, INITIAL_RESOURCES, GAME_CONFIG } from '../config/constants.js';
import { defaultFriends } from '../config/npcs.js';
import { todayKey } from '../utils/time.js';
import { furnitureKey } from '../utils/format.js';
import { initNeighborEvents } from '../systems/events.js';

// 当前存档结构版本：每次给 state 增加新字段时 +1，并在 core/migrations.js 里补一条迁移
export const CURRENT_VERSION = 9;

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
      plots: Array.from({ length: GAME_CONFIG.farm.basePlots }, () => null),
      plantedTypes: [],
      expansions: [],          // 土地扩建记录（v5 预留，第二阶段启用）
      goldStats: { totalGold: 0 }, // 金穗作物统计（v5 预留，第二阶段启用）
    },
    orders: {
      activeIds: [2006, 2001, 2001],
      cursor: 0,
      rush: null,               // 限时订单 { id, expireAt }，null 表示当前没有
      rushFinishedToday: "",    // 今天是否已接过限时单（日期键）
      chainType: "",            // 连锁订单：当前连胜的订单类型
      chainCount: 0,             // 连锁订单：当前连胜次数
      reservedId: null,         // 预购的明日订单 id
      reservedPaidAt: "",       // 预购日期键，跨天后兑现
    },
    home: {
      layout: Array.from({ length: 36 }, () => null),
      savedAt: null,
    },
    friends: JSON.parse(JSON.stringify(defaultFriends)),
    // 好友玩法：帮浇次数（按日）、拜访连击（按日重置）
    social: {
      waterDate: "",          // 帮浇次数所在的日期键
      waterUsed: 0,           // 今天已用掉的帮浇次数
      wateredBy: [],          // 今天哪些邻居来帮我浇过（防重复彩蛋提示）
      visitStreak: 0,          // 连续拜访天数
      lastVisitDate: "",      // 最近一次拜访的日期键
    },
    community: {
      joined: false,
      name: "暖阳社区",
      role: "成员",
      stage: 1,
      progress: 0,
      weekly: {
        week: "",             // 当前周键（weekKey），跨周清零
        contribution: 0,      // 本周我的捐献贡献
      },
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
    // 养殖栏：owned 是已购买的动物 id 列表，
    // animals.<id> = { fedAt, lastCollectAt } 记录喂食和收取指针
    ranch: {
      owned: [],
      animals: {},
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
    // 图鉴：收录过的条目（收获过的作物、拥有过的家具、钓到过的鱼）
    // "拥有过"意味着卖出/消耗后图鉴仍保留收录记录
    codex: {
      crops: [],       // 收获过的作物 id
      furniture: [],   // 拥有过的家具 id
      fishes: [],      // 钓到过的鱼 id
      claimedTiers: [], // 已领取的图鉴收集档奖励
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
  // 地块数量：基础 12 块之上，买过几档扩建就扩到几块（上限 maxPlots）
  if (!Array.isArray(state.farm.expansions)) {
    state.farm.expansions = [];
  }
  const boughtPlots = state.farm.expansions
    .map((tier) => GAME_CONFIG.farm.expansions.find((e) => e.plots === tier)?.plots || 0)
    .filter((plots) => plots > 0);
  const plotCount = Math.min(
    GAME_CONFIG.farm.maxPlots,
    Math.max(GAME_CONFIG.farm.basePlots, boughtPlots.length ? Math.max(...boughtPlots) : 0)
  );
  if (!Array.isArray(state.farm.plots)) {
    state.farm.plots = Array.from({ length: plotCount }, () => null);
  } else if (state.farm.plots.length < plotCount) {
    // 扩建或迁移时补齐新地块，保留已种作物
    state.farm.plots = [
      ...state.farm.plots,
      ...Array.from({ length: plotCount - state.farm.plots.length }, () => null),
    ];
  } else if (state.farm.plots.length > plotCount) {
    // 超出的地块一律没种东西才截断，防丢玩家作物
    state.farm.plots = state.farm.plots.slice(0, plotCount);
  }

  if (!state.farm.goldStats) {
    state.farm.goldStats = { totalGold: 0 };
  }

  // 养殖栏：v8 新增，已最新版本的存档也在这里兜底形状
  if (!state.ranch || !Array.isArray(state.ranch.owned)) {
    state.ranch = { owned: [], animals: {} };
  }
  if (!state.ranch.animals || typeof state.ranch.animals !== 'object') {
    state.ranch.animals = {};
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
