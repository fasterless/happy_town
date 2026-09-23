// 存档版本迁移模块
//
// 每次给 state 增加新字段/新结构时：
//   1. 把 CURRENT_VERSION 加一，并在 createDefaultState 里带上新字段的默认值；
//   2. 在 MIGRATIONS 末尾追加一条 { fromVersion: <旧版本号>, migrate(state) }。
//
// 迁移链按 fromVersion 升序排列，migrateState 从存档自带的 version 开始
// 依次执行，直到追上 CURRENT_VERSION。这样旧存档永远不会因为缺字段而崩溃。
import { normalizeState, CURRENT_VERSION } from './state.js';

/**
 * v4 之前的存档没有 version 字段，按 0 处理，先对齐到 v4 基线。
 * （v4 基线的修补逻辑历史上写在 normalizeState 里，继续复用它。）
 */
function toV4(state) {
  normalizeState(state);
  state.version = 4;
}

// 有序迁移链：索引 i 的迁移把存档从 fromVersion 升到 fromVersion + 1
const MIGRATIONS = [
  { fromVersion: 4, migrate: toV5 },
  { fromVersion: 5, migrate: toV6 },
  { fromVersion: 6, migrate: toV7 },
  { fromVersion: 7, migrate: toV8 },
  { fromVersion: 8, migrate: toV9 },
  { fromVersion: 9, migrate: toV10 },
  { fromVersion: 10, migrate: toV11 },
  { fromVersion: 11, migrate: toV12 },
  { fromVersion: 12, migrate: toV13 },
  { fromVersion: 13, migrate: toV14 },
  { fromVersion: 14, migrate: toV15 },
  { fromVersion: 15, migrate: toV16 },
  { fromVersion: 16, migrate: toV17 },
  { fromVersion: 17, migrate: toV18 },
  { fromVersion: 18, migrate: toV19 },
  { fromVersion: 19, migrate: toV20 },
];

/**
 * v4 → v5：为第二阶段的新玩法预埋字段。
 * （土地扩展、金色品质、畜牧系统等会在这里追加具体逻辑）
 */
function toV5(state) {
  // 土地扩展：标记各档农田规模是否已购买（v5 之前最高 3x3=9 块已解锁）
  if (!state.farm) state.farm = {};
  if (!Array.isArray(state.farm.expansions)) {
    state.farm.expansions = [];
  }
  // 金色品质作物：收获暴击的累计统计
  if (!state.farm.goldStats) {
    state.farm.goldStats = { totalGold: 0 };
  }
  state.version = 5;
}

function toV6(state) {           // v5 → v6：订单深化（限时/连锁/预购）
  if (!state.orders) state.orders = {};
  if (!('rush' in state.orders)) state.orders.rush = null;
  if (typeof state.orders.rushFinishedToday !== 'string') state.orders.rushFinishedToday = '';
  if (typeof state.orders.chainType !== 'string') state.orders.chainType = '';
  if (typeof state.orders.chainCount !== 'number') state.orders.chainCount = 0;
  if (!('reservedId' in state.orders)) state.orders.reservedId = null;
  if (typeof state.orders.reservedPaidAt !== 'string') state.orders.reservedPaidAt = '';
  state.version = 6;
}

function toV7(state) {           // v6 → v7：好友帮浇 / 拜访连击 / 每周社区贡献榜
  if (!state.social) {
    state.social = {
      waterDate: "",
      waterUsed: 0,
      wateredBy: [],
      visitStreak: 0,
      lastVisitDate: "",
    };
  }
  if (!state.community) state.community = {};
  if (!state.community.weekly) {
    state.community.weekly = { week: "", contribution: 0 };
  }
  state.version = 7;
}

function toV8(state) {           // v7 → v8：养殖栏
  if (!state.ranch || !Array.isArray(state.ranch.owned)) {
    state.ranch = { owned: [] };
  }
  if (!state.ranch.animals || typeof state.ranch.animals !== 'object') {
    state.ranch.animals = {};
  }
  state.version = 8;
}

function toV9(state) {           // v8 → v9：图鉴系统
  if (!state.codex) {
    state.codex = { crops: [], furniture: [], fishes: [], claimedTiers: [] };
  }
  ['crops', 'furniture', 'fishes', 'claimedTiers'].forEach((key) => {
    if (!Array.isArray(state.codex[key])) state.codex[key] = [];
  });
  state.version = 9;
}

function toV10(state) {          // v9 → v10：小镇集市
  if (!state.market) {
    state.market = { date: '', demand: {}, listedToday: {} };
  }
  if (typeof state.market.date !== 'string') state.market.date = '';
  if (!state.market.demand || typeof state.market.demand !== 'object') state.market.demand = {};
  if (!state.market.listedToday || typeof state.market.listedToday !== 'object') state.market.listedToday = {};
  state.version = 10;
}

function toV11(state) {          // v10 → v11：杂交工坊
  if (!state.hybrid || !Array.isArray(state.hybrid.discovered)) {
    state.hybrid = { discovered: [] };
  }
  state.version = 11;
}

