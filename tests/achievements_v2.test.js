// 第三阶段成就扩展：56 项成就、分类分组、全部 trackKey 可解析
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { achievements, checkAchievements, getAchievementProgressPercent } from '../src/systems/achievements.js';
import { craftingRecipes } from '../src/config/crafting.js';
import { furniture } from '../src/config/furniture.js';
import { crops } from '../src/config/crops.js';
import { fishes } from '../src/systems/fishing.js';

function freshState() {
  const state = createDefaultState();
  state.user.created = true;
  return state;
}

describe('成就配置完整性', () => {
  it('成就数量达到 50+', () => {
    expect(achievements.length).toBeGreaterThanOrEqual(50);
  });

  it('id 唯一、奖励非空、目标为正数', () => {
    const ids = achievements.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    achievements.forEach((a) => {
      expect(a.target).toBeGreaterThan(0);
      expect(a.rewards).toBeTruthy();
      expect(Object.keys(a.rewards).length).toBeGreaterThan(0);
      expect(a.icon).toBeTruthy();
    });
  });

  it('每个成就都有分类', () => {
    achievements.forEach((a) => expect(a.category).toBeTruthy());
  });

  it('奖励引用的物品键真实存在', () => {
    const known = new Set([
      'coin', 'diamond', 'friendPoint', 'speed_ticket', 'lottery_ticket',
      ...craftingRecipes.map((r) => r.result.key),
      ...furniture.map((f) => `f_${f.id}`),
      ...crops.map((c) => `crop_${c.id}`),
      ...fishes.map((f) => `fish_${f.id}`),
    ]);
    achievements.forEach((a) => {
      Object.keys(a.rewards).forEach((key) => {
        expect(known.has(key)).toBe(true);
      });
    });
  });

  it('默认状态跑一遍检查不崩（全部 trackKey 都可解析）', () => {
    const state = freshState();
    expect(() => checkAchievements(state)).not.toThrow();
    // 新号应该只解锁不了任何成就（friend_all 等也不该立即达成）
    const newly = checkAchievements(state);
    expect(newly).toHaveLength(0);
  });

  it('进度百分比对未解锁成就在 0-100 之间', () => {
    const state = freshState();
    achievements.forEach((a) => {
      const percent = getAchievementProgressPercent(state, a.id);
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    });
  });
});

describe('成就可以通过事件解锁', () => {
  it('收获 50 次解锁「初收喜悦」并发奖励', () => {
    const state = freshState();
    state.analytics.harvest_crop = 50;
    const before = state.wallet.coin;
    const unlocked = checkAchievements(state);
    expect(unlocked.some((a) => a.id === 'harvest_50')).toBe(true);
    expect(state.achievements.unlocked).toContain('harvest_50');
    expect(state.wallet.coin).toBe(before + 300);
  });

  it('金穗成就走 goldStats 通道', () => {
    const state = freshState();
    state.farm.goldStats.totalGold = 1;
    const unlocked = checkAchievements(state);
    expect(unlocked.some((a) => a.id === 'gold_crop_1')).toBe(true);
    expect(unlocked.some((a) => a.id === 'gold_crop_10')).toBe(false);
  });

  it('集齐三种动物解锁「牧场之家」', () => {
    const state = freshState();
    state.ranch.owned = ['chicken', 'sheep', 'cow'];
    const unlocked = checkAchievements(state);
    // ranch_all 走 owned.length 通道；ranch_first 走购买事件（ranch_buy），
    // 只改 owned 不算购买过，不会解锁——这是两个不同的统计口径
    expect(unlocked.some((a) => a.id === 'ranch_all')).toBe(true);
    expect(unlocked.some((a) => a.id === 'ranch_first')).toBe(false);
  });
});
