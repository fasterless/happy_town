// 农场系统模块
import { getCrop } from '../config/crops.js';
import { addItem, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { applyWeatherToGrowTime } from './weather.js';
import { applyPetToGrowTime, applyPetToSeedPrice } from './pets.js';

/**
 * 计算一次种植的实际种子价格（含宠物折扣）
 * @param {Object} state - 游戏状态
 * @param {Object} crop - 作物配置
 * @returns {number} 实际价格
 */
export function getSeedPrice(state, crop) {
  return applyPetToSeedPrice(crop.seedPrice, state);
}

/**
 * 计算一次种植的实际生长时长（含天气与宠物加成）
 *
 * 结果在种植时写入地块，之后天气变化不会回溯影响已种下的作物，
 * 这样倒计时才是稳定的。
 * @param {Object} state - 游戏状态
 * @param {Object} crop - 作物配置
 * @returns {number} 生长秒数
 */
export function getGrowTime(state, crop) {
  return applyPetToGrowTime(applyWeatherToGrowTime(crop.growTime, state), state);
}

/**
 * 读取地块的生长时长，兼容没有 growTime 字段的旧存档
 * @param {Object} plot - 地块对象
 * @returns {number} 生长秒数
 */
export function getPlotGrowTime(plot) {
  if (!plot) return 0;
  if (typeof plot.growTime === 'number' && plot.growTime > 0) {
    return plot.growTime;
  }
  const crop = getCrop(plot.cropId);
  return crop ? crop.growTime : 0;
}

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

  // 检查金币（宠物折扣后的价格）
  const price = getSeedPrice(state, crop);
  if (!hasEnough(state, "coin", price)) {
    return { success: false, message: "金币不足" };
  }

  // 扣除金币
  spendItem(state, "coin", price);

  // 种植，并固化本次的生长时长
  state.farm.plots[plotIndex] = {
    cropId: crop.id,
    plantedAt: new Date().toISOString(),
    growTime: getGrowTime(state, crop),
  };

  // 记录事件
  logEvent(state, "plant_crop");
  logEvent(state, "buy_seed");
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
 * 获取地块已生长的秒数
 * @param {Object} plot - 地块对象
 * @returns {number} 已经过的秒数
 */
export function getElapsedSeconds(plot) {
  if (!plot) return 0;
  const plantedTime = new Date(plot.plantedAt).getTime();
  return Math.floor((Date.now() - plantedTime) / 1000);
}

/**
 * 判断地块是否成熟
 * @param {Object} plot - 地块对象
 * @returns {boolean} 是否成熟
 */
export function isPlotMature(plot) {
  if (!plot) return false;

  const growTime = getPlotGrowTime(plot);
  if (!growTime) return false;

  return getElapsedSeconds(plot) >= growTime;
}

/**
 * 获取剩余生长时间
 * @param {Object} plot - 地块对象
 * @returns {number} 剩余秒数
 */
export function getRemainingSeconds(plot) {
  if (!plot) return 0;

  const growTime = getPlotGrowTime(plot);
  if (!growTime) return 0;

  return Math.max(0, growTime - getElapsedSeconds(plot));
}

/**
 * 获取作物生长阶段（用于显示不同图标）
 * @param {Object} plot - 地块对象
 * @returns {string} 阶段 (seed/sprout/growing/mature)
 */
export function getCropGrowthStage(plot) {
  if (!plot) return 'empty';

  const growTime = getPlotGrowTime(plot);
  if (!growTime) return 'empty';

  const progress = getElapsedSeconds(plot) / growTime;

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
