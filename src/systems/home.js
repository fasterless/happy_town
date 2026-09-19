// 家园系统模块
import { getFurniture } from '../config/furniture.js';
import { canAfford, spendPrice, addItem, spendItem, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { furnitureKey } from '../utils/format.js';
import { recordFurniture } from './codex.js';

/**
 * 购买家具
 * @param {Object} state - 游戏状态
 * @param {number} furnitureId - 家具ID
 * @returns {Object} 结果 { success, message, state }
 */
export function buyFurniture(state, furnitureId) {
  const fur = getFurniture(furnitureId);
  if (!fur) {
    return { success: false, message: "家具不存在" };
  }

  // 检查等级
  if (state.wallet.level < fur.unlockLevel) {
    return { success: false, message: `需要Lv.${fur.unlockLevel}解锁` };
  }

  // 检查货币
  if (!canAfford(state, fur.priceType, fur.price)) {
    const currency = fur.priceType === "coin" ? "金币" : "钻石";
    return { success: false, message: `${currency}不足` };
  }

  // 扣除货币
  spendPrice(state, fur.priceType, fur.price);

  // 添加到背包
  const key = furnitureKey(furnitureId);
  addItem(state, key, 1);
  recordFurniture(state, furnitureId);

  // 记录事件
  logEvent(state, "furniture_buy");
  trackDaily(state, "buyFurniture", 1);
  emit(Events.FURNITURE_BOUGHT, { furnitureId });

  return { success: true, message: `购买了${fur.name}`, state };
}

/**
 * 查询背包里某件家具的剩余数量
 * @param {Object} state - 游戏状态
 * @param {number} furnitureId - 家具ID
 * @returns {number} 数量
 */
export function getFurnitureStock(state, furnitureId) {
  return getCount(state, furnitureKey(furnitureId));
}

/**
 * 摆放家具
 * @param {Object} state - 游戏状态
 * @param {number} layoutIndex - 布局位置索引 (0-35)
 * @param {number} furnitureId - 家具ID
 * @returns {Object} 结果 { success, message, state }
 */
export function placeFurniture(state, layoutIndex, furnitureId) {
  // 检查位置是否空闲
  if (state.home.layout[layoutIndex] !== null) {
    return { success: false, message: "该位置已有家具" };
  }

  // 检查背包中是否有该家具
  const key = furnitureKey(furnitureId);
  if (getCount(state, key) < 1) {
    return { success: false, message: "背包中没有该家具" };
  }

  // 从背包扣除
  spendItem(state, key, 1);

  // 放置到房间
  state.home.layout[layoutIndex] = {
    id: furnitureId,
    rotated: false,
  };

  // 记录事件
  logEvent(state, "furniture_place");
  emit(Events.FURNITURE_PLACED, { furnitureId, layoutIndex });

  return { success: true, message: "家具已摆放", state };
}

/**
 * 移除家具（收回背包）
 * @param {Object} state - 游戏状态
 * @param {number} layoutIndex - 布局位置索引
 * @returns {Object} 结果 { success, message, state }
 */
export function removeFurniture(state, layoutIndex) {
  const item = state.home.layout[layoutIndex];
  if (!item) {
    return { success: false, message: "该位置没有家具" };
  }

  // 收回背包
  const key = furnitureKey(item.id);
  addItem(state, key, 1);

  // 清空位置
  state.home.layout[layoutIndex] = null;

  return { success: true, message: "家具已收回", state };
}

/**
 * 旋转家具
 * @param {Object} state - 游戏状态
 * @param {number} layoutIndex - 布局位置索引
 * @returns {Object} 结果 { success, message, state }
 */
export function rotateFurniture(state, layoutIndex) {
  const item = state.home.layout[layoutIndex];
  if (!item) {
    return { success: false, message: "该位置没有家具" };
  }

  item.rotated = !item.rotated;

  return { success: true, message: "家具已旋转", state };
}

/**
 * 清空房间
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, message, state }
 */
export function clearRoom(state) {
  let count = 0;

  state.home.layout.forEach((item, index) => {
    if (item) {
      const key = furnitureKey(item.id);
      addItem(state, key, 1);
      state.home.layout[index] = null;
      count++;
    }
  });

  if (count === 0) {
    return { success: false, message: "房间已经是空的" };
  }

  return { success: true, message: `收回了${count}件家具`, state };
}

/**
 * 保存房间布局
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, message, state }
 */
export function saveRoom(state) {
  state.home.savedAt = new Date().toISOString();
  return { success: true, message: "房间布局已保存", state };
}

/**
 * 计算房间装饰评分
 * @param {Object} state - 游戏状态
 * @returns {Object} 评分结果 { score, grade, details }
 */
export function calculateRoomScore(state) {
  let score = 0;
  const details = [];

  // 统计家具
  const furnitureCount = state.home.layout.filter(item => item !== null).length;
  const baseScore = furnitureCount * 10;
  score += baseScore;
  details.push(`基础分：${furnitureCount}件家具 × 10 = ${baseScore}`);

  // 统计家具类别
  const categories = {};
  state.home.layout.forEach(item => {
    if (item) {
      const fur = getFurniture(item.id);
      if (fur) {
        categories[fur.category] = (categories[fur.category] || 0) + 1;
      }
    }
  });

  // 风格一致性加成（同类家具2+件）
  let styleBonus = 0;
  Object.entries(categories).forEach(([category, count]) => {
    if (count >= 2) {
      const bonus = (count - 1) * 5;
      styleBonus += bonus;
      details.push(`${category}风格加成：${count}件 × 5 = ${bonus}`);
    }
  });
  score += styleBonus;

  // 对称布局加成（检查左右对称）
  let symmetryBonus = 0;
  if (isSymmetric(state.home.layout)) {
    symmetryBonus = 20;
    score += symmetryBonus;
    details.push(`对称布局加成：+${symmetryBonus}`);
  }

  // 完整性加成（填满所有格子）
  if (furnitureCount === 36) {
    const completionBonus = 50;
    score += completionBonus;
    details.push(`完美布局加成：+${completionBonus}`);
  }

  // 计算等级
  const grade = getScoreGrade(score);

  return { score, grade, details };
}

/**
 * 检查布局是否对称
 * @param {Array} layout - 布局数组
 * @returns {boolean} 是否对称
 */
function isSymmetric(layout) {
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      const leftIndex = row * 6 + col;
      const rightIndex = row * 6 + (5 - col);

      const left = layout[leftIndex];
      const right = layout[rightIndex];

      // 都为空或都有家具且ID相同才算对称
      if ((left === null) !== (right === null)) return false;
      if (left && right && left.id !== right.id) return false;
    }
  }
  return true;
}

/**
 * 根据分数获取等级
 * @param {number} score - 分数
 * @returns {string} 等级 (F/E/D/C/B/A/S)
 */
function getScoreGrade(score) {
  if (score >= 500) return 'S';
  if (score >= 400) return 'A';
  if (score >= 300) return 'B';
  if (score >= 200) return 'C';
  if (score >= 100) return 'D';
  if (score >= 50) return 'E';
  return 'F';
}
