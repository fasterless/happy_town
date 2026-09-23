// v2 新系统冒烟测试
//
// 用 vitest 直接驱动各系统模块，验证核心玩法闭环不报错、规则不冲突。
import { describe, it, expect, vi } from 'vitest';
import { createDefaultState, normalizeState } from '../src/core/state.js';
import * as CraftingSystem from '../src/systems/crafting.js';
import * as FishingSystem from '../src/systems/fishing.js';
import * as LotterySystem from '../src/systems/lottery.js';
import * as SeasonsSystem from '../src/systems/seasons.js';
import * as FriendsSystem from '../src/systems/friends.js';
import * as PetsSystem from '../src/systems/pets.js';
import * as AchievementsSystem from '../src/systems/achievements.js';
import { orders } from '../src/config/orders.js';
import { crops } from '../src/config/crops.js';
import { craftingRecipes } from '../src/config/crafting.js';
import { seasonalEvents, getCurrentSeasonalEvent } from '../src/config/seasons.js';

// 构造一个满级、资源充足的测试账号
function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  state.wallet.coin = 100000;
  state.wallet.diamond = 10000;
  return state;
}

describe('配置完整性', () => {
  it('所有作物都能成熟（growTime > 0）', () => {
    crops.forEach((c) => expect(c.growTime).toBeGreaterThan(0));
  });

  it('所有订单引用的物品都真实存在', () => {
    const validItems = new Set([
      ...crops.map((c) => `crop_${c.id}`),
      ...craftingRecipes.map((r) => r.result.key),
    ]);
    orders.forEach((o) =>
      o.requires.forEach((r) => {
        expect(validItems.has(r.item)).toBe(true);
      })
    );
  });

  it('季节活动覆盖全部 12 个月', () => {
    const covered = new Set();
    seasonalEvents.forEach((e) => {
      for (let m = e.startMonth; m <= e.endMonth; m++) covered.add(m);
    });
    for (let m = 1; m <= 12; m++) {
      expect(covered.has(m)).toBe(true);
    }
  });

  it('当前月份总能命中一个活动', () => {
    expect(getCurrentSeasonalEvent()).not.toBeNull();
  });
});

