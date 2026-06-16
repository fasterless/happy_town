// 农场系统模块
import { crops, getCrop } from '../config/crops.js';
import { addItem, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';

/**
 * 种植作物
 * @param {Object} state - 游戏状态
 * @param {number} plotIndex - 地块索引
 * @param {number} cropId - 作物ID
 * @returns {Object} 结果 { success, message, state }
 */
export function plantCrop(state, plotIndex, cropId) {
  const crop = getCrop(cropId);
  if (!crop) {
    return { success: false, message: "作物不存在" };
  }

  // 检查等级
  if (state.wallet.level < crop.unlockLevel) {
    return { success: false, message: `需要Lv.${crop.unlockLevel}解锁` };
  }

  // 检查地块是否空闲
  if (state.farm.plots[plotIndex] !== null) {
    return { success: false, message: "地块已种植作物" };
  }

  // 检查金币
  if (!hasEnough(state, "coin", crop.seedPrice)) {
    return { success: false, message: "金币不足" };
  }

  // 扣除金币
  spendItem(state, "coin", crop.seedPrice);

  // 种植
  state.farm.plots[plotIndex] = {
    cropId: crop.id,
    plantedAt: new Date().toISOString(),
  };

  // 记录事件
  logEvent(state, "plant_crop");
  logEvent(state, "buy_seed");
  trackDaily(state, "harvest", 0); // 为后续收获做准备
  emit(Events.CROP_PLANTED, { cropId, plotIndex });

  return { success: true, message: `种植了${crop.name}`, state };
}

/**
 * 收获作物
 * @param {Object} state - 游戏状态
 * @param {number} plotIndex - 地块索引
 * @returns {Object} 结果 { success, message, state }
 */
export function harvestCrop(state, plotIndex) {
  const plot = state.farm.plots[plotIndex];
  if (!plot) {
    return { success: false, message: "地块没有作物" };
  }

  if (!isPlotMature(plot)) {
    return { success: false, message: "作物尚未成熟" };
  }

  const crop = getCrop(plot.cropId);
  if (!crop) {
    return { success: false, message: "作物配置错误" };
  }

  // 收获作物
  const itemKey = `crop_${crop.id}`;
  addItem(state, itemKey, crop.harvestCount);
  addItem(state, "exp", 1);

  // 清空地块
  state.farm.plots[plotIndex] = null;

  // 记录事件
  logEvent(state, "harvest_crop");
  trackDaily(state, "harvest", 1);
  emit(Events.CROP_HARVESTED, { cropId: crop.id, plotIndex });

  return {
    success: true,
    message: `收获了${crop.harvestCount}个${crop.icon}${crop.name}，获得1经验`,
    state
  };
}

/**
 * 一键收获所有成熟作物
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, count, message, state }
 */
export function harvestAllMature(state) {
  let count = 0;
  let totalExp = 0;
  const harvested = {};

  state.farm.plots.forEach((plot, index) => {
    if (plot && isPlotMature(plot)) {
      const crop = getCrop(plot.cropId);
      if (crop) {
        const itemKey = `crop_${crop.id}`;
        addItem(state, itemKey, crop.harvestCount);
        addItem(state, "exp", 1);

        harvested[crop.name] = (harvested[crop.name] || 0) + crop.harvestCount;
        count++;
        totalExp++;

        state.farm.plots[index] = null;
        logEvent(state, "harvest_crop");
        trackDaily(state, "harvest", 1);
      }
    }
  });

  if (count === 0) {
    return { success: false, count: 0, message: "没有可收获的作物" };
  }

  const harvestText = Object.entries(harvested)
    .map(([name, count]) => `${name}×${count}`)
    .join("、");

  return {
    success: true,
    count,
    message: `收获了${harvestText}，获得${totalExp}经验`,
    state
  };
}

/**
 * 判断地块是否成熟
 * @param {Object} plot - 地块对象
 * @returns {boolean} 是否成熟
 */
export function isPlotMature(plot) {
  if (!plot) return false;

  const crop = getCrop(plot.cropId);
  if (!crop) return false;

  const plantedTime = new Date(plot.plantedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - plantedTime) / 1000);

  return elapsed >= crop.growTime;
}

/**
 * 获取剩余生长时间
 * @param {Object} plot - 地块对象
 * @returns {number} 剩余秒数
 */
export function getRemainingSeconds(plot) {
  if (!plot) return 0;

  const crop = getCrop(plot.cropId);
  if (!crop) return 0;

  const plantedTime = new Date(plot.plantedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - plantedTime) / 1000);
  const remaining = crop.growTime - elapsed;

  return Math.max(0, remaining);
}

/**
 * 获取作物生长阶段（用于显示不同图标）
 * @param {Object} plot - 地块对象
 * @returns {string} 阶段 (seed/sprout/growing/mature)
 */
export function getCropGrowthStage(plot) {
  if (!plot) return 'empty';

  const crop = getCrop(plot.cropId);
  if (!crop) return 'empty';

  const plantedTime = new Date(plot.plantedAt).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - plantedTime) / 1000);
  const progress = elapsed / crop.growTime;

  if (progress >= 1.0) return 'mature';
  if (progress >= 0.66) return 'growing';
  if (progress >= 0.33) return 'sprout';
  return 'seed';
}

/**
 * 获取生长阶段图标
 * @param {string} stage - 生长阶段
 * @returns {string} 图标
 */
export function getStageIcon(stage) {
  const icons = {
    empty: '',
    seed: '🌰',
    sprout: '🌱',
    growing: '🌿',
    mature: '✨',
  };
  return icons[stage] || '';
}
