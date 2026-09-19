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
