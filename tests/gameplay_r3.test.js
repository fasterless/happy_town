// 第六轮玩法（1/3）：料理铺 / 小镇委托榜 / 许愿池
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { dishes, getDish } from '../src/config/dishes.js';
import { commissionJobs, getCommissionCoin, getCommissionExp, COMMISSION_SLOTS } from '../src/config/commissions.js';
import { wishes, MAX_LUCK } from '../src/config/wishes.js';
import { itemValue, requiresValue } from '../src/config/itemValue.js';
import {
  cookDish, serveDish, getActiveBuff, getBuffRemainingSeconds, getBuffMultiplier,
  isDishesUnlocked, getDishList,
} from '../src/systems/dishes.js';
import {
  getTodayJobs, completeCommission, canCompleteCommission, isCommissionDone,
  isCommissionUnlocked, getCommissionBoard, rerollCommissions,
} from '../src/systems/commissions.js';
import {
  makeWish, settleWish, hasWishedToday, getWishHeat, getLuck, luckTier,
  getLuckLabel, isWishUnlocked, hasPendingWish,
} from '../src/systems/wishes.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  state.wallet.coin = 100000;
  state.wallet.diamond = 1000;
  return state;
}

describe('物品价值表', () => {
  it('作物按卖价，金穗按 3 倍', () => {
    expect(itemValue('crop_1001')).toBe(2);       // 小麦 2
    expect(itemValue('gold_1001')).toBe(6);       // 金穗小麦 2 × 3
  });

  it('加工成品按原料递归计算（面包 = 4 小麦）', () => {
    expect(itemValue('goods_5001')).toBe(8);      // 小麦面包需要 crop_1001 × 4
    expect(itemValue('goods_5002')).toBe(18);     // 番茄酱 = 番茄 × 3 = 6 × 3
  });

  it('未知物品兜底为 1，不会抛错', () => {
    expect(itemValue('unknown_thing')).toBe(1);
    expect(itemValue('')).toBe(1);
  });

  it('requiresValue 汇总一批需求', () => {
    expect(requiresValue([{ item: 'crop_1001', count: 4 }, { item: 'wood', count: 3 }]))
      .toBe(2 * 4 + 1 * 3);
  });
});

describe('料理铺配置', () => {
  it('id 唯一、等级递进、原料都引用真实物品', () => {
    const ids = dishes.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);

    const knownKeys = new Set([
      'wood', 'stone', 'cloth', 'egg', 'wool', 'milk',
      'twig', 'resin', 'pebble', 'shell', 'ticket', 'bell',
    ]);
    dishes.forEach((d) => {
      expect(d.buff.type).toBeTruthy();
      expect(d.buff.durationSec).toBeGreaterThan(0);
      expect(d.requires.length).toBeGreaterThan(0);
      d.requires.forEach((req) => {
        expect(req.count).toBeGreaterThan(0);
        // 作物 / 金穗作物 / 加工成品 / 鱼获 / 基础材料都算已知键
        const isCrop = /^(crop|gold)_\d+$/.test(req.item);
        const isGoods = /^goods_\d+$/.test(req.item);
        const isFish = /^fish_\d+$/.test(req.item);
        const isIngot = /^ingot_\w+$/.test(req.item);
        expect(isCrop || isGoods || isFish || isIngot || knownKeys.has(req.item)).toBe(true);
      });
      expect(d.value).toBeGreaterThan(0);
    });
  });

  it('料理铺 Lv.6 解锁', () => {
    expect(isDishesUnlocked(freshState(5))).toBe(false);
    expect(isDishesUnlocked(freshState(6))).toBe(true);
  });
});

