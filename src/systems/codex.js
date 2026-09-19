// 图鉴系统
//
// 收录玩家「见过」的东西：收获过的作物、拥有过的家具、钓到过的鱼。
// 关键点：图鉴记录的是"曾经拥有"，卖出/消耗之后条目仍然保留。
// 各分类按收录进度发档位奖励（全收录另有钻石大奖）。
import { crops } from '../config/crops.js';
import { furniture } from '../config/furniture.js';
import { fishes } from './fishing.js';
import { addRewards } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';

// 图鉴收集档：达到该比例时可以领一次奖励
export const CODEX_TIERS = [
  { id: "t25",  ratio: 0.25, rewards: { coin: 500 } },
  { id: "t50",  ratio: 0.50, rewards: { diamond: 30, coin: 1000 } },
  { id: "t75",  ratio: 0.75, rewards: { diamond: 80, speed_ticket: 3 } },
  { id: "t100", ratio: 1.00, rewards: { diamond: 200, coin: 5000 } },
];

/**
 * 把一个 id 记录进图鉴分类（已收录则跳过）
 * @returns {boolean} 本次调用是否新增了收录
 */
function record(state, category, id) {
  const list = state.codex[category];
  if (!Array.isArray(list)) {
    state.codex[category] = [];
  }
  if (list.includes(id)) return false;
  list.push(id);
  return true;
}

/**
 * 收获作物时收录图鉴
 * @param {Object} state
 * @param {number} cropId
 */
export function recordCropHarvest(state, cropId) {
  if (record(state, "crops", cropId)) {
    logEvent(state, "codex_new_crop");
    emit(Events.CODEX_NEW_ENTRY, { category: "crops", id: cropId });
  }
}

/**
 * 拥有家具时收录图鉴（购买或奖励入包都算）
 * @param {Object} state
 * @param {number} furnitureId
 */
export function recordFurniture(state, furnitureId) {
  if (record(state, "furniture", furnitureId)) {
    logEvent(state, "codex_new_furniture");
    emit(Events.CODEX_NEW_ENTRY, { category: "furniture", id: furnitureId });
  }
}

/**
 * 钓到鱼时收录图鉴
 * @param {Object} state
 * @param {number} fishId
 */
export function recordFish(state, fishId) {
  if (record(state, "fishes", fishId)) {
    logEvent(state, "codex_new_fish");
    emit(Events.CODEX_NEW_ENTRY, { category: "fishes", id: fishId });
  }
}

/**
 * 老存档回填：按当前库存一次性把「其实早该收录」的条目补进图鉴。
 * loadState 时调用，让老玩家打开图鉴就有内容。
 * @param {Object} state
 */
export function backfillCodex(state) {
  // 作物：库存里的作物 + 种过的记录
  Object.keys(state.inventory).forEach((key) => {
    const match = /^crop_(\d+)$/.exec(key);
    if (match && (state.inventory[key] || 0) > 0) {
      record(state, "crops", Number(match[1]));
    }
  });
  (state.farm.plantedTypes || []).forEach((cropId) => record(state, "crops", cropId));

  // 家具：库存里还留着的
  Object.keys(state.inventory).forEach((key) => {
    const match = /^f_(\d+)$/.exec(key);
    if (match && (state.inventory[key] || 0) > 0) {
      record(state, "furniture", Number(match[1]));
    }
  });

  // 鱼：库存里还留着的
  Object.keys(state.inventory).forEach((key) => {
    const match = /^fish_(\d+)$/.exec(key);
    if (match && (state.inventory[key] || 0) > 0) {
      record(state, "fishes", Number(match[1]));
    }
  });
}

/**
 * 总收录进度（跨分类合计）
 * @param {Object} state
 * @returns {{ collected: number, total: number, ratio: number }}
 */
export function getCodexProgress(state) {
  const collected = state.codex.crops.length
    + state.codex.furniture.length
    + state.codex.fishes.length;
  const total = crops.length + furniture.length + fishes.length;
  return { collected, total, ratio: total ? collected / total : 0 };
}

/**
 * 某档位奖励是否可领
 * @param {Object} state
 * @param {string} tierId
 * @returns {boolean}
 */
export function canClaimCodexTier(state, tierId) {
  const tier = CODEX_TIERS.find((t) => t.id === tierId);
  if (!tier) return false;
  if (state.codex.claimedTiers.includes(tierId)) return false;
  return getCodexProgress(state).ratio >= tier.ratio;
}

/**
 * 领取一档图鉴奖励
 * @param {Object} state
 * @param {string} tierId
 * @returns {Object} { success, message, state }
 */
export function claimCodexTier(state, tierId) {
  if (!canClaimCodexTier(state, tierId)) {
    return { success: false, message: "还没有达到这一档的收录进度" };
  }

  const tier = CODEX_TIERS.find((t) => t.id === tierId);
  addRewards(state, tier.rewards);
  state.codex.claimedTiers.push(tierId);
  logEvent(state, "codex_claim_tier");

  return {
    success: true,
    message: `图鉴收录达到 ${Math.round(tier.ratio * 100)}%，奖励已发放！`,
    state,
  };
}
