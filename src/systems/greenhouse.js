// 温室大棚系统（第七轮 2/3）
//
// 和农场共用种植/收获的结算（farm.js 的 plantCrop、harvestCrop），
// 这里只负责温室自己的三件事：地块在不在、今天还能不能种、
// 以及温室里的作物不受天气影响。
import { GREENHOUSE_MIN_LEVEL, GREENHOUSE_PLOTS, greenhouseCrops } from '../config/greenhouse.js';
import { todayKey } from '../utils/time.js';

/**
 * 温室是否解锁
 */
export function isGreenhouseUnlocked(state) {
  return state.wallet.level >= GREENHOUSE_MIN_LEVEL;
}

/**
 * 某个下标是不是温室地块（温室排在普通农田后面，下标 21 起）
 */
export function isGreenhousePlot(plotIndex) {
  return isGreenhouseIndex(plotIndex);
}

// 温室地块从农场地块数组的这个下标开始。
// 用常量而不是农场的 maxPlots，是为了让温室下标和农场扩建互不影响：
// 农场最多 21 块（下标 0-20），温室固定占 21-26。
const GREENHOUSE_FIRST_INDEX = 21;

export function isGreenhouseIndex(plotIndex) {
  return plotIndex >= GREENHOUSE_FIRST_INDEX
    && plotIndex < GREENHOUSE_FIRST_INDEX + GREENHOUSE_PLOTS;
}

/**
 * 今天还能种的温室地块下标（跨天自动清空）
 */
export function getGreenhouseUsedToday(state) {
  if (state.greenhouse?.date !== todayKey()) return [];
  return Array.isArray(state.greenhouse.usedToday) ? state.greenhouse.usedToday : [];
}

/**
 * 这块温室地今天还能不能种
 */
export function canPlantGreenhouse(state, plotIndex) {
  return isGreenhouseIndex(plotIndex) && !getGreenhouseUsedToday(state).includes(plotIndex);
}

/**
 * 记一笔：这块温室地今天种过了（跨天时顺手把昨天的记录清掉）
 */
export function markGreenhousePlanted(state, plotIndex) {
  const today = todayKey();
  if (state.greenhouse.date !== today) {
    state.greenhouse.date = today;
    state.greenhouse.usedToday = [];
  }
  if (!state.greenhouse.usedToday.includes(plotIndex)) {
    state.greenhouse.usedToday.push(plotIndex);
  }
  state.greenhouse.totalPlanted = (state.greenhouse.totalPlanted || 0) + 1;
}

/**
 * 当前等级能在温室里种的作物
 */
export function getAvailableGreenhouseCrops(state) {
  return greenhouseCrops.filter((crop) => state.wallet.level >= crop.unlockLevel);
}

export { greenhouseCrops, GREENHOUSE_MIN_LEVEL, GREENHOUSE_PLOTS, GREENHOUSE_FIRST_INDEX };
