// 第五轮玩法：杂交工坊
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { getCrop } from '../src/config/crops.js';
import { hybridRecipes } from '../src/config/hybrid.js';
import { crossbreed, canCrossbreed, isHybridUnlocked, getHybridStats } from '../src/systems/hybrid.js';
import { isHybridCrop, plantCrop, harvestCrop } from '../src/systems/farm.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  state.wallet.coin = 10000;
  return state;
}

// 给某配方备齐全部亲本材料
function prepare(state, recipe) {
  recipe.requires.forEach((req) => {
    state.inventory[req.item] = req.count;
  });
}

describe('杂交配置', () => {
  it('配方 id 唯一且不与现有作物冲突', () => {
    const ids = hybridRecipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => {
      expect(getCrop(id)).toBeTruthy(); // getCrop 能解析杂交 id
      expect(id).toBeGreaterThanOrEqual(1200);
      expect(id).toBeLessThan(1300); // 1200 段专属
    });
  });

  it('亲本材料都引用真实作物', () => {
    hybridRecipes.forEach((r) => {
      expect(r.requires.length).toBe(2);
      r.requires.forEach((req) => {
        const crop = getCrop(Number(req.item.replace('crop_', '')));
        expect(crop).toBeTruthy();
        expect(isHybridCrop(crop.id)).toBe(false); // 杂交作物不能再次杂交
      });
    });
  });
});

describe('杂交合成', () => {
  it('材料金币齐备时合成成功，给 2 粒种子', () => {
    const state = freshState();
    const recipe = hybridRecipes[0];
    prepare(state, recipe);
    const coinBefore = state.wallet.coin - recipe.coin;

    const result = crossbreed(state, recipe.id);
    expect(result.success).toBe(true);
    expect(result.firstTime).toBe(true);
    expect(state.inventory[`seed_${recipe.id}`]).toBe(2);
    expect(state.wallet.coin).toBe(coinBefore); // 扣了研究费
    expect(state.hybrid.discovered).toContain(recipe.id);
  });

  it('等级不足被拒', () => {
    const state = freshState(4); // 蜜糖番茄要 Lv.4，奶油草莓要 Lv.6
    const recipe = hybridRecipes[1];
    prepare(state, recipe);
    const result = crossbreed(state, recipe.id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.6');
    expect(state.inventory[`seed_${recipe.id}`]).toBeUndefined(); // 不发种子
  });

  it('亲本材料不足被拒且不扣任何东西', () => {
    const state = freshState();
    const recipe = hybridRecipes[0];
    state.inventory.crop_1001 = 2; // 差一个小麦
    state.inventory.crop_1002 = 3;
    const result = crossbreed(state, recipe.id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('材料');
    expect(state.wallet.coin).toBe(10000); // 研究费没扣
    expect(state.inventory.crop_1001).toBe(2);
    expect(state.hybrid.discovered).toHaveLength(0);
  });

  it('首次合成记入图谱，第二次不再算首次', () => {
    const state = freshState();
    const recipe = hybridRecipes[0];
    prepare(state, recipe);
    state.inventory[recipe.requires[0].item] = 99;
    state.inventory[recipe.requires[1].item] = 99;

    expect(crossbreed(state, recipe.id).firstTime).toBe(true);
    const second = crossbreed(state, recipe.id);
    expect(second.success).toBe(true);
    expect(second.firstTime).toBe(false);
    expect(getHybridStats(state)).toEqual({ discovered: 1, total: hybridRecipes.length });
  });

  it('canCrossbreed 与实际校验一致', () => {
    const state = freshState();
    const recipe = hybridRecipes[0];
    expect(canCrossbreed(state, recipe.id)).toBe(false); // 没材料
    prepare(state, recipe);
    expect(canCrossbreed(state, recipe.id)).toBe(true);
  });

  it('Lv.10 以下工坊整体未解锁', () => {
    expect(isHybridUnlocked(freshState(9))).toBe(false);
    expect(isHybridUnlocked(freshState(10))).toBe(true);
  });
});

describe('杂交作物的种植与收获', () => {
  it('有种子时种植扣种子不扣金币', () => {
    const state = freshState();
    state.inventory.seed_1201 = 2;

    const result = plantCrop(state, 0, 1201);
    expect(result.success).toBe(true);
    expect(state.inventory.seed_1201).toBe(1); // 扣种子
    expect(state.wallet.coin).toBe(10000); // 没扣金币
    expect(state.farm.plots[0].cropId).toBe(1201);
  });

  it('没种子时可以金币补种（补种价）', () => {
    const state = freshState();
    const seedPrice = hybridRecipes[0].seedPrice;

    const result = plantCrop(state, 0, 1201);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(10000 - seedPrice);
  });

  it('收获杂交作物入包、记图鉴、埋点', () => {
    const state = freshState();
    state.inventory.seed_1201 = 1;
    plantCrop(state, 0, 1201);

    // 直接拨到成熟
    state.farm.plots[0].plantedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    const result = harvestCrop(state, 0);

    expect(result.success).toBe(true);
    expect(state.inventory.crop_1201).toBe(hybridRecipes[0].harvestCount);
    expect(state.codex.crops).toContain(1201); // 图鉴收录
    expect(state.analytics.hybrid_harvest).toBe(1); // 成就埋点
  });

  it('卖仓可按原价卖出杂交作物', async () => {
    const { sellCrop } = await import('../src/systems/farm.js');
    const state = freshState();
    state.inventory.crop_1201 = 1;

    const result = sellCrop(state, 'crop_1201');
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(10000 + hybridRecipes[0].sellPrice);
  });
});
