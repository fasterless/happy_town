// 农场系统模块
import { getCrop } from '../config/crops.js';
import { PLOT_UNLOCK_LEVELS, GAME_CONFIG } from '../config/constants.js';
import { addItem, spendItem, hasEnough, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { applyWeatherToGrowTime } from './weather.js';
import { recordCropHarvest } from './codex.js';
import { hybridRecipes } from '../config/hybrid.js';
import { applyPetToGrowTime, applyPetToSeedPrice } from './pets.js';

// 金穗变异概率：收获时小概率额外掉一个 3 倍售价的金穗作物
const GOLD_CHANCE = 0.05;
// 金穗作物相对普通作物的售价倍数
export const GOLD_SELL_MULTIPLIER = 3;

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
 * 是否杂交作物（1200 段 id 段）
 */
export function isHybridCrop(cropId) {
  return hybridRecipes.some((r) => r.id === cropId);
}

/**
 * 某块农田需要的解锁等级
 * @param {number} plotIndex
 * @returns {number}
 */
export function getPlotUnlockLevel(plotIndex) {
  return PLOT_UNLOCK_LEVELS[plotIndex] ?? 99;
}

/**
 * 农田是否已解锁
 * @param {Object} state
 * @param {number} plotIndex
 * @returns {boolean}
 */
export function isPlotUnlocked(state, plotIndex) {
  if (plotIndex >= GAME_CONFIG.farm.basePlots) {
    // 扩建地块：靠买对应的扩建档位解锁，不看等级表
    return plotIndex < getPurchasedPlotCount(state);
  }
  return state.wallet.level >= getPlotUnlockLevel(plotIndex);
}

/**
 * 已解锁的农田数量
 * @param {Object} state
 * @returns {number}
 */
export function getUnlockedPlotCount(state) {
  return state.farm.plots.filter((_, index) => isPlotUnlocked(state, index)).length;
}

/**
 * 已购买扩建后拥有的地块总数（含基础 12 块）
 */
export function getPurchasedPlotCount(state) {
  const tiers = Array.isArray(state.farm.expansions) ? state.farm.expansions : [];
  let plots = GAME_CONFIG.farm.basePlots;
  for (const tier of tiers) {
    const config = GAME_CONFIG.farm.expansions.find((e) => e.plots === tier);
    if (config) plots = Math.max(plots, config.plots);
  }
  return Math.min(plots, GAME_CONFIG.farm.maxPlots);
}

/**
 * 下一档扩建（null 表示已扩满）
 */
export function getNextExpansion(state) {
  const owned = getPurchasedPlotCount(state);
  return GAME_CONFIG.farm.expansions.find((e) => e.plots > owned) || null;
}

/**
 * 购买下一档土地扩建
 * @param {Object} state
 * @returns {Object} { success, message, state }
 */
export function buyExpansion(state) {
  const next = getNextExpansion(state);
  if (!next) {
    return { success: false, message: "田地已经扩到最大啦" };
  }
  if (state.wallet.coin < next.coin || state.wallet.diamond < next.diamond) {
    return { success: false, message: `扩建需要🪙${next.coin}和💎${next.diamond}` };
  }

  state.wallet.coin -= next.coin;
  state.wallet.diamond -= next.diamond;
  if (!Array.isArray(state.farm.expansions)) {
    state.farm.expansions = [];
  }
  state.farm.expansions.push(next.plots);

  // 补齐新地块
  while (state.farm.plots.length < next.plots) {
    state.farm.plots.push(null);
  }

  logEvent(state, "farm_expand");
  emit(Events.FARM_EXPANDED, { plots: next.plots });

  return {
    success: true,
    message: `田地扩建到 ${next.plots} 块！`,
    state,
  };
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

  if (plotIndex < 0 || plotIndex >= GAME_CONFIG.farm.maxPlots) {
    return { success: false, message: "地块不存在" };
  }

  if (!isPlotUnlocked(state, plotIndex)) {
    return { success: false, message: `需要Lv.${getPlotUnlockLevel(plotIndex)}解锁这块田` };
  }

  if (state.farm.plots[plotIndex] !== null) {
    return { success: false, message: "地块已种植作物" };
  }

  // 杂交作物：优先消耗背包里的杂交种子（seed_<id>），
  // 没种子才走金币补种（价格比杂交高，给囤种子一个价值）
  const price = getSeedPrice(state, crop);
  const seedKey = `seed_${crop.id}`;
  const hasSeed = isHybridCrop(crop.id) && hasEnough(state, seedKey, 1);

  if (!hasSeed && !hasEnough(state, "coin", price)) {
    return { success: false, message: isHybridCrop(crop.id)
      ? "没有杂交种子，金币也不够补种"
      : "金币不足" };
  }

  if (hasSeed) {
    spendItem(state, seedKey, 1);
  } else {
    spendItem(state, "coin", price);
  }

  // 种植，并固化本次的生长时长
  state.farm.plots[plotIndex] = {
    cropId: crop.id,
    plantedAt: new Date().toISOString(),
    growTime: getGrowTime(state, crop),
  };

  if (!Array.isArray(state.farm.plantedTypes)) {
    state.farm.plantedTypes = [];
  }
  if (!state.farm.plantedTypes.includes(crop.id)) {
    state.farm.plantedTypes.push(crop.id);
  }

  // 记录事件
  logEvent(state, "plant_crop");
  logEvent(state, "buy_seed");
  emit(Events.CROP_PLANTED, { cropId, plotIndex });

  return { success: true, message: `种植了${crop.name}`, state };
}

/**
 * 收获一份作物入背包（金穗变异在此统一处理）
 * @param {Object} state
 * @param {Object} crop - 作物配置
 * @param {number} exp - 本次收获给的经验
 * @returns {Object} { message, exp, goldCount }
 */
function harvestPlotInto(state, crop, exp) {
  addItem(state, `crop_${crop.id}`, crop.harvestCount);
  recordCropHarvest(state, crop.id);
  if (isHybridCrop(crop.id)) {
    logEvent(state, "hybrid_harvest");
  }
  let message = `收获了${crop.harvestCount}个${crop.icon}${crop.name}`;
  let goldCount = 0;

  // 金穗变异：5% 概率额外掉一个 3 倍售价的金穗版本
  if (Math.random() < GOLD_CHANCE) {
    addItem(state, `gold_${crop.id}`, 1);
    goldCount = 1;
    if (!state.farm.goldStats) state.farm.goldStats = { totalGold: 0 };
    state.farm.goldStats.totalGold += 1;
    message += `，还长出一株✨金穗${crop.name}！`;
    emit(Events.GOLD_CROP_HARVESTED, { cropId: crop.id });
  }

  addItem(state, "exp", exp);
  logEvent(state, "harvest_crop");
  trackDaily(state, "harvest", 1);

  return { message, exp, goldCount };
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

  // 收获作物（含金穗变异）
  const result = harvestPlotInto(state, crop, 1);

  // 清空地块
  state.farm.plots[plotIndex] = null;

  emit(Events.CROP_HARVESTED, { cropId: crop.id, plotIndex });

  return {
    success: true,
    message: `${result.message}，获得${result.exp}经验`,
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
  let goldCount = 0;
  const harvested = {};

  state.farm.plots.forEach((plot, index) => {
    if (plot && isPlotMature(plot)) {
      const crop = getCrop(plot.cropId);
      if (crop) {
        const result = harvestPlotInto(state, crop, 1);
        harvested[crop.name] = (harvested[crop.name] || 0) + crop.harvestCount;
        count++;
        totalExp++;
        if (result.goldCount) goldCount += result.goldCount;

        state.farm.plots[index] = null;
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
    message: `收获了${harvestText}，获得${totalExp}经验${goldCount ? `，其中✨金穗作物×${goldCount}！` : ''}`,
    state
  };
}

/**
 * 一键种植：把当前选中作物铺满所有已解锁的空地，金币不够就种到停
 * @param {Object} state
 * @param {number} cropId
 * @returns {Object} { success, count, message, state }
 */
export function plantAll(state, cropId) {
  const crop = getCrop(cropId);
  if (!crop) {
    return { success: false, count: 0, message: "作物不存在" };
  }
  if (state.wallet.level < crop.unlockLevel) {
    return { success: false, count: 0, message: `需要Lv.${crop.unlockLevel}解锁` };
  }

  let count = 0;
  const price = getSeedPrice(state, crop);
  const hybrid = isHybridCrop(crop.id);
  // 杂交作物：种子或金币任一够就能继续种（plantCrop 内部优先扣种子）
  const canAffordOne = () => (hybrid && hasEnough(state, `seed_${crop.id}`, 1)) || hasEnough(state, "coin", price);

  for (let index = 0; index < state.farm.plots.length; index++) {
    if (!isPlotUnlocked(state, index)) continue;
    if (state.farm.plots[index] !== null) continue;
    if (!canAffordOne()) break; // 种子和金币都不够就停，不报错

    const result = plantCrop(state, index, cropId);
    if (result.success) count++;
  }

  if (count === 0) {
    return {
      success: false,
      count: 0,
      message: canAffordOne() ? "没有可种的空地" : hybrid
        ? `种子和金币都不够，种一株${crop.name}需要🌱种子或🪙${price}`
        : `金币不足，种一株${crop.name}需要🪙${price}`,
      state,
    };
  }

  return {
    success: true,
    count,
    message: `一键种下了${count}株${crop.icon}${crop.name}`,
    state,
  };
}

/**
 * 出售背包里的作物 / 金穗作物
 * @param {Object} state
 * @param {string} itemKey - crop_<id> 或 gold_<id>
 * @param {number} [count] - 出售数量，缺省为全部
 * @returns {Object} { success, message, state }
 */
export function sellCrop(state, itemKey, count) {
  const match = /^(crop|gold)_(\d+)$/.exec(itemKey || "");
  if (!match) {
    return { success: false, message: "只能出售作物或金穗作物" };
  }

  const crop = getCrop(Number(match[2]));
  if (!crop) {
    return { success: false, message: "作物不存在" };
  }

  const owned = getCount(state, itemKey);
  if (owned < 1) {
    return { success: false, message: "背包里没有可出售的作物" };
  }

  const amount = Math.min(owned, Math.max(1, Math.floor(count ?? owned)));
  const unitPrice = match[1] === "gold"
    ? crop.sellPrice * GOLD_SELL_MULTIPLIER
    : crop.sellPrice;

  addItem(state, "coin", unitPrice * amount);
  spendItem(state, itemKey, amount);
  logEvent(state, "sell_crop");

  const label = match[1] === "gold" ? `✨金穗${crop.name}` : `${crop.name}`;
  return {
    success: true,
    message: `卖出${amount}个${crop.icon}${label}，获得🪙${unitPrice * amount}`,
    state,
  };
}

/**
 * 给一块地用加速券：直接把 plantedAt 拨回到成熟
 * @param {Object} state
 * @param {number} plotIndex
 * @returns {Object} { success, message, state }
 */
export function speedUpPlot(state, plotIndex) {
  const plot = state.farm.plots[plotIndex];
  if (!plot) {
    return { success: false, message: "这块地没有作物" };
  }
  if (isPlotMature(plot)) {
    return { success: false, message: "作物已经成熟，不用加速啦" };
  }
  if (!hasEnough(state, "speed_ticket", 1)) {
    return { success: false, message: "没有加速券了，去湖畔钓几个漂流瓶吧" };
  }

  spendItem(state, "speed_ticket", 1);

  const growTime = getPlotGrowTime(plot);
  plot.plantedAt = new Date(Date.now() - growTime * 1000).toISOString();

  logEvent(state, "speed_up_plot");
  emit(Events.CROP_SPED_UP, { plotIndex });

  return { success: true, message: "⏩ 加速成功，作物瞬间成熟！", state };
}

/**
 * 获取指定物品的售价（金穗按 3 倍算），供卖仓界面展示
 * @param {string} itemKey
 * @returns {number} 单价（未知物品返回 0）
 */
export function getCropSellPrice(itemKey) {
  const match = /^(crop|gold)_(\d+)$/.exec(itemKey || "");
  if (!match) return 0;
  const crop = getCrop(Number(match[2]));
  if (!crop) return 0;
  return match[1] === "gold" ? crop.sellPrice * GOLD_SELL_MULTIPLIER : crop.sellPrice;
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
