// 存档版本迁移测试
//
// 验证：老存档在任何历史版本下加载后都能追上 CURRENT_VERSION，
// 且新字段都有默认值，不会因为缺字段而让后续系统崩溃。
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { GAME_CONFIG } from '../src/config/constants.js';

// 模拟一个 v4 时期的老存档（没有 v5 的新字段）
function v4Save() {
  const state = createDefaultState();
  state.version = 4;
  delete state.farm.expansions;
  delete state.farm.goldStats;
  state.user.created = true;
  state.wallet.coin = 500;
  return state;
}

// 模拟一个连 version 字段都没有的远古存档
function ancientSave() {
  const state = createDefaultState();
  delete state.version;
  // 远古存档常见问题：农田块数不足、地块上还挂着旧假作物
  state.farm.plots = state.farm.plots.slice(0, 6);
  state.farm.plots[0] = { cropId: 1009, plantedAt: new Date().toISOString(), growTime: 0 };
  return state;
}

describe('存档版本迁移', () => {
  it('默认存档版本就是当前版本', () => {
    expect(CURRENT_VERSION).toBeGreaterThan(4);
    expect(createDefaultState().version).toBe(CURRENT_VERSION);
  });

  it('v4 老存档迁移后追上当前版本，且玩家数据保留', () => {
    const saved = v4Save();
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.wallet.coin).toBe(500);
    expect(merged.user.created).toBe(true);
  });

  it('迁移链会为 v5 新字段补默认值', () => {
    const merged = mergeState(createDefaultState(), v4Save());
    migrateState(merged);

    expect(Array.isArray(merged.farm.expansions)).toBe(true);
    expect(merged.farm.goldStats).toEqual({ totalGold: 0 });
  });

  it('没有 version 的远古存档按 0 处理，走完整个迁移链', () => {
    const saved = ancientSave();
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(CURRENT_VERSION);
    // normalizeState 在迁移中生效：地块数组含末尾 6 块温室、假作物被清理并退款
    expect(merged.farm.plots).toHaveLength(GAME_CONFIG.farm.maxPlots + 6);
    expect(merged.farm.plots[0]).toBeNull();
  });

  it('比当前版本更新的存档只做形状校验，不降级', () => {
    const state = createDefaultState();
    state.version = CURRENT_VERSION + 3;
    migrateState(state);

    expect(state.version).toBe(CURRENT_VERSION + 3);
  });

  it('已是最新版本的存档重复迁移是幂等的', () => {
    const first = mergeState(createDefaultState(), v4Save());
    migrateState(first);
    const coin = first.wallet.coin;

    migrateState(first); // 第二次迁移不应该再改任何东西
    expect(first.wallet.coin).toBe(coin);
    expect(first.version).toBe(CURRENT_VERSION);
  });

  it('v10 老存档迁移后补上 hybrid.discovered', () => {
    const saved = createDefaultState();
    saved.version = 10;
    delete saved.hybrid; // v10 时期还没有杂交工坊
    saved.user.created = true;

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(CURRENT_VERSION);
    expect(Array.isArray(merged.hybrid.discovered)).toBe(true);
    expect(merged.hybrid.discovered).toHaveLength(0);
  });
});
