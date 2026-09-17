// 社区系统模块
import { fountainStages } from '../config/npcs.js';
import { addItem, spendItem, hasEnough, addRewards } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';

/**
 * 加入社区
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, message, state }
 */
export function joinCommunity(state) {
  if (state.community.joined) {
    return { success: false, message: "已经加入社区了" };
  }

  // 检查等级
  if (state.wallet.level < 10) {
    return { success: false, message: "需要Lv.10解锁社区系统" };
  }

  state.community.joined = true;

  // 添加玩家到成员列表
  state.community.members.push({
    name: state.user.nickname,
    role: "成员",
    contribution: 0,
  });

  logEvent(state, "community_join");
  emit(Events.COMMUNITY_JOINED, {});

  return { success: true, message: "成功加入暖阳社区", state };
}

/**
 * 捐献资源到社区
 * @param {Object} state - 游戏状态
 * @param {string} itemKey - 物品键名
 * @param {number} amount - 数量
 * @returns {Object} 结果 { success, message, state }
 */
export function donateToCommunity(state, itemKey, amount) {
  if (!state.community.joined) {
    return { success: false, message: "需要先加入社区" };
  }

  const currentStage = getCurrentStage(state);
  if (!currentStage) {
    return { success: false, message: "所有阶段已完成" };
  }

  // 检查是否是当前阶段接受的资源
  const accepts = currentStage.accepts.map(a => a.item);
  if (!accepts.includes(itemKey)) {
    return { success: false, message: "当前阶段不接受该资源" };
  }

  // 检查是否有足够的资源
  if (!hasEnough(state, itemKey, amount)) {
    return { success: false, message: "资源不足" };
  }

  // 扣除资源
  spendItem(state, itemKey, amount);

  // 计算贡献值（金币效率减半）
  let contribution = amount;
  if (itemKey === "coin") {
    contribution = Math.floor(amount / 2);
  }

  // 增加进度
  state.community.progress += contribution;

  // 增加个人贡献值
  addItem(state, "communityContribution", contribution);
  addItem(state, "exp", 2);

  // 更新成员贡献
  const member = state.community.members.find(m => m.name === state.user.nickname);
  if (member) {
    member.contribution += contribution;
  }

  logEvent(state, "community_donate");
  trackDaily(state, "donate", 1);
  emit(Events.COMMUNITY_DONATED, { itemKey, amount, contribution });

  // 检查是否完成阶段
  checkStageCompletion(state);

  return {
    success: true,
    message: `捐献成功，获得${contribution}社区贡献和2经验`,
    state
  };
}

/**
 * 检查阶段是否完成
 * @param {Object} state - 游戏状态
 * @returns {Object} 更新后的状态
 */
export function checkStageCompletion(state) {
  const currentStage = getCurrentStage(state);
  if (!currentStage) return state;

  let stage = getCurrentStage(state);
  while (stage && state.community.progress >= stage.target) {
    addRewards(state, stage.reward);
    state.community.progress -= stage.target;
    state.community.stage++;

    emit(Events.COMMUNITY_STAGE_COMPLETE, {
      stage: stage.stage,
      reward: stage.reward,
    });

    stage = getCurrentStage(state);
  }

  return state;
}

/**
 * 获取当前阶段配置
 * @param {Object} state - 游戏状态
 * @returns {Object|null} 阶段配置
 */
export function getCurrentStage(state) {
  return fountainStages.find(s => s.stage === state.community.stage);
}

/**
 * 获取阶段完成进度百分比
 * @param {Object} state - 游戏状态
 * @returns {number} 进度百分比 (0-100)
 */
export function getStageProgress(state) {
  const currentStage = getCurrentStage(state);
  if (!currentStage) return 100;

  return Math.min(100, Math.floor((state.community.progress / currentStage.target) * 100));
}

/**
 * 检查是否所有阶段已完成
 * @param {Object} state - 游戏状态
 * @returns {boolean} 是否全部完成
 */
export function isAllStagesComplete(state) {
  return state.community.stage > fountainStages.length;
}