function toV12(state) {          // v11 → v12：委托榜 / 料理铺 / 许愿池
  if (!state.commissions || !Array.isArray(state.commissions.jobIds)) {
    state.commissions = { date: "", jobIds: [], doneIds: [] };
  }
  if (!Array.isArray(state.commissions.doneIds)) state.commissions.doneIds = [];
  if (!state.buff || typeof state.buff !== 'object') {
    state.buff = { active: null };
  }
  if (!state.wish || typeof state.wish !== 'object') {
    state.wish = {
      date: "", pickedIds: [], rerolled: 0, wishedDate: "", pendingId: null,
      heat: 0, lastSettleDate: "", lastLuck: 0, lastTier: "", totalSettled: 0,
    };
  }
  if (!Array.isArray(state.wish.pickedIds)) state.wish.pickedIds = [];
  if (typeof state.wish.heat !== 'number') state.wish.heat = 0;
  if (!state.help || typeof state.help !== 'object') {
    state.help = { date: '', requests: [], doneIds: {}, favors: {} };
  }
  if (!Array.isArray(state.help.requests)) state.help.requests = [];
  state.version = 12;
}

function toV13(state) {          // v12 → v13：后山矿洞
  if (!state.mine || typeof state.mine !== 'object') {
    state.mine = { pickLevel: 1, staminaDate: '', staminaUsed: 0, totalDigs: 0, found: [] };
  }
  if (typeof state.mine.pickLevel !== 'number' || state.mine.pickLevel < 1) state.mine.pickLevel = 1;
  if (!Array.isArray(state.mine.found)) state.mine.found = [];
  state.version = 13;
}

function toV14(state) {          // v13 → v14：宝石护符
  if (!state.charms || typeof state.charms !== 'object') {
    state.charms = { owned: [], equipped: null };
  }
  if (!Array.isArray(state.charms.owned)) state.charms.owned = [];
  if (typeof state.charms.equipped !== 'number') state.charms.equipped = null;
  state.version = 14;
}

function toV15(state) {          // v14 → v15：天赋树
  if (!state.talents || typeof state.talents !== 'object') {
    state.talents = { unlocked: [] };
  }
  if (!Array.isArray(state.talents.unlocked)) state.talents.unlocked = [];
  state.version = 15;
}

function toV16(state) {          // v15 → v16：温室大棚
  if (!state.greenhouse || typeof state.greenhouse !== 'object') {
    state.greenhouse = { date: '', usedToday: [], totalPlanted: 0 };
  }
  if (typeof state.greenhouse.date !== 'string') state.greenhouse.date = '';
  if (!Array.isArray(state.greenhouse.usedToday)) state.greenhouse.usedToday = [];
  if (typeof state.greenhouse.totalPlanted !== 'number') state.greenhouse.totalPlanted = 0;
  state.version = 16;
}

function toV17(state) {          // v16 → v17：咖啡馆
  if (!state.cafe || typeof state.cafe !== 'object') {
    state.cafe = { date: '', guests: [], totalServed: 0, totalTips: 0 };
  }
  if (typeof state.cafe.date !== 'string') state.cafe.date = '';
  if (!Array.isArray(state.cafe.guests)) state.cafe.guests = [];
  if (typeof state.cafe.totalServed !== 'number') state.cafe.totalServed = 0;
  if (typeof state.cafe.totalTips !== 'number') state.cafe.totalTips = 0;
  state.version = 17;
}

function toV18(state) {          // v17 → v18：小镇剧情
  if (!state.story || typeof state.story !== 'object') {
    state.story = { chapterIndex: 0 };
  }
  if (typeof state.story.chapterIndex !== 'number' || state.story.chapterIndex < 0) {
    state.story.chapterIndex = 0;
  }
  state.version = 18;
}

function toV20(state) {          // v19 → v20：邻居每日日程
  if (!state.schedules || typeof state.schedules !== 'object') {
    state.schedules = { date: '', today: {} };
  }
  if (typeof state.schedules.date !== 'string') state.schedules.date = '';
  if (!state.schedules.today || typeof state.schedules.today !== 'object') state.schedules.today = {};
  state.version = 20;
}

function toV19(state) {          // v18 → v19：称号与头像框
  if (!state.cosmetics || typeof state.cosmetics !== 'object') {
    state.cosmetics = { equippedTitle: null, equippedFrame: null };
  }
  if (typeof state.cosmetics.equippedTitle !== 'string') state.cosmetics.equippedTitle = null;
  if (typeof state.cosmetics.equippedFrame !== 'string') state.cosmetics.equippedFrame = null;
  state.version = 19;
}

/**
 * 把任意旧版本存档迁移到最新版本
 * @param {Object} state - 合并默认值之后的存档
 * @returns {Object} 迁移后的 state
 */
export function migrateState(state) {
  let version = typeof state.version === 'number' ? state.version : 0;

  // 比当前版本还新的存档（比如玩家回滚客户端）：只做形状校验不降级
  if (version >= CURRENT_VERSION) {
    normalizeState(state);
    state.version = version;
    return state;
  }

  // 没有 version 的远古存档：先对齐到 v4 基线
  if (version < 4) {
    toV4(state);
    version = 4;
  }

  MIGRATIONS.forEach(({ fromVersion, migrate }) => {
    if (version === fromVersion) {
      migrate(state);
      version++;
    }
  });

  // 链条没走完（版本号跳跃或损坏）时兜底校验一次
  if (state.version !== CURRENT_VERSION) {
    normalizeState(state);
    state.version = CURRENT_VERSION;
  }
  return state;
}
