// 第七轮玩法 1/3：天赋树
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, normalizeState } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { levels } from '../src/config/levels.js';
import { talentNodes } from '../src/config/talents.js';
import {
  isTalentsUnlocked, unlockTalent, getTalentMultiplier, getTalentPointsLeft,
  getTalentBoard, getTotalTalentPoints,
} from '../src/systems/talents.js';
import { getGrowTime, harvestCrop } from '../src/systems/farm.js';
import { getOrderCoinReward } from '../src/systems/orders.js';
import { startCrafting } from '../src/systems/crafting.js';
import { getCrop } from '../src/config/crops.js';
import { getOrder } from '../src/config/orders.js';
import { getRecipe } from '../src/config/crafting.js';

function freshState(level = 16) {
  const state = createDefaultState();
  state.user.created = true;
  // 等级由经验推导，只写 level 不给经验会被发经验的操作打回 1 级
  const tier = levels.filter((lv) => lv.level <= level).at(-1);
  state.wallet.exp = tier ? tier.needExp : 0;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  return state;
}

describe('天赋树', () => {
  it('Lv.5 解锁，Lv.4 锁定', () => {
    expect(isTalentsUnlocked(freshState(4))).toBe(false);
    expect(isTalentsUnlocked(freshState(5))).toBe(true);
  });

  it('天赋点随等级增长：Lv.5 有 6 点', () => {
    expect(getTotalTalentPoints(freshState(5))).toBe(6);
    expect(getTalentPointsLeft(freshState(5))).toBe(6);
    expect(getTotalTalentPoints(freshState(20))).toBe(21);
  });

  it('未解锁时点不了', () => {
    const state = freshState(4);
    const result = unlockTalent(state, 'farm_1');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.5');
    expect(state.talents.unlocked).toHaveLength(0);
  });

  it('必须按分支顺序点，跳着点会被拒且不扣点', () => {
    const state = freshState(10);
    const result = unlockTalent(state, 'farm_2');
    expect(result.success).toBe(false);
    expect(result.message).toContain('勤浇灌');
    expect(getTalentPointsLeft(state)).toBe(getTotalTalentPoints(state));
  });

  it('点亮后扣点、加成生效、不能重复点', () => {
    const state = freshState(5);
    const before = getTalentPointsLeft(state);

    const result = unlockTalent(state, 'farm_1');
    expect(result.success).toBe(true);
    expect(state.talents.unlocked).toContain('farm_1');
    expect(getTalentPointsLeft(state)).toBe(before - 1);
    expect(state.daily.progress.talent).toBe(1);
    expect(getTalentMultiplier(state, 'growthSpeed')).toBeCloseTo(1.05);

    // 重复点亮不扣点
    expect(unlockTalent(state, 'farm_1').success).toBe(false);
    expect(getTalentPointsLeft(state)).toBe(before - 1);
  });

  it('同类型节点的加成叠乘', () => {
    const state = freshState(10);
    unlockTalent(state, 'farm_1');
    unlockTalent(state, 'farm_2');
    unlockTalent(state, 'farm_3');
    // 勤浇灌 1.05 × 沃土 1.08
    expect(getTalentMultiplier(state, 'growthSpeed')).toBeCloseTo(1.05 * 1.08);
    // 好收成单独 1.05
    expect(getTalentMultiplier(state, 'harvestBonus')).toBeCloseTo(1.05);
    // 没点的类型不受影响
    expect(getTalentMultiplier(state, 'orderBonus')).toBe(1);
  });

  it('点数不够时点不了高阶节点', () => {
    const state = freshState(5); // 6 点
    unlockTalent(state, 'fish_1'); // 1
    unlockTalent(state, 'fish_2'); // 1
    unlockTalent(state, 'fish_3'); // 2
    unlockTalent(state, 'fish_4'); // 2，花光
    expect(getTalentPointsLeft(state)).toBe(0);

    const result = unlockTalent(state, 'farm_1');
    expect(result.success).toBe(false);
    expect(result.message).toContain('天赋点不够');
  });

  it('面板标注已点亮与可点亮', () => {
    const state = freshState(5);
    unlockTalent(state, 'mine_1');

    const board = getTalentBoard(state);
    const mine = board.find((row) => row.branch.id === 'mine');
    expect(mine.nodes[0].unlocked).toBe(true);
    expect(mine.nodes[1].available).toBe(true);
    expect(mine.nodes[2].available).toBe(false); // 前置没点

    const farm = board.find((row) => row.branch.id === 'farm');
    expect(farm.nodes[0].unlocked).toBe(false);
    expect(farm.nodes[0].available).toBe(true);
  });

  it('点满一条分支达成「一门精通」，点满全部达成「全知全能」', () => {
    const state = freshState(20); // 21 点，全部节点合计 30 点，所以直接写入
    state.talents.unlocked = talentNodes
      .filter((node) => node.branch === 'farm')
      .map((node) => node.id);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('talent_branch');
    expect(state.achievements.unlocked).not.toContain('talent_all');

    state.talents.unlocked = talentNodes.map((node) => node.id);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('talent_all');
  });

  it('点亮第一个天赋达成「初窥门径」', () => {
    const state = freshState(5);
    unlockTalent(state, 'order_1');
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('talent_first');
  });
});

