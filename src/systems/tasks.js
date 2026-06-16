// 任务系统模块
import { dailyTasks } from '../config/tasks.js';
import { activeBoxes } from '../config/tasks.js';
import { addRewards } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { isTaskComplete } from '../utils/analytics.js';

/**
 * 领取任务奖励
 * @param {Object} state - 游戏状态
 * @param {string} taskId - 任务ID
 * @returns {Object} 结果 { success, message, state }
 */
export function claimTask(state, taskId) {
  const task = dailyTasks.find(t => t.id === taskId);
  if (!task) {
    return { success: false, message: "任务不存在" };
  }

  // 检查是否已领取
  if (state.daily.claimedTasks[taskId]) {
    return { success: false, message: "已经领取过了" };
  }

  // 检查是否完成
  if (!isTaskComplete(state, task)) {
    return { success: false, message: "任务尚未完成" };
  }

  // 发放奖励
  addRewards(state, task.rewards);

  // 增加活跃度
  state.daily.activeScore += task.active;

  // 标记已领取
  state.daily.claimedTasks[taskId] = true;

  logEvent(state, "task_claim");

  return { success: true, message: `领取了任务奖励，活跃度+${task.active}`, state };
}

/**
 * 领取活跃度宝箱
 * @param {Object} state - 游戏状态
 * @param {number} score - 宝箱所需分数
 * @returns {Object} 结果 { success, message, state }
 */
export function claimActiveBox(state, score) {
  const box = activeBoxes.find(b => b.score === score);
  if (!box) {
    return { success: false, message: "宝箱不存在" };
  }

  // 检查是否已领取
  if (state.daily.claimedBoxes[score]) {
    return { success: false, message: "已经领取过了" };
  }

  // 检查活跃度是否足够
  if (state.daily.activeScore < score) {
    return { success: false, message: "活跃度不足" };
  }

  // 发放奖励
  addRewards(state, box.rewards);

  // 标记已领取
  state.daily.claimedBoxes[score] = true;

  logEvent(state, "box_claim");

  return { success: true, message: "领取了活跃度宝箱", state };
}

/**
 * 手动重置每日任务（用于测试）
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, message, state }
 */
export function resetDaily(state) {
  const { createDailyState } = require('../core/state.js');
  state.daily = createDailyState();
  return { success: true, message: "每日任务已重置", state };
}

/**
 * 获取可领取的任务数量
 * @param {Object} state - 游戏状态
 * @returns {number} 数量
 */
export function getClaimableTaskCount(state) {
  return dailyTasks.filter(task => {
    if (state.daily.claimedTasks[task.id]) return false;
    return isTaskComplete(state, task);
  }).length;
}

/**
 * 获取可领取的宝箱数量
 * @param {Object} state - 游戏状态
 * @returns {number} 数量
 */
export function getClaimableBoxCount(state) {
  return activeBoxes.filter(box => {
    if (state.daily.claimedBoxes[box.score]) return false;
    return state.daily.activeScore >= box.score;
  }).length;
}

/**
 * 检查任务是否已领取
 * @param {Object} state - 游戏状态
 * @param {string} taskId - 任务ID
 * @returns {boolean} 是否已领取
 */
export function isTaskClaimed(state, taskId) {
  return !!state.daily.claimedTasks[taskId];
}

/**
 * 检查宝箱是否已领取
 * @param {Object} state - 游戏状态
 * @param {number} score - 宝箱分数
 * @returns {boolean} 是否已领取
 */
export function isBoxClaimed(state, score) {
  return !!state.daily.claimedBoxes[score];
}