describe('料理：做菜与上菜', () => {
  it('做菜扣原料，料理进背包', () => {
    const state = freshState();
    const dish = dishes[0]; // 田园沙拉：番茄×3 + 稻米×2
    dish.requires.forEach((req) => { state.inventory[req.item] = req.count; });

    const result = cookDish(state, dish.id);
    expect(result.success).toBe(true);
    expect(state.inventory[`dish_${dish.id}`]).toBe(1);
    expect(state.inventory.crop_1002).toBe(0);
    expect(state.inventory.crop_1006).toBe(0);
    expect(state.analytics.dish_cook).toBe(1);
  });

  it('原料不足被拒且不扣东西', () => {
    const state = freshState();
    state.inventory.crop_1002 = 2; // 差一个番茄
    const before = state.wallet.coin;
    const result = cookDish(state, dishes[0].id);
    expect(result.success).toBe(false);
    expect(state.inventory.dish_7001).toBeUndefined();
    expect(state.wallet.coin).toBe(before);
  });

  it('上菜消耗一道料理并激活对应增益', () => {
    const state = freshState();
    const dish = dishes[0];
    state.inventory[`dish_${dish.id}`] = 1;

    const result = serveDish(state, dish.id);
    expect(result.success).toBe(true);
    expect(state.inventory[`dish_${dish.id}`]).toBe(0);

    const buff = getActiveBuff(state);
    expect(buff.type).toBe(dish.buff.type);
    expect(buff.value).toBe(dish.buff.value);
    expect(getBuffRemainingSeconds(state)).toBeGreaterThan(dish.buff.durationSec - 5);
  });

  it('背包里没这道菜不能上菜', () => {
    const state = freshState();
    const result = serveDish(state, dishes[0].id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('背包里没有');
  });

  it('后上菜的覆盖先上菜的（同时只有一个增益）', () => {
    const state = freshState();
    state.inventory.dish_7001 = 1;
    state.inventory.dish_7002 = 1;

    serveDish(state, 7001);
    expect(getActiveBuff(state).type).toBe('growthSpeed');

    serveDish(state, 7002);
    expect(getActiveBuff(state).type).toBe('orderBonus');
    expect(state.inventory.dish_7001).toBe(0); // 第一道已被吃掉
  });

  it('过期的增益自动失效，倍率回到 1', () => {
    const state = freshState();
    state.buff.active = {
      dishId: 7001, type: 'growthSpeed', value: 1.2,
      expireAt: Date.now() - 1000,
    };
    expect(getActiveBuff(state)).toBeNull();
    expect(getBuffMultiplier(state, 'growthSpeed')).toBe(1);
    expect(getBuffRemainingSeconds(state)).toBe(0);
  });

  it('getBuffMultiplier 只对对应类型生效', () => {
    const state = freshState();
    state.buff.active = {
      dishId: 7001, type: 'growthSpeed', value: 1.2,
      expireAt: Date.now() + 600000,
    };
    expect(getBuffMultiplier(state, 'growthSpeed')).toBe(1.2);
    expect(getBuffMultiplier(state, 'orderBonus')).toBe(1);
  });

  it('getDishList 带出解锁状态与可做份数', () => {
    const state = freshState();
    state.inventory.crop_1002 = 10;
    state.inventory.crop_1006 = 10;
    const list = getDishList(state);
    expect(list).toHaveLength(dishes.length);
    expect(list[0].unlocked).toBe(true);
    expect(list[0].affordable).toBe(3); // 番茄 10/3=3 份、稻米 10/2=5 份 → 取小
  });
});

describe('料理加成真的作用到各系统', () => {
  it('田园沙拉缩短作物生长时间', async () => {
    const { getGrowTime } = await import('../src/systems/farm.js');
    const { getCrop } = await import('../src/config/crops.js');
    const state = freshState();
    state.buff.active = {
      dishId: 7001, type: 'growthSpeed', value: 1.2,
      expireAt: Date.now() + 600000,
    };
    // 小麦 30 秒 / 1.2 = 25
    expect(getGrowTime(state, getCrop(1001))).toBe(25);
  });

  it('丰收盛宴提高单次收获产量', async () => {
    const { harvestCrop } = await import('../src/systems/farm.js');
    const state = freshState();
    state.buff.active = {
      dishId: 7007, type: 'harvestBonus', value: 1.5,
      expireAt: Date.now() + 600000,
    };
    state.farm.plots[0] = {
      cropId: 1001, // 小麦 harvestCount 2 → ×1.5 = 3
      plantedAt: new Date(Date.now() - 60000).toISOString(),
      growTime: 30,
    };
    const result = harvestCrop(state, 0);
    expect(result.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(3);
  });

  it('蜂蜜松饼提高卖出单价', async () => {
    const { sellCrop } = await import('../src/systems/farm.js');
    const state = freshState();
    state.buff.active = {
      dishId: 7005, type: 'sellBonus', value: 1.2,
      expireAt: Date.now() + 600000,
    };
    state.inventory.crop_1001 = 2; // 小麦 2 金币 → 2.4 → round 2
    const result = sellCrop(state, 'crop_1001');
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(100000 + 4); // 2 × round(2×1.2)=2
  });

  it('草莓奶油蛋糕提高订单金币', async () => {
    const { getOrderCoinReward } = await import('../src/systems/orders.js');
    const state = freshState();
    state.buff.active = {
      dishId: 7002, type: 'orderBonus', value: 1.25,
      expireAt: Date.now() + 600000,
    };
    expect(getOrderCoinReward(state, { coin: 100 })).toBe(125);
  });
});

describe('小镇委托榜', () => {
  it('Lv.5 解锁，低于该等级不解锁', () => {
    expect(isCommissionUnlocked(freshState(4))).toBe(false);
    expect(isCommissionUnlocked(freshState(5))).toBe(true);
  });

  it('委托报酬高于需求物品的原始价值', () => {
    commissionJobs.forEach((job) => {
      const coin = getCommissionCoin(job);
      // payFactor ≥ 1.6，所以报酬一定高于直接把货卖掉
      expect(coin).toBeGreaterThan(requiresValue(job.requires));
      expect(getCommissionExp(job)).toBeGreaterThan(0);
    });
  });

  it('每天刷新 slots 个，同一天稳定', () => {
    const state = freshState();
    const first = getTodayJobs(state);
    expect(first).toHaveLength(Math.min(COMMISSION_SLOTS, commissionJobs.length));
    expect(getTodayJobs(state)).toEqual(first); // 同一天不重抽
  });

  it('完成委托：扣材料、发金币经验、当天不能再交', () => {
    const state = freshState();
    const board = getCommissionBoard(state);
    const row = board[0];
    row.requires.forEach((req) => {
      state.inventory[req.item] = req.count;
    });

    const coinBefore = state.wallet.coin;
    const result = completeCommission(state, row.job.id);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBeGreaterThan(coinBefore);
    expect(isCommissionDone(state, row.job.id)).toBe(true);

    // 材料被扣空，且当天不能再交
    row.requires.forEach((req) => {
      expect(state.inventory[req.item]).toBe(0);
    });
    expect(completeCommission(state, row.job.id).success).toBe(false);
    expect(completeCommission(state, row.job.id).message).toContain('今天已经交过');
  });

  it('材料不足被拒且不扣不付', () => {
    const state = freshState();
    const row = getCommissionBoard(state)[0];
    const coinBefore = state.wallet.coin;
    const result = completeCommission(state, row.job.id);
    expect(result.success).toBe(false);
    expect(result.message).toContain('材料不足');
    expect(state.wallet.coin).toBe(coinBefore);
    expect(state.commissions.doneIds).toHaveLength(0);
  });

  it('canCompleteCommission 与实际条件一致', () => {
    const state = freshState();
    const row = getCommissionBoard(state)[0];
    expect(canCompleteCommission(state, row.job.id)).toBe(false);
    row.requires.forEach((req) => {
      state.inventory[req.item] = req.count;
    });
    expect(canCompleteCommission(state, row.job.id)).toBe(true);
  });

  it('等级不够的委托不在榜上', () => {
    const state = freshState(5); // 只有「校车早餐铺」（Lv.5）可见
    const board = getCommissionBoard(state);
    expect(board).toHaveLength(1);
    expect(board[0].job.name).toBe('校车早餐铺');
  });

  it('换一批要花 50 金币，钱不够被拒', () => {
    const state = freshState();
    const coinBefore = state.wallet.coin;
    const result = rerollCommissions(state);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(coinBefore - 50);
    expect(getTodayJobs(state)).toHaveLength(Math.min(COMMISSION_SLOTS, commissionJobs.length));

    state.wallet.coin = 10;
    expect(rerollCommissions(state).success).toBe(false);
    expect(state.wallet.coin).toBe(10);
  });

  it('跨天后 doneIds 清零，可以再交一轮', () => {
    const state = freshState();
    const row = getCommissionBoard(state)[0];
    state.commissions.doneIds.push(row.job.id);

    state.commissions.date = '2000-01-01'; // 假装昨天
    const board = getCommissionBoard(state);
    expect(board.every((r) => !r.done)).toBe(true);
    expect(state.commissions.doneIds).toHaveLength(0);
  });
});

describe('许愿池', () => {
  it('Lv.4 解锁', () => {
    expect(isWishUnlocked(freshState(3))).toBe(false);
    expect(isWishUnlocked(freshState(4))).toBe(true);
  });

  it('许愿扣金币、热度 +1、当天不能重复许', () => {
    const state = freshState();
    const wish = wishes[0];
    const coinBefore = state.wallet.coin;

    const result = makeWish(state, wish.id);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(coinBefore - wish.cost.coin);
    expect(state.wish.heat).toBe(1);
    expect(state.wish.pendingId).toBe(wish.id);
    expect(hasWishedToday(state)).toBe(true);

    const again = makeWish(state, wish.id);
    expect(again.success).toBe(false);
    expect(again.message).toContain('今天已经许过愿');
  });

  it('金币不足不能许愿', () => {
    const state = freshState();
    state.wallet.coin = 10;
    const result = makeWish(state, wishes[0].id); // 需要 100
    expect(result.success).toBe(false);
    expect(result.message).toContain('许愿需要');
    expect(state.wish.heat).toBe(0);
  });

  it('同一天重复结算是幂等的', () => {
    const state = freshState();
    makeWish(state, wishes[0].id);

    // 假装已经跨日（ wishedDate 是今天，不该结算）
    const first = settleWish(state);
    expect(first).toBeNull();
  });

  it('跨日结算发奖，运势越高奖励档位越高', () => {
    const state = freshState();
    makeWish(state, wishes[0].id);
    state.wish.heat = MAX_LUCK; // 满热度必得最高档

    // 假装昨天许的愿
    state.wish.wishedDate = '2000-01-01';

    const result = settleWish(state);
    expect(result).toBeTruthy();
    expect(result.luck).toBe(10);
    expect(result.tier).toBe('high');
    expect(result.rewardText).toBeTruthy();
    expect(state.wish.pendingId).toBeNull();
    expect(state.analytics.wish_settle).toBe(1);
    expect(state.analytics.wish_high).toBe(1);

    // 幂等：同一天再结算返回 null
    expect(settleWish(state)).toBeNull();
  });

  it('断签（昨天没许愿）热度归零', () => {
    const state = freshState();
    state.wish.heat = 5;
    state.wish.pendingId = null;

    const result = settleWish(state);
    expect(result).toBeNull();
    expect(state.wish.heat).toBe(0);
  });

  it('运势档位边界正确', () => {
    expect(luckTier(0)).toBe('low');
    expect(luckTier(4)).toBe('low');
    expect(luckTier(5)).toBe('mid');
    expect(luckTier(9)).toBe('mid');
    expect(luckTier(10)).toBe('high');
  });

  it('运势标签覆盖 0-10 不越界', () => {
    for (let i = 0; i <= 10; i++) {
      expect(getLuckLabel(i)).toBeTruthy();
    }
    expect(getLuckLabel(-1)).toBeTruthy(); // 不抛错
    expect(getLuckLabel(99)).toBeTruthy();
  });

  it('满热度时运势必为 10', () => {
    const state = freshState();
    state.wish.heat = MAX_LUCK;
    expect(getLuck(state)).toBe(10);
  });

  it('hasPendingWish 只在「昨天许了愿」时为真', () => {
    const state = freshState();
    makeWish(state, wishes[0].id);
    expect(hasPendingWish(state)).toBe(false); // 今天刚许的
    state.wish.wishedDate = '2000-01-01';
    expect(hasPendingWish(state)).toBe(true);
  });

  it('许愿心愿配置：三档奖励从低到高', () => {
    wishes.forEach((w) => {
      expect(w.rewards.low).toBeTruthy();
      expect(w.rewards.mid).toBeTruthy();
      expect(w.rewards.high).toBeTruthy();
      expect(w.cost.coin).toBeGreaterThan(0);
    });
  });
});
