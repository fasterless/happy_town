// 第三阶段图鉴系统：收录、回填、档位奖励
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { crops } from '../src/config/crops.js';
import { hybridRecipes } from '../src/config/hybrid.js';
import { furniture } from '../src/config/furniture.js';
import { fishes } from '../src/systems/fishing.js';
import { dishes } from '../src/config/dishes.js';
import {
  recordCropHarvest, recordFurniture, recordFish,
  backfillCodex, getCodexProgress, canClaimCodexTier, claimCodexTier, CODEX_TIERS,
} from '../src/systems/codex.js';

function freshState() {
  const state = createDefaultState();
  state.user.created = true;
  return state;
}

describe('图鉴收录', () => {
  it('收录是「曾经拥有」语义：条目进去就不再移除', () => {
    const state = freshState();
    recordCropHarvest(state, 1001);
    expect(state.codex.crops).toContain(1001);

    // 重复收录是幂等的
    recordCropHarvest(state, 1001);
    expect(state.codex.crops.filter((id) => id === 1001)).toHaveLength(1);
  });

  it('三类收录互不干扰', () => {
    const state = freshState();
    recordCropHarvest(state, 1001);
    recordFurniture(state, 3001);
    recordFish(state, 5);
    expect(state.codex.crops).toEqual([1001]);
    expect(state.codex.furniture).toEqual([3001]);
    expect(state.codex.fishes).toEqual([5]);
  });

  it('收获/购买/钓鱼的入口各自记录（farm/home/fishing 已接线，此处验证系统层）', () => {
    const state = freshState();
    // 模拟分别走三个入口后的进度
    crops.slice(0, 3).forEach((c) => recordCropHarvest(state, c.id));
    furniture.slice(0, 4).forEach((f) => recordFurniture(state, f.id));
    fishes.slice(0, 2).forEach((f) => recordFish(state, f.id));

    const progress = getCodexProgress(state);
    expect(progress.collected).toBe(3 + 4 + 2);
    // 料理图鉴走 dish_types 位图（料理会消耗，不能落 state.codex），
    // 所以总量里含料理，本用例没做菜所以 collected 不含它们
    expect(progress.total).toBe(
      crops.length + hybridRecipes.length + furniture.length + fishes.length + dishes.length
    );
    expect(progress.ratio).toBeCloseTo(9 / progress.total);
  });
});

describe('老存档回填', () => {
  it('按库存与种植记录一次性回填', () => {
    const state = freshState();
    state.inventory.crop_1001 = 5;
    state.inventory.f_3001 = 1;
    state.inventory.fish_3 = 2;
    state.farm.plantedTypes = [1001, 1002];
    // 卖光的作物回填不了（图鉴只认库存里还有的或种过记录）
    state.inventory.crop_1009 = 0;

    backfillCodex(state);
    expect(state.codex.crops).toEqual(expect.arrayContaining([1001, 1002]));
    expect(state.codex.crops).not.toContain(1009);
    expect(state.codex.furniture).toContain(3001);
    expect(state.codex.fishes).toContain(3);
  });

  it('回填幂等，不清空已有收录', () => {
    const state = freshState();
    recordCropHarvest(state, 1003); // 库存里没有，但之前收录过
    backfillCodex(state);
    expect(state.codex.crops).toContain(1003);
  });
});

describe('档位奖励', () => {
  it('未达档位不能领，达档后可领且只领一次', () => {
    const state = freshState();
    expect(canClaimCodexTier(state, 't25')).toBe(false);
    expect(claimCodexTier(state, 't25').success).toBe(false);

    // 收满 25%（总量含料理，这里用图鉴自己的口径算，避免测试跟着配置漂）
    const total = getCodexProgress(state).total;
    const need = Math.ceil(total * 0.25);
    let added = 0;
    for (const c of crops) { if (added < need) { recordCropHarvest(state, c.id); added++; } }
    for (const f of furniture) { if (added < need) { recordFurniture(state, f.id); added++; } }
    for (const f of fishes) { if (added < need) { recordFish(state, f.id); added++; } }

    expect(canClaimCodexTier(state, 't25')).toBe(true);
    const coinBefore = state.wallet.coin;
    const result = claimCodexTier(state, 't25');
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(coinBefore + 500);
    expect(state.codex.claimedTiers).toContain('t25');

    // 二次领取被拒
    expect(claimCodexTier(state, 't25').success).toBe(false);
    expect(canClaimCodexTier(state, 't25')).toBe(false);
  });

  it('未知档位直接拒绝', () => {
    const state = freshState();
    expect(claimCodexTier(state, 'nonexistent').success).toBe(false);
  });

  it('档位配置从低到高排列', () => {
    const ratios = CODEX_TIERS.map((t) => t.ratio);
    expect(ratios).toEqual([...ratios].sort((a, b) => a - b));
  });

  it('料理也计入 collected：全收录时 100% 档领得到', () => {
    const state = freshState();
    const total = getCodexProgress(state).total;

    crops.concat(hybridRecipes).forEach((c) => recordCropHarvest(state, c.id));
    furniture.forEach((f) => recordFurniture(state, f.id));
    fishes.forEach((f) => recordFish(state, f.id));
    // 料理走 dish_types 位图（料理会消耗，收录状态不能落 state.codex）
    dishes.forEach((d, i) => { state.analytics.dish_types |= (1 << i); });

    expect(getCodexProgress(state).collected).toBe(total);
    expect(canClaimCodexTier(state, 't100')).toBe(true);
  });
});