describe('天赋加成接入', () => {
  it('田园天赋让作物长得更快', () => {
    const state = freshState(10);
    const crop = getCrop(1001);
    const base = getGrowTime(state, crop);

    unlockTalent(state, 'farm_1'); // 生长 ×1.05
    const faster = getGrowTime(state, crop);
    expect(faster).toBeLessThan(base);
    expect(faster).toBe(Math.max(1, Math.floor(base / 1.05)));
  });

  it('田园天赋让收获产量 +5%', () => {
    const state = freshState(10);
    unlockTalent(state, 'farm_1');
    unlockTalent(state, 'farm_2'); // 产量 ×1.05

    const rice = getCrop(1006);
    const original = rice.harvestCount;
    rice.harvestCount = 20; // 20 × 1.05 = 21

    state.farm.plots[0] = {
      cropId: 1006,
      plantedAt: new Date(Date.now() - 86_400_000).toISOString(),
      growTime: 1,
    };
    const result = harvestCrop(state, 0);
    rice.harvestCount = original;

    expect(result.success).toBe(true);
    expect(state.inventory.crop_1006).toBe(21);
  });

  it('集市天赋让订单金币变多', () => {
    const state = freshState(10);
    const order = getOrder(2001);
    const base = getOrderCoinReward(state, order);

    unlockTalent(state, 'order_1'); // ×1.05
    const boosted = getOrderCoinReward(state, order);
    expect(boosted).toBeGreaterThan(base);
    expect(boosted).toBe(Math.round(base * 1.05));
  });

  it('匠心天赋缩短加工时间', () => {
    const state = freshState(12);
    const recipe = getRecipe(5001);
    state.inventory.crop_1001 = recipe.requires[0].count * 2;

    startCrafting(state, 5001);
    const baseTime = state.crafting.queue[0].time;

    unlockTalent(state, 'craft_1'); // ×0.95
    startCrafting(state, 5001);
    const fasterTime = state.crafting.queue[1].time;

    expect(fasterTime).toBeLessThan(baseTime);
    expect(fasterTime).toBe(Math.max(30, Math.floor(baseTime * 0.95)));
  });
});

describe('存档迁移 v15', () => {
  it('v14 老存档迁移后补上 talents 且护符保留', () => {
    const saved = createDefaultState();
    saved.version = 14;
    delete saved.talents;
    saved.charms.owned = [8001];
    saved.charms.equipped = 8001;

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(15);
    expect(merged.charms.owned).toContain(8001);
    expect(merged.charms.equipped).toBe(8001);
    expect(Array.isArray(merged.talents.unlocked)).toBe(true);
  });

  it('损坏的 talents 形状被 normalizeState 修好', () => {
    const state = createDefaultState();
    state.talents = { unlocked: '坏掉了' };
    normalizeState(state);
    expect(Array.isArray(state.talents.unlocked)).toBe(true);
    expect(state.talents.unlocked).toHaveLength(0);
  });
});
