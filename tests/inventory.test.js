// 库存 / 货币 / 经验升级单元测试
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import {
  getCount, addItem, spendItem, hasEnough,
  addRewards, canAfford, spendPrice, getInventoryItems,
} from '../src/core/inventory.js';
import { getLevelFromExp, getNextLevelInfo } from '../src/config/levels.js';

function freshState() {
  const state = createDefaultState();
  state.user.created = true;
  return state;
}

describe('经验与等级', () => {
  it('经验门槛精确映射等级（含跳跃档位）', () => {
    expect(getLevelFromExp(0)).toBe(1);
    expect(getLevelFromExp(29)).toBe(1);
    expect(getLevelFromExp(30)).toBe(2);
    expect(getLevelFromExp(80)).toBe(3);
    expect(getLevelFromExp(150)).toBe(4);
    expect(getLevelFromExp(2200)).toBe(12);
    expect(getLevelFromExp(4199)).toBe(15);
    expect(getLevelFromExp(4200)).toBe(16);
    expect(getLevelFromExp(7000)).toBe(20);
  });

  it('下一等级档位跳过缺失的等级号', () => {
    expect(getNextLevelInfo(16).level).toBe(18);
    expect(getNextLevelInfo(18).level).toBe(20);
    expect(getNextLevelInfo(20)).toBeUndefined();
  });

  it('加经验触发升级并记录事件', () => {
    const state = freshState();
    addItem(state, "exp", 30);
    expect(state.wallet.exp).toBe(30);
    expect(state.wallet.level).toBe(2);
    expect(state.analytics.level_up).toBeGreaterThan(0);
  });
});

describe('物品与货币', () => {
  it('addItem/spendItem 对背包物品生效且不为负', () => {
    const state = freshState();
    addItem(state, "crop_1001", 5);
    expect(getCount(state, "crop_1001")).toBe(5);
    spendItem(state, "crop_1001", 3);
    expect(getCount(state, "crop_1001")).toBe(2);
    spendItem(state, "crop_1001", 99); // 下限保护
    expect(getCount(state, "crop_1001")).toBe(0);
  });

  it('金币与钻石走 wallet 通道', () => {
    const state = freshState();
    addItem(state, "coin", 50);
    expect(state.wallet.coin).toBe(170);
    expect(getCount(state, "coin")).toBe(170);
    addItem(state, "diamond", 10);
    expect(state.wallet.diamond).toBe(40);
  });

  it('hasEnough 正确判断', () => {
    const state = freshState();
    addItem(state, "crop_1002", 3);
    expect(hasEnough(state, "crop_1002", 3)).toBe(true);
    expect(hasEnough(state, "crop_1002", 4)).toBe(false);
    expect(hasEnough(state, "crop_1001", 1)).toBe(false);
  });

  it('addRewards 批量入账', () => {
    const state = freshState();
    addRewards(state, { coin: 10, diamond: 5, crop_1001: 2, exp: 2 });
    expect(state.wallet.coin).toBe(130);
    expect(state.wallet.diamond).toBe(35);
    expect(state.inventory.crop_1001).toBe(2);
    expect(state.wallet.exp).toBe(2);
  });
});

describe('价格支付', () => {
  it('canAfford 区分金币 / 钻石 / rmb', () => {
    const state = freshState();
    expect(canAfford(state, "coin", 120)).toBe(true);
    expect(canAfford(state, "coin", 121)).toBe(false);
    expect(canAfford(state, "diamond", 30)).toBe(true);
    expect(canAfford(state, "diamond", 31)).toBe(false);
    expect(canAfford(state, "rmb", 999)).toBe(true); // 模拟充值
    expect(canAfford(state, "wood", 1)).toBe(false); // 未知类型
  });

  it('spendPrice 扣对应货币，rmb 不扣', () => {
    const state = freshState();
    spendPrice(state, "coin", 20);
    expect(state.wallet.coin).toBe(100);
    spendPrice(state, "diamond", 5);
    expect(state.wallet.diamond).toBe(25);
    spendPrice(state, "rmb", 6);
    expect(state.wallet.coin).toBe(100); // rmb 无副作用
  });
});

describe('背包展示', () => {
  it('getInventoryItems 过滤零数量并限长', () => {
    const state = freshState();
    addItem(state, "crop_1001", 2);
    addItem(state, "crop_1002", 0); // 不入库
    const items = getInventoryItems(state);
    const keys = items.map((i) => i.key);
    expect(keys).toContain("wood");
    expect(keys).toContain("crop_1001");
    expect(items.length).toBeLessThanOrEqual(12);
  });
});
