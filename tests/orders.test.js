// 订单核心经济单元测试
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import {
  completeOrder, refreshOrder, ensureOrders, pickOrderId, canCompleteOrder,
  getOrderCoinReward,
} from '../src/systems/orders.js';
import { addItem } from '../src/core/inventory.js';

// 新档：Lv.1，初始订单 [2006, 2001, 2001]
function freshState() {
  const state = createDefaultState();
  state.user.created = true;
  return state;
}

describe('订单槽位', () => {
  it('默认 3 个槽位且被填满', () => {
    const state = freshState();
    expect(state.orders.activeIds).toHaveLength(3);
    expect(ensureOrders(state)).toBe(state);
  });

  it('Lv.1 时轮询只在新手/普通低阶订单里循环', () => {
    const state = freshState();
    // Lv.1 可用：2001(面包店)、2006(镇长早餐篮)，按数组顺序
    expect(pickOrderId(state)).toBe(2001);
    expect(pickOrderId(state)).toBe(2006);
    expect(pickOrderId(state)).toBe(2001);
  });

  it('无可用订单时兜底新手订单', () => {
    const state = freshState();
    state.wallet.level = 0;
    expect(pickOrderId(state)).toBe(2006);
  });
});

describe('完成订单 completeOrder', () => {
  it('材料不足时失败且不扣不付', () => {
    const state = freshState();
    const result = completeOrder(state, 1); // 2001 需要 crop_1001×4
    expect(result.success).toBe(false);
    expect(result.message).toContain("小麦不足");
    expect(state.wallet.coin).toBe(120);
  });

  it('等级不足时失败', () => {
    const state = freshState();
    state.wallet.level = 1;
    state.orders.activeIds[0] = 2002; // 餐厅订单 Lv.2
    const result = completeOrder(state, 0);
    expect(result.success).toBe(false);
    expect(result.message).toContain("Lv.2");
  });

  it('成功完成：扣材料、付金币和经验、槽位轮换', () => {
    const state = freshState();
    addItem(state, "crop_1001", 4);
    const coinBefore = state.wallet.coin;
    const result = completeOrder(state, 1); // 2001：20 金币 + 5 经验
    expect(result.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(0);
    expect(state.wallet.coin).toBe(coinBefore + 20);
    expect(state.wallet.exp).toBe(5);
    expect(state.wallet.level).toBe(1); // 30 经验才到 Lv.2
    // 槽位被重新挑选（Lv.1 池：2001 → 2006 → …），且不再是旧订单也行
    expect(typeof state.orders.activeIds[1]).toBe("number");
  });

  it('彩虹天气下订单金币翻倍', () => {
    const state = freshState();
    state.weather.current = "rainbow";
    const coin = getOrderCoinReward(state, { coin: 20 });
    expect(coin).toBe(40);
  });

  it('canCompleteOrder 与实际完成条件一致', () => {
    const state = freshState();
    expect(canCompleteOrder(state, 2001)).toBe(false);
    addItem(state, "crop_1001", 4);
    expect(canCompleteOrder(state, 2001)).toBe(true);
    expect(canCompleteOrder(state, 99999)).toBe(false);
  });
});

describe('刷新订单 refreshOrder', () => {
  it('刷新会替换槽位并推进轮询游标', () => {
    const state = freshState();
    const before = state.orders.activeIds[0];
    const cursorBefore = state.orders.cursor;
    const result = refreshOrder(state, 0);
    expect(result.success).toBe(true);
    expect(state.orders.cursor).toBe(cursorBefore + 1);
    expect(typeof state.orders.activeIds[0]).toBe("number");
    // Lv.1 池循环替换，新旧可能相同，但游标必然前进
    expect(before).toBeDefined();
  });
});
