// 第二阶段农场深化：扩建 / 金穗 / 批量种植 / 卖仓 / 加速券
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { GAME_CONFIG } from '../src/config/constants.js';
import {
  plantAll, buyExpansion, getNextExpansion, getPurchasedPlotCount,
  sellCrop, getCropSellPrice, speedUpPlot,
} from '../src/systems/farm.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  state.wallet.diamond = 1000;
  return state;
}

const WHEAT = 1001; // seedPrice 2 / sellPrice 2

describe('土地扩建', () => {
  it('默认 12 块，满级下基础地块全部解锁', () => {
    const state = freshState();
    expect(getPurchasedPlotCount(state)).toBe(12);
  });

  it('扩建地块在购买前锁定，购买后解锁并补齐数组', () => {
    const state = freshState();
    expect(getPurchasedPlotCount(state)).toBe(12);

    const result = buyExpansion(state);
    expect(result.success).toBe(true);
    expect(getPurchasedPlotCount(state)).toBe(15);
    // 第 13 块（索引 12）现在可以种了
    state.farm.plots[12] = null;
    const plant = plantAll(state, WHEAT);
    expect(plant.count).toBe(15); // 12 基础空地 + 3 块新地
  });

  it('扩建扣金币和钻石', () => {
    const state = freshState();
    const tier = GAME_CONFIG.farm.expansions[0];
    const result = buyExpansion(state);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(100000 - tier.coin);
    expect(state.wallet.diamond).toBe(1000 - tier.diamond);
  });

  it('资源不足时扩建失败且不扣费', () => {
    const state = freshState();
    state.wallet.coin = 100;
    state.wallet.diamond = 1;
    const result = buyExpansion(state);
    expect(result.success).toBe(false);
    expect(getPurchasedPlotCount(state)).toBe(12);
    expect(state.wallet.coin).toBe(100);
  });

  it('三档买满后提示扩满', () => {
    const state = freshState();
    expect(buyExpansion(state).success).toBe(true); // 15
    expect(buyExpansion(state).success).toBe(true); // 18
    expect(buyExpansion(state).success).toBe(true); // 21
    expect(getNextExpansion(state)).toBeNull();
    const result = buyExpansion(state);
    expect(result.success).toBe(false);
    expect(getPurchasedPlotCount(state)).toBe(21);
  });
});

describe('金穗作物', () => {
  it('金穗作物售价是普通作物 3 倍', () => {
    expect(getCropSellPrice('crop_1001')).toBe(2);
    expect(getCropSellPrice('gold_1001')).toBe(6);
    expect(getCropSellPrice('goods_5001')).toBe(0); // 加工品不在此列
    expect(getCropSellPrice('fish_1')).toBe(0);
  });

  it('金穗作物可以卖 3 倍价', () => {
    const state = freshState();
    state.inventory.gold_1001 = 2;
    const result = sellCrop(state, 'gold_1001');
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(100000 + 12); // 2 × 6
    expect(state.inventory.gold_1001).toBe(0);
  });

  it('卖普通作物按原价', () => {
    const state = freshState();
    state.inventory.crop_1004 = 2; // 玉米 sellPrice 22
    const result = sellCrop(state, 'crop_1004');
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(100000 + 44);
  });

  it('卖出数量可以指定，不传则全卖', () => {
    const state = freshState();
    state.inventory.crop_1001 = 5;
    sellCrop(state, 'crop_1001', 3);
    expect(state.inventory.crop_1001).toBe(2);
    sellCrop(state, 'crop_1001');
    expect(state.inventory.crop_1001).toBe(0);
    expect(state.wallet.coin).toBe(100000 + 10);
  });

  it('空背包或数量为 0 时卖出失败', () => {
    const state = freshState();
    expect(sellCrop(state, 'crop_1001').success).toBe(false);
    state.inventory.crop_1001 = 0;
    expect(sellCrop(state, 'crop_1001').success).toBe(false);
    expect(sellCrop(state, 'goods_5001').success).toBe(false);
  });
});

describe('批量种植', () => {
  it('铺满所有已解锁空地并按单价扣钱', () => {
    const state = freshState();
    const result = plantAll(state, WHEAT);
    expect(result.success).toBe(true);
    expect(result.count).toBe(12); // Lv.20 解锁全部基础地块
    expect(state.wallet.coin).toBe(100000 - 12 * 2);
    // 只铺农地，末尾的温室格子不参与一键种植
    expect(state.farm.plots.slice(0, 12).every((p) => p !== null)).toBe(true);
    expect(state.farm.plots.slice(GAME_CONFIG.farm.maxPlots).every((p) => p === null)).toBe(true);
  });

  it('金币不够时种到停，已种的不回退', () => {
    const state = freshState();
    state.wallet.coin = 10; // 只够 5 株小麦
    const result = plantAll(state, WHEAT);
    expect(result.success).toBe(true);
    expect(result.count).toBe(5);
    expect(state.wallet.coin).toBe(0);
  });

  it('金币一分不剩且没有空地可用时报失败', () => {
    const state = freshState();
    state.wallet.coin = 1;
    const result = plantAll(state, WHEAT);
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
    expect(result.message).toContain("金币不足");
  });
});

describe('加速券', () => {
  const growingPlot = () => ({
    cropId: WHEAT,
    plantedAt: new Date(Date.now() - 1000).toISOString(),
    growTime: 30,
  });

  it('消耗一张券让未熟作物立即成熟', () => {
    const state = freshState();
    state.farm.plots[0] = growingPlot();
    state.inventory.speed_ticket = 1;
    const result = speedUpPlot(state, 0);
    expect(result.success).toBe(true);
    expect(state.inventory.speed_ticket).toBe(0);
    const plot = state.farm.plots[0];
    expect(new Date(plot.plantedAt).getTime()).toBeLessThanOrEqual(Date.now() - 30 * 1000);
  });

  it('没有券或已成熟时失败且不消耗', () => {
    const state = freshState();
    state.farm.plots[0] = growingPlot();
    state.inventory.speed_ticket = 0;
    expect(speedUpPlot(state, 0).success).toBe(false);

    state.inventory.speed_ticket = 3;
    state.farm.plots[0].plantedAt = new Date(Date.now() - 60000).toISOString(); // 已熟
    const result = speedUpPlot(state, 0);
    expect(result.success).toBe(false);
    expect(state.inventory.speed_ticket).toBe(3);

    expect(speedUpPlot(state, 1).success).toBe(false); // 空地
  });
});
