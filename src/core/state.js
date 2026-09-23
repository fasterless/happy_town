// 状态管理核心模块
import { avatars, INITIAL_RESOURCES, GAME_CONFIG } from '../config/constants.js';
import { defaultFriends } from '../config/npcs.js';
import { todayKey } from '../utils/time.js';
import { furnitureKey } from '../utils/format.js';
import { initNeighborEvents } from '../systems/events.js';

// 当前存档结构版本：每次给 state 增加新字段时 +1，并在 core/migrations.js 里补一条迁移
export const CURRENT_VERSION = 15;

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
    // 后山矿洞：镐等级 + 每日体力 + 矿藏收藏册
    mine: {
      pickLevel: 1,        // 镐等级（1-5），决定体力上限与矿层深度
      staminaDate: "",     // 体力所在的日期键，跨天归零
      staminaUsed: 0,      // 今天已消耗的体力
      totalDigs: 0,        // 累计下矿次数
      found: [],           // 挖到过的矿石/宝石键（曾经拥有语义，收藏册用）
    },
    // 宝石护符：owned 是已做成的护符 id，equipped 是当前装备的那一枚
    charms: {
      owned: [],
      equipped: null,
    },
    // 天赋树：unlocked 是已点亮的节点 id（天赋点由等级推导，不单独存）
    talents: {
      unlocked: [],
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
    // 小镇集市：NPC 买家对每种作物的需求热度（价格倍率的种子）
    // demand.<cropId> 是 0-100 的热度，越高挂单价越好，每天轮换
    market: {
      date: "",            // 热度所在的日期键，跨天轮换
      demand: {},          // cropId -> 热度 0-100
      listedToday: {},     // 今天已挂售的作物数量（吃供给压价）
    },
    // 杂交工坊：已解锁的杂交配方 id（hybrid_<id> 库存键的作物）
    hybrid: {
      discovered: [],
    },
    // 小镇委托榜：今日委托 id 与当天已完成的委托
    commissions: {
      date: "",            // 委托榜所在的日期键，跨天重抽
      jobIds: [],          // 今日委托 id 列表
      doneIds: [],         // 今天已交过的委托 id
    },
    // 料理铺：当前生效的增益（同一时刻只有一个，后吃的覆盖先吃的）
    buff: {
      active: null,        // { dishId, type, value, expireAt }
    },
    // 邻居求助板：今日求助、当天已帮过的邻居、各位邻居的人情计数
    help: {
      date: "",            // 求助榜所在的日期键，跨天重抽
      requests: [],        // [{ friendId, item, name, icon, count, point }]
      doneIds: {},         // friendId -> 今天是否已帮过他（日期键）
      favors: {},          // friendId -> { date, count } 当日人情计数
    },
    // 许愿池：今天许的愿等明天结算，heat 是连续许愿天数
    wish: {
      date: "",            // 可选心愿所在的日期键
      pickedIds: [],       // 今天可选的三个心愿 id
      rerolled: 0,         // 今天刷新过几次
      wishedDate: "",      // 许愿的日期键（用于判断是否已许 / 是否跨日）
      pendingId: null,     // 等着结算的心愿 id
      heat: 0,             // 心愿热度（连续许愿天数，断签归零）
      lastSettleDate: "",  // 上次结算的日期键（幂等保护）
      lastLuck: 0,         // 上一次的运势，界面展示用
      lastTier: "",        // 上一次的奖励档位
      totalSettled: 0,     // 累计结算次数
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
    mine: { ...base.mine, ...(saved.mine || {}) },
    charms: { ...base.charms, ...(saved.charms || {}) },
    talents: { ...base.talents, ...(saved.talents || {}) },
    lottery: { ...base.lottery, ...(saved.lottery || {}) },
    seasons: { ...base.seasons, ...(saved.seasons || {}) },
    npcEvents: { ...base.npcEvents, ...(saved.npcEvents || {}) },
    achievements: { ...base.achievements, ...(saved.achievements || {}) },
    pets: { ...base.pets, ...(saved.pets || {}) },
    weather: { ...base.weather, ...(saved.weather || {}) },
    settings: { ...base.settings, ...(saved.settings || {}) },
    analytics: { ...base.analytics, ...(saved.analytics || {}) },
    commissions: { ...base.commissions, ...(saved.commissions || {}) },
    buff: { ...base.buff, ...(saved.buff || {}) },
    wish: { ...base.wish, ...(saved.wish || {}) },
    help: { ...base.help, ...(saved.help || {}) },
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

  // 后山矿洞（v13）
  if (!state.mine || typeof state.mine !== "object") {
    state.mine = { pickLevel: 1, staminaDate: "", staminaUsed: 0, totalDigs: 0, found: [] };
  }
  if (typeof state.mine.pickLevel !== "number" || state.mine.pickLevel < 1) state.mine.pickLevel = 1;
  if (state.mine.pickLevel > 5) state.mine.pickLevel = 5;
  if (typeof state.mine.staminaDate !== "string") state.mine.staminaDate = "";
  if (typeof state.mine.staminaUsed !== "number") state.mine.staminaUsed = 0;
  if (typeof state.mine.totalDigs !== "number") state.mine.totalDigs = 0;
  if (!Array.isArray(state.mine.found)) state.mine.found = [];

  // 宝石护符（v14）
  if (!state.charms || typeof state.charms !== "object") {
    state.charms = { owned: [], equipped: null };
  }
  if (!Array.isArray(state.charms.owned)) state.charms.owned = [];
  if (typeof state.charms.equipped !== "number") state.charms.equipped = null;

  // 天赋树（v15）
  if (!state.talents || typeof state.talents !== "object") {
    state.talents = { unlocked: [] };
  }
  if (!Array.isArray(state.talents.unlocked)) state.talents.unlocked = [];
  if (typeof state.lottery.pity !== "number") state.lottery.pity = 0;
  if (typeof state.lottery.spins !== "number") state.lottery.spins = 0;
  if (typeof state.seasons.claimedEventId !== "string") state.seasons.claimedEventId = "";

  // 委托榜 / 料理增益 / 许愿池（v12）
  if (!state.commissions || typeof state.commissions !== "object") {
    state.commissions = { date: "", jobIds: [], doneIds: [] };
  }
  if (!Array.isArray(state.commissions.jobIds)) state.commissions.jobIds = [];
  if (!Array.isArray(state.commissions.doneIds)) state.commissions.doneIds = [];
  if (typeof state.commissions.date !== "string") state.commissions.date = "";

  if (!state.buff || typeof state.buff !== "object") {
    state.buff = { active: null };
  }
  // 过期（或损坏）的增益直接清掉
  if (state.buff.active && (!state.buff.active.expireAt || state.buff.active.expireAt <= Date.now())) {
    state.buff.active = null;
  }

  if (!state.wish || typeof state.wish !== "object") {
    state.wish = {
      date: "", pickedIds: [], rerolled: 0, wishedDate: "", pendingId: null,
      heat: 0, lastSettleDate: "", lastLuck: 0, lastTier: "", totalSettled: 0,
    };
  }
  if (!Array.isArray(state.wish.pickedIds)) state.wish.pickedIds = [];
  if (typeof state.wish.heat !== "number") state.wish.heat = 0;
  if (typeof state.wish.wishedDate !== "string") state.wish.wishedDate = "";
  if (typeof state.wish.lastSettleDate !== "string") state.wish.lastSettleDate = "";
  if (typeof state.wish.totalSettled !== "number") state.wish.totalSettled = 0;

  // 邻居求助板（v12）
  if (!state.help || typeof state.help !== "object") {
    state.help = { date: "", requests: [], doneIds: {}, favors: {} };
  }
  if (!Array.isArray(state.help.requests)) state.help.requests = [];
  if (!state.help.doneIds || typeof state.help.doneIds !== "object") state.help.doneIds = {};
  if (!state.help.favors || typeof state.help.favors !== "object") state.help.favors = {};

  initNeighborEvents(state);

  state.version = CURRENT_VERSION;
  return state;
}
