// 第七轮玩法 2/3：温室大棚
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, normalizeState } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { levels } from '../src/config/levels.js';
import { getCrop } from '../src/config/crops.js';
import { plantCrop, getGrowTime, harvestCrop } from '../src/systems/farm.js';
import {
  isGreenhouseUnlocked, getGreenhouseUsedToday, GREENHOUSE_FIRST_INDEX, GREENHOUSE_PLOTS,
} from '../src/systems/greenhouse.js';

const FIRST = GREENHOUSE_FIRST_INDEX;
const STRAWBERRY = 1301;

function freshState(level = 16) {
  const state = createDefaultState();
  state.user.created = true;
  const tier = levels.filter((lv) => lv.level <= level).at(-1);
  state.wallet.exp = tier ? tier.needExp : 0;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  return state;
}

describe('温室大棚', () => {
  it('Lv.9 解锁，Lv.8 锁定', () => {
    expect(isGreenhouseUnlocked(freshState(8))).toBe(false);
    expect(isGreenhouseUnlocked(freshState(9))).toBe(true);
  });

  it('地块数组固定 27 格，温室占末尾 6 格', () => {
    const state = freshState();
    expect(state.farm.plots).toHaveLength(27);
    expect(FIRST).toBe(21);
    expect(GREENHOUSE_PLOTS).toBe(6);
  });

  it('温室作物不花金币，种下后记入今日额度', () => {
    const state = freshState(9);
    const before = state.wallet.coin;

    const result = plantCrop(state, FIRST, STRAWBERRY);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(before);
    expect(state.farm.plots[FIRST].cropId).toBe(STRAWBERRY);
    expect(getGreenhouseUsedToday(state)).toContain(FIRST);
    expect(state.daily.progress.greenhouse).toBe(1);
    expect(state.analytics.greenhouse_plant).toBe(1);
  });

  it('同一块温室地一天只能种一次', () => {
    const state = freshState(9);
    plantCrop(state, FIRST, STRAWBERRY);
    // 收掉再种，当天额度仍在
    state.farm.plots[FIRST].plantedAt = new Date(Date.now() - 86_400_000).toISOString();
    expect(harvestCrop(state, FIRST).success).toBe(true);

    const again = plantCrop(state, FIRST, STRAWBERRY);
    expect(again.success).toBe(false);
    expect(again.message).toContain('今天已经种过');
    expect(state.farm.plots[FIRST]).toBeNull();
  });

  it('六块地各自独立计算每日额度', () => {
    const state = freshState(9);
    expect(plantCrop(state, FIRST, STRAWBERRY).success).toBe(true);
    expect(plantCrop(state, FIRST + 1, STRAWBERRY).success).toBe(true);
    expect(getGreenhouseUsedToday(state)).toHaveLength(2);
  });

  it('等级不够的温室作物种不了', () => {
    const state = freshState(9);
    const result = plantCrop(state, FIRST, 1305); // 温室南瓜要 Lv.14
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.14');
    expect(getGreenhouseUsedToday(state)).toHaveLength(0);
  });

  it('温室不受天气影响，农田照常受影响', () => {
    const state = freshState(9);
    state.weather.current = 'rainy';
    const crop = getCrop(STRAWBERRY);

    const indoors = getGrowTime(state, crop, FIRST);
    const outdoors = getGrowTime(state, crop);
    // 雨天 1.2 倍速只作用在室外
    expect(indoors).toBe(crop.growTime);
    expect(outdoors).toBeLessThan(indoors);
  });

  it('温室作物能收获、能卖', () => {
    const state = freshState(9);
    plantCrop(state, FIRST, STRAWBERRY);
    state.farm.plots[FIRST].plantedAt = new Date(Date.now() - 86_400_000).toISOString();

    const result = harvestCrop(state, FIRST);
    expect(result.success).toBe(true);
    expect(state.inventory.crop_1301).toBeGreaterThan(0);
    expect(state.farm.plots[FIRST]).toBeNull();
  });

  it('种下第一株达成「第一株温室苗」', () => {
    const state = freshState(9);
    plantCrop(state, FIRST, STRAWBERRY);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('greenhouse_first');
  });

  it('累计种植 30 次达成「四季常青」', () => {
    const state = freshState(9);
    state.analytics.greenhouse_plant = 30;
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('greenhouse_30');
  });
});

describe('存档迁移 v16', () => {
  it('v15 老存档迁移后补上 greenhouse 且天赋保留', () => {
    const saved = createDefaultState();
    saved.version = 15;
    delete saved.greenhouse;
    saved.talents.unlocked = ['farm_1'];

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(17);
    expect(merged.talents.unlocked).toContain('farm_1');
    expect(Array.isArray(merged.greenhouse.usedToday)).toBe(true);
    expect(merged.greenhouse.totalPlanted).toBe(0);
    expect(merged.farm.plots).toHaveLength(27);
  });

  it('损坏的 greenhouse 形状被 normalizeState 修好', () => {
    const state = createDefaultState();
    state.greenhouse = { date: 5, usedToday: '坏掉了', totalPlanted: '不是数字' };
    normalizeState(state);
    expect(state.greenhouse.date).toBe('');
    expect(Array.isArray(state.greenhouse.usedToday)).toBe(true);
    expect(state.greenhouse.totalPlanted).toBe(0);
  });
});
