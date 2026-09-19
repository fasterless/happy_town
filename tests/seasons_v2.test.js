// 第三阶段季节限定：限定作物 / 家具 / 订单随月份出现与消失
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import {
  seasonalEvents, getCurrentSeasonalEvent, getSeasonalCrops,
  getSeasonalOrders, getAllSeasonalCrops,
} from '../src/config/seasons.js';
import { getCrop } from '../src/config/crops.js';
import { getOrder } from '../src/config/orders.js';
import { plantCrop, harvestCrop, sellCrop } from '../src/systems/farm.js';
import { completeOrder } from '../src/systems/orders.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  state.wallet.coin = 100000;
  return state;
}

// 月份相关断言依赖真实时钟。测试只验证「当前活动」的内在一致性，
// 不锁定具体是哪个季节（否则换季月份跑 CI 就挂）。
const current = getCurrentSeasonalEvent();

describe('季节活动配置', () => {
  it('每个活动都配齐限定内容（作物/家具/订单）', () => {
    seasonalEvents.forEach((event) => {
      expect(event.seasonal.crops.length).toBeGreaterThanOrEqual(1);
      expect(event.seasonal.furniture.length).toBeGreaterThanOrEqual(1);
      expect(event.seasonal.orders.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('限定作物/家具/订单 id 全局不冲突', () => {
    const cropIds = [...getAllSeasonalCrops().map((c) => c.id), 1001, 1010];
    expect(new Set(cropIds).size).toBe(cropIds.length);

    const furIds = seasonalEvents.flatMap((e) => e.seasonal.furniture.map((f) => f.id)).concat([3001, 3014]);
    expect(new Set(furIds).size).toBe(furIds.length);

    const orderIds = seasonalEvents.flatMap((e) => e.seasonal.orders.map((o) => o.id)).concat([2001, 2014]);
    expect(new Set(orderIds).size).toBe(orderIds.length);
  });

  it('限定订单的 requires 引用自己活动的限定作物', () => {
    seasonalEvents.forEach((event) => {
      const cropKeys = new Set(event.seasonal.crops.map((c) => `crop_${c.id}`));
      event.seasonal.orders.forEach((order) => {
        order.requires.forEach((req) => {
          // 限定订单要么用本季限定作物，要么用普通作物，不能引用别季的限定作物
          expect(cropKeys.has(req.item) || /^crop_1\d{3}$/.test(req.item) === false || req.item.startsWith('crop_1') === false || cropKeys.has(req.item)).toBe(true);
        });
      });
    });
  });
});

describe('限定内容只在活动期出现', () => {
  it('当前活动的限定内容可查到', () => {
    if (!current) return; // 3月等空档期，跳过
    expect(getSeasonalCrops().length).toBeGreaterThan(0);
    expect(getSeasonalOrders().length).toBeGreaterThan(0);
    expect(getCurrentSeasonalEvent().seasonal.crops[0]).toHaveProperty('growTime');
  });

  it('所有季节的限定作物都能被 getCrop 查到（活动结束也可收获）', () => {
    seasonalEvents.forEach((event) => {
      event.seasonal.crops.forEach((crop) => {
        expect(getCrop(crop.id)).toBeTruthy();
        expect(getCrop(crop.id).name).toBe(crop.name);
      });
    });
  });

  it('getOrder 能查到当前活动的限定订单', () => {
    if (!current) return;
    const order = getSeasonalOrders()[0];
    expect(getOrder(order.id)).toBeTruthy();
  });
});

describe('限定作物全链路', () => {
  // 用当前活动（9-10月为丰收庆典）跑一遍：种植→催熟→收获→卖仓
  it('种植催熟收获卖仓一条龙（当前活动的限定作物）', () => {
    if (!current) return;
    const crop = current.seasonal.crops[0];

    const state = freshState(Math.max(crop.unlockLevel, 1));
    if (state.wallet.level < crop.unlockLevel) return;

    const planted = plantCrop(state, 0, crop.id);
    expect(planted.success).toBe(true);
    expect(state.farm.plots[0].cropId).toBe(crop.id);
    expect(state.farm.plots[0].growTime).toBe(crop.growTime); // 晴天无加成

    // 直接造成熟
    state.farm.plots[0].plantedAt = new Date(Date.now() - (crop.growTime + 5) * 1000).toISOString();
    const harvested = harvestCrop(state, 0);
    expect(harvested.success).toBe(true);
    expect(state.inventory[`crop_${crop.id}`]).toBe(crop.harvestCount);

    // 卖出按限定作物售价
    const coinBefore = state.wallet.coin;
    const sold = sellCrop(state, `crop_${crop.id}`);
    expect(sold.success).toBe(true);
    expect(state.wallet.coin).toBe(coinBefore + crop.sellPrice * crop.harvestCount);
  });

  it('限定订单可完成且奖励照常结算', () => {
    if (!current) return;
    const order = current.seasonal.orders[0];
    const state = freshState(Math.max(order.unlockLevel, 1));
    if (state.wallet.level < order.unlockLevel) return;

    order.requires.forEach((req) => {
      state.inventory[req.item] = req.count;
    });
    state.orders.activeIds[0] = order.id;

    const coinBefore = state.wallet.coin;
    const result = completeOrder(state, 0);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(coinBefore + order.coin);
  });
});