describe('加工坊', () => {
  it('Lv.10 解锁，Lv.9 不行', () => {
    expect(CraftingSystem.isCraftingUnlocked(freshState(10))).toBe(true);
    expect(CraftingSystem.isCraftingUnlocked(freshState(9))).toBe(false);
  });

  it('投料开工 → 时间到 → 领取成品', () => {
    const state = freshState();
    state.inventory.crop_1001 = 10;

    const result = CraftingSystem.startCrafting(state, 5001);
    expect(result.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(6); // 4个小麦被消耗
    expect(state.crafting.queue).toHaveLength(1);

    // 还没到时间不能领
    expect(CraftingSystem.claimCrafting(state, 0).success).toBe(false);

    // 把开始时间拨回 1 小时前，模拟加工完成
    state.crafting.queue[0].startedAt = new Date(Date.now() - 3600_000).toISOString();

    const claim = CraftingSystem.claimCrafting(state, 0);
    expect(claim.success).toBe(true);
    expect(state.inventory.goods_5001).toBe(1);
    expect(state.crafting.queue).toHaveLength(0);
  });

  it('加工台最多同时 2 批', () => {
    const state = freshState();
    state.inventory.crop_1001 = 100;
    state.inventory.crop_1002 = 100;

    expect(CraftingSystem.startCrafting(state, 5001).success).toBe(true);
    expect(CraftingSystem.startCrafting(state, 5002).success).toBe(true);
    const third = CraftingSystem.startCrafting(state, 5001);
    expect(third.success).toBe(false);
  });

  it('取消加工退还一半原料', () => {
    const state = freshState();
    state.inventory.crop_1001 = 10;

    CraftingSystem.startCrafting(state, 5001); // 消耗4个小麦
    const cancel = CraftingSystem.cancelCrafting(state, 0);
    expect(cancel.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(8); // 10 - 4 + 2
  });
});

describe('湖畔钓鱼', () => {
  it('Lv.6 解锁，Lv.5 不行', () => {
    expect(FishingSystem.isFishingUnlocked(freshState(6))).toBe(true);
    expect(FishingSystem.isFishingUnlocked(freshState(5))).toBe(false);
  });

  it('每天前 5 次免费，之后扣金币买饵', () => {
    const state = freshState();
    const coinBefore = state.wallet.coin;

    // 固定随机：鱼种落在普通鱼上，惊喜概率不触发（惊喜里有金币掉落会干扰断言）
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    try {
      for (let i = 0; i < 5; i++) {
        expect(FishingSystem.castRod(state).success).toBe(true);
      }
      expect(state.wallet.coin).toBe(coinBefore); // 免费次数内不扣钱
      expect(FishingSystem.getFreeCastsLeft(state)).toBe(0);

      // 第6次开始扣 5 金币
      const sixth = FishingSystem.castRod(state);
      expect(sixth.success).toBe(true);
      expect(state.wallet.coin).toBe(coinBefore - 5);
    } finally {
      randomSpy.mockRestore();
    }
  });

  it('钓鱼会入包并可卖出', () => {
    const state = freshState();
    state.wallet.coin = 100000; // 无限买饵

    let caught = 0;
    for (let i = 0; i < 60; i++) {
      const result = FishingSystem.castRod(state);
      if (result.success) caught++;
    }
    expect(caught).toBe(60);

    const fishKeys = Object.keys(state.inventory).filter((k) => k.startsWith('fish_'));
    expect(fishKeys.length).toBeGreaterThan(0);

    const coinBefore = state.wallet.coin;
    const sell = FishingSystem.sellAllFish(state);
    expect(sell.success).toBe(true);
    expect(state.wallet.coin).toBeGreaterThan(coinBefore);
  });
});

describe('幸运转盘', () => {
  it('没券不能抽', () => {
    const state = freshState();
    expect(LotterySystem.spinLottery(state).success).toBe(false);
  });

  it('有券能抽，抽完扣券且发奖', () => {
    const state = freshState();
    state.inventory.lottery_ticket = 3;

    const spin = LotterySystem.spinLottery(state);
    expect(spin.success).toBe(true);
    expect(state.inventory.lottery_ticket).toBe(2);
    expect(spin.prize).toBeTruthy();
  });

  it('保底：40 抽内必出超级大奖', () => {
    const state = freshState();
    state.inventory.lottery_ticket = 100;

    let hitJackpot = false;
    for (let i = 0; i < 45; i++) {
      const result = LotterySystem.spinLottery(state);
      if (result.prize?.id === 'jackpot') {
        hitJackpot = true;
        break;
      }
    }
    expect(hitJackpot).toBe(true);
  });
});

describe('季节活动', () => {
  it('非当前季节活动不可领', () => {
    const state = freshState();
    const other = seasonalEvents.find((e) => getCurrentSeasonalEvent().id !== e.id);
    const result = SeasonsSystem.claimSeasonalReward(state, other.id);
    expect(result.success).toBe(false);
  });

  it('当前季节活动领一次后不能重复领', () => {
    const state = freshState();
    const current = getCurrentSeasonalEvent();

    const first = SeasonsSystem.claimSeasonalReward(state, current.id);
    expect(first.success).toBe(true);

    const second = SeasonsSystem.claimSeasonalReward(state, current.id);
    expect(second.success).toBe(false);
  });
});

describe('邻居回礼', () => {
  it('拜访可能触发回礼，每人每天最多一次', () => {
    const state = freshState();
    let triggeredCount = 0;
    for (let i = 0; i < 30; i++) {
      const result = FriendsSystem.visitFriend(state, 'npc_mayor');
      expect(result.success).toBe(true);
      if (result.message.includes('镇长塞给你')) triggeredCount++;
    }
    // 35% 概率触发后当天标记，30 次拜访内最多出现 1 次回礼
    expect(triggeredCount).toBeLessThanOrEqual(1);
  });
});

describe('宠物新buff', () => {
  it('小狐狸提升钓鱼稀有度权重', () => {
    const state = freshState();
    state.pets.owned.push('fox');
    state.pets.active = 'fox';
    // 基础倍率1 × buff 1.5 × 亲密度加成(0) = 1.5
    expect(PetsSystem.applyPetToFishingLuck(1, state)).toBe(1.5);
  });

  it('鹦鹉缩短加工时间', () => {
    const state = freshState();
    state.pets.owned.push('parrot');
    state.pets.active = 'parrot';
    const fast = PetsSystem.applyPetToCraftTime(1000, state);
    expect(fast).toBeLessThan(1000);
    expect(fast).toBeGreaterThanOrEqual(30);
  });
});

describe('成就与状态迁移', () => {
  it('新成就可被追踪', () => {
    const state = freshState();
    state.analytics.fishing_cast = 50;
    state.analytics.craft_finish = 20;
    state.analytics.lottery_spin = 30;
    state.analytics.neighbor_gift = 15;
    state.analytics.pet_feed = 14;

    const unlocked = AchievementsSystem.checkAchievements(state);
    const ids = unlocked.map((a) => a.id);
    expect(ids).toContain('fish_50');
    expect(ids).toContain('craft_20');
    expect(ids).toContain('lottery_30');
    expect(ids).toContain('neighbor_15');
    expect(ids).toContain('feed_pet_14');
  });

  it('旧存档的假作物地块被清理并退款', () => {
    const state = freshState();
    state.farm.plots[0] = { cropId: 1009, plantedAt: new Date().toISOString(), growTime: 0 };
    state.farm.plantedTypes = [1009, 1010, 1001];
    const coinBefore = state.wallet.coin;

    // normalizeState 由 loadState 调用，这里直接调用验证迁移逻辑
    normalizeState(state);

    expect(state.farm.plots[0]).toBeNull();
    expect(state.farm.plantedTypes).not.toContain(1009);
    expect(state.farm.plantedTypes).not.toContain(1010);
    expect(state.wallet.coin).toBe(coinBefore + 10);
  });
});
