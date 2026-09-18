// 农场核心经济单元测试
import { describe, it, expect, beforeEach } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import {
  plantCrop, harvestCrop, harvestAllMature,
  isPlotMature, isPlotUnlocked, getUnlockedPlotCount,
  getGrowTime, getSeedPrice, getPlotUnlockLevel,
  getCropGrowthStage, getRemainingSeconds,
} from '../src/systems/farm.js';
import { getCrop } from '../src/config/crops.js';

// 新档：Lv.1、金币 120、前 6 块田可用（晴天、无宠物加成）
function freshState() {
  const state = createDefaultState();
  state.user.created = true;
  return state;
}

const WHEAT = 1001; // 小麦：seedPrice 2 / growTime 30 / harvestCount 2 / Lv.1

// 构造一个已种下 T 秒前的小麦地块
function wheatPlot(secondsAgo) {
  return {
    cropId: WHEAT,
    plantedAt: new Date(Date.now() - secondsAgo * 1000).toISOString(),
    growTime: 30,
  };
}

beforeEach(() => { /* 每个用例各自 freshState，避免共享引用 */ });

describe('农田解锁', () => {
  it('Lv.1 解锁前 6 块田', () => {
    const state = freshState();
    expect(getUnlockedPlotCount(state)).toBe(6);
    expect(isPlotUnlocked(state, 5)).toBe(true);
    expect(isPlotUnlocked(state, 6)).toBe(false);
  });

  it('越界的田永不解锁', () => {
    expect(getPlotUnlockLevel(99)).toBe(99);
  });
});

describe('种植 plantCrop', () => {
  it('成功种植：扣金币、写地块、固化生长时长', () => {
    const state = freshState();
    const wheat = getCrop(WHEAT);
    const result = plantCrop(state, 0, WHEAT);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(120 - wheat.seedPrice);
    const plot = state.farm.plots[0];
    expect(plot.cropId).toBe(WHEAT);
    expect(plot.growTime).toBe(getGrowTime(state, wheat)); // 晴天 = 30
    expect(new Date(plot.plantedAt).getTime()).toBeGreaterThan(0);
    expect(state.farm.plantedTypes).toContain(WHEAT);
  });

  it('等级不足的作物不能种', () => {
    const state = freshState();
    const result = plantCrop(state, 0, 1002); // 番茄 Lv.2
    expect(result.success).toBe(false);
    expect(result.message).toContain("Lv.2");
    expect(state.farm.plots[0]).toBeNull();
  });

  it('未解锁的田不能种', () => {
    const state = freshState();
    const result = plantCrop(state, 6, WHEAT); // 第 7 块田需要 Lv.3
    expect(result.success).toBe(false);
    expect(result.message).toContain("Lv.3");
  });

  it('越界索引被拒绝', () => {
    const state = freshState();
    expect(plantCrop(state, -1, WHEAT).success).toBe(false);
    expect(plantCrop(state, 99, WHEAT).success).toBe(false);
  });

  it('已占用的田不能重复种', () => {
    const state = freshState();
    expect(plantCrop(state, 0, WHEAT).success).toBe(true);
    const again = plantCrop(state, 0, WHEAT);
    expect(again.success).toBe(false);
    expect(again.message).toContain("已种植");
  });

  it('金币不足时不能种', () => {
    const state = freshState();
    state.wallet.coin = 1; // 小麦种子 2 金币
    const result = plantCrop(state, 0, WHEAT);
    expect(result.success).toBe(false);
    expect(result.message).toContain("金币不足");
    expect(state.farm.plots[0]).toBeNull();
    expect(state.wallet.coin).toBe(1); // 不能扣钱
  });

  it('不存在的作物被拒绝', () => {
    const state = freshState();
    expect(plantCrop(state, 0, 99999).success).toBe(false);
  });
});

describe('收获 harvestCrop', () => {
  it('未成熟不能收', () => {
    const state = freshState();
    state.farm.plots[0] = wheatPlot(10); // 30 秒才熟
    const result = harvestCrop(state, 0);
    expect(result.success).toBe(false);
    expect(result.message).toContain("尚未成熟");
  });

  it('空地块收获被拒绝', () => {
    const state = freshState();
    expect(harvestCrop(state, 0).success).toBe(false);
  });

  it('成熟收获：入背包 +1 经验并清空地块', () => {
    const state = freshState();
    state.farm.plots[0] = wheatPlot(31);
    const result = harvestCrop(state, 0);
    expect(result.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(2); // harvestCount
    expect(state.wallet.exp).toBe(1);
    expect(state.farm.plots[0]).toBeNull();
  });
});

describe('一键收获 harvestAllMature', () => {
  it('没有成熟作物时返回失败', () => {
    const state = freshState();
    state.farm.plots[0] = wheatPlot(5);
    const result = harvestAllMature(state);
    expect(result.success).toBe(false);
    expect(result.count).toBe(0);
  });

  it('只收获成熟的地块', () => {
    const state = freshState();
    state.farm.plots[0] = wheatPlot(31); // 成熟
    state.farm.plots[1] = wheatPlot(31); // 成熟
    state.farm.plots[2] = wheatPlot(5);  // 未熟
    const result = harvestAllMature(state);
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(state.inventory.crop_1001).toBe(4);
    expect(state.wallet.exp).toBe(2);
    expect(state.farm.plots[0]).toBeNull();
    expect(state.farm.plots[1]).toBeNull();
    expect(state.farm.plots[2]).not.toBeNull(); // 未熟的留下
  });
});

describe('生长进度', () => {
  it('成熟判定使用地块固化的 growTime', () => {
    expect(isPlotMature(wheatPlot(30))).toBe(true);
    expect(isPlotMature(wheatPlot(29))).toBe(false);
    expect(isPlotMature(null)).toBe(false);
  });

  it('剩余时间不为负', () => {
    expect(getRemainingSeconds(wheatPlot(40))).toBe(0);
    expect(getRemainingSeconds(wheatPlot(20))).toBe(10);
  });

  it('生长阶段按进度切换', () => {
    expect(getCropGrowthStage(null)).toBe('empty');
    expect(getCropGrowthStage(wheatPlot(0))).toBe('seed');
    expect(getCropGrowthStage(wheatPlot(10))).toBe('sprout');  // 0.33
    expect(getCropGrowthStage(wheatPlot(20))).toBe('growing'); // 0.66
    expect(getCropGrowthStage(wheatPlot(30))).toBe('mature');  // 1.0
  });

  it('雨天种植时生长时长缩短（1.2 倍率）', () => {
    const state = freshState();
    state.weather.current = "rainy";
    const wheat = getCrop(WHEAT);
    expect(getGrowTime(state, wheat)).toBe(25); // Math.floor(30 / 1.2)
    expect(getSeedPrice(state, wheat)).toBe(2); // 价格不受天气影响
  });
});
