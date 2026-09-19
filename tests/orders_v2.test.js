// 第二阶段订单深化：限时订单 / 连锁奖励 / 订单预购
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { GAME_CONFIG } from '../src/config/constants.js';
import { todayKey } from '../src/utils/time.js';
import {
  completeOrder, acceptRushOrder, settleExpiredRush, hasRushedToday,
  getRushRemainingSeconds, isRushExpired, applyChainBonus,
  reserveOrder, settleReservedOrder,
} from '../src/systems/orders.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  // wallet.level 由 exp 推导，不把 exp 拉满的话加一次经验就会把等级打回 Lv.1
  state.wallet.exp = level >= 20 ? 7000 : 0;
  state.wallet.coin = 100000;
  return state;
}

describe('连锁订单', () => {
  it('首单建立连锁，同类型二单起有加成', () => {
    const state = freshState();
    state.inventory.crop_1001 = 100;
    state.inventory.crop_1002 = 100;

    // 第一单（普通）：建立 chainType，无加成
    state.orders.activeIds[0] = 2001;
    completeOrder(state, 0);
    expect(state.orders.chainType).toBe("普通");
    expect(state.orders.chainCount).toBe(1);

    // 第二单同类型（普通）：+10%，基础 35 → 35 + 3
    state.orders.activeIds[0] = 2002;
    const before = state.wallet.coin;
    const done = completeOrder(state, 0);
    expect(done.success).toBe(true);
    expect(state.orders.chainCount).toBe(2);
    expect(state.wallet.coin).toBe(before + 35 + Math.floor(35 * 0.1 * 1));
  });

  it('换类型会重置连锁计数', () => {
    const state = freshState();
    state.orders.chainType = "普通";
    state.orders.chainCount = 3;
    // 特殊类型订单
    const bonus = applyChainBonus(state, { coin: 100, type: "特殊" });
    expect(bonus).toBe(0);
  });

  it('连锁加成封顶 5 层（+50%）', () => {
    const state = freshState();
    state.orders.chainType = "普通";
    state.orders.chainCount = 9;
    expect(applyChainBonus(state, { coin: 100, type: "普通" })).toBe(50);
  });
});

describe('限时订单', () => {
  it('Lv.5 以下不能接', () => {
    const state = freshState(4);
    const result = acceptRushOrder(state);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Lv.5");
  });

  it('接单后 10 分钟内有效，完成后标记当天已接', () => {
    const state = freshState();
    const result = acceptRushOrder(state);
    expect(result.success).toBe(true);
    expect(state.orders.rush).toBeTruthy();
    expect(getRushRemainingSeconds(state)).toBeLessThanOrEqual(GAME_CONFIG.orders.rushDurationSec);
    expect(isRushExpired(state)).toBe(false);

    // 完成这单：翻倍奖励入账，进行中的限时单清空
    const picked = state.orders.rush.id;
    state.orders.activeIds[0] = picked;
    state.inventory[`crop_${String(picked ? 1001 : 1001)}`] = 999;
    // 给足所有可能材料
    state.inventory.crop_1001 = 999;
    state.inventory.crop_1002 = 999;
    state.inventory.crop_1003 = 999;
    state.inventory.crop_1004 = 999;
    state.inventory.crop_1005 = 999;
    state.inventory.crop_1006 = 999;
    state.inventory.crop_1007 = 999;
    state.inventory.crop_1008 = 999;
    state.inventory.crop_1010 = 999;
    state.inventory.goods_5001 = 999;
    state.inventory.goods_5004 = 999;
    state.inventory.goods_5005 = 999;
    state.inventory.goods_5006 = 999;

    const coinBefore = state.wallet.coin;
    const done = completeOrder(state, 0);
    expect(done.success).toBe(true);
    expect(state.orders.rush).toBeNull();
    expect(hasRushedToday(state)).toBe(true);
    expect(state.wallet.coin).toBeGreaterThan(coinBefore);
  });

  it('当天已接过则不能再接', () => {
    const state = freshState();
    state.orders.rushFinishedToday = todayKey();
    expect(acceptRushOrder(state).success).toBe(false);
  });

  it('过期后 settleExpiredRush 清单并占用当日次数', () => {
    const state = freshState();
    state.orders.rush = { id: 2001, expireAt: Date.now() - 1000 };
    expect(isRushExpired(state)).toBe(true);

    expect(settleExpiredRush(state)).toBe(true);
    expect(state.orders.rush).toBeNull();
    expect(hasRushedToday(state)).toBe(true);
    // 幂等：再调返回 false
    expect(settleExpiredRush(state)).toBe(false);
  });
});

describe('订单预购', () => {
  it('预购扣 20 金币并记录', () => {
    const state = freshState();
    const result = reserveOrder(state, 2001);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(100000 - GAME_CONFIG.orders.reserveCost);
    expect(state.orders.reservedId).toBe(2001);
    expect(state.orders.reservedPaidAt).toBe(todayKey());
  });

  it('重复预购 / 金币不足 / 等级不足都会被拒绝', () => {
    const state = freshState();
    reserveOrder(state, 2001);
    expect(reserveOrder(state, 2002).success).toBe(false);

    const poor = freshState();
    poor.wallet.coin = 5;
    expect(reserveOrder(poor, 2001).success).toBe(false);

    const low = freshState(1);
    expect(reserveOrder(low, 2005).success).toBe(false); // 南瓜派 Lv.8
  });

  it('跨天后兑现到第一个槽位，同天不兑现', () => {
    const state = freshState();
    reserveOrder(state, 2001);

    // 同一天不兑现
    expect(settleReservedOrder(state)).toBe(false);

    // 假装昨天付的钱
    state.orders.reservedPaidAt = "2000-01-01";
    expect(settleReservedOrder(state)).toBe(true);
    expect(state.orders.activeIds[0]).toBe(2001);
    expect(state.orders.reservedId).toBeNull();
    // 幂等
    expect(settleReservedOrder(state)).toBe(false);
  });
});
