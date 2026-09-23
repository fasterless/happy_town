// 天赋树系统（第七轮 1/3）
//
// 三件事：查剩余天赋点、点亮节点（扣点、记入 state.talents.unlocked）、
// 以及给其他系统一个「这个加成类型一共乘多少」的查询。
// 天赋加成和料理增益、宠物、护符叠乘，数值都刻意温和，叠在一起也不失控。
import {
  talentBranches, talentNodes, getTalentNode, getBranchNodes,
  getTalentPointsForLevel, TALENT_MIN_LEVEL,
} from '../config/talents.js';
import { logEvent, trackDaily } from '../utils/analytics.js';

/**
 * 天赋树是否解锁
 */
export function isTalentsUnlocked(state) {
  return state.wallet.level >= TALENT_MIN_LEVEL;
}

/**
 * 已点亮的节点 id 列表（老存档兜底为空）
 */
export function getUnlockedNodes(state) {
  return Array.isArray(state.talents?.unlocked) ? state.talents.unlocked : [];
}

/**
 * 一共拿到过多少天赋点（随等级增长）
 */
export function getTotalTalentPoints(state) {
  return getTalentPointsForLevel(state.wallet.level);
}

/**
 * 已经花掉的天赋点
 */
export function getSpentTalentPoints(state) {
  const unlocked = getUnlockedNodes(state);
  return talentNodes
    .filter((node) => unlocked.includes(node.id))
    .reduce((sum, node) => sum + node.cost, 0);
}

/**
 * 还能花的天赋点
 */
export function getTalentPointsLeft(state) {
  return Math.max(0, getTotalTalentPoints(state) - getSpentTalentPoints(state));
}

/**
 * 天赋对某个加成类型的总倍率（没点对应节点时返回 1）
 * 同类型的多个节点叠乘。
 * @param {Object} state
 * @param {string} type - growthSpeed / harvestBonus / fishingLuck / miningLuck / orderBonus / craftSpeed
 * @returns {number}
 */
export function getTalentMultiplier(state, type) {
  const unlocked = getUnlockedNodes(state);
  return talentNodes
    .filter((node) => unlocked.includes(node.id) && node.effect.type === type)
    .reduce((factor, node) => factor * node.effect.value, 1);
}

/**
 * 点亮一个节点：扣天赋点，记入已点亮列表。必须按分支顺序点。
 * @returns {Object} { success, message, state }
 */
export function unlockTalent(state, nodeId) {
  if (!isTalentsUnlocked(state)) {
    return { success: false, message: `Lv.${TALENT_MIN_LEVEL} 解锁天赋树` };
  }

  const node = getTalentNode(nodeId);
  if (!node) return { success: false, message: '没有这个天赋' };

  const unlocked = getUnlockedNodes(state);
  if (unlocked.includes(node.id)) {
    return { success: false, message: `「${node.name}」已经点亮了` };
  }

  // 顺序限制：同一分支里 rank 更小的节点必须先点亮
  const previous = getBranchNodes(node.branch).find((other) => other.rank === node.rank - 1);
  if (previous && !unlocked.includes(previous.id)) {
    return { success: false, message: `先点亮「${previous.name}」` };
  }

  if (getTalentPointsLeft(state) < node.cost) {
    return { success: false, message: '天赋点不够' };
  }

  state.talents.unlocked.push(node.id);
  logEvent(state, 'talent_unlock');
  trackDaily(state, 'talent', 1);

  return {
    success: true,
    message: `点亮了${node.name}：${node.desc}`,
    state,
  };
}

/**
 * 天赋树面板（渲染用）：按分支列出节点，附是否已点、前置是否满足、点数够不够
 */
export function getTalentBoard(state) {
  const unlocked = getUnlockedNodes(state);
  const pointsLeft = getTalentPointsLeft(state);

  return talentBranches.map((branch) => ({
    branch,
    nodes: getBranchNodes(branch.id).map((node) => {
      const previous = getBranchNodes(branch.id).find((other) => other.rank === node.rank - 1);
      const prevDone = !previous || unlocked.includes(previous.id);
      return {
        node,
        unlocked: unlocked.includes(node.id),
        available: prevDone && pointsLeft >= node.cost,
      };
    }),
  }));
}

export { talentBranches, TALENT_MIN_LEVEL };
