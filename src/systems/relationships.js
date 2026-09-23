// 邻居关系系统
//
// 每位邻居有独立的熟悉度。达到阶段时发放一次奖励，
// 旧进度再次触发时只补发还没领过的阶段，不会重复发放。
import { relationshipTiers, relationshipActions } from '../config/relationships.js';
import { addRewards } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { formatRewards } from '../utils/format.js';

export function initRelationships(state) {
  if (!state.relationships || typeof state.relationships !== 'object') {
    state.relationships = { points: {}, claimed: {} };
  }
  if (!state.relationships.points || typeof state.relationships.points !== 'object') {
    state.relationships.points = {};
  }
  if (!state.relationships.claimed || typeof state.relationships.claimed !== 'object') {
    state.relationships.claimed = {};
  }
  return state;
}

export function getRelationshipPoints(state, friendId) {
  initRelationships(state);
  return Math.max(0, Number(state.relationships.points[friendId]) || 0);
}

export function getReachedTiers(points) {
  return relationshipTiers.filter((tier) => points >= tier.points);
}

export function getRelationshipProgress(state, friendId) {
  const points = getRelationshipPoints(state, friendId);
  const reached = getReachedTiers(points);
  const current = reached[reached.length - 1] || null;
  const next = relationshipTiers.find((tier) => tier.points > points) || null;
  return { points, current, next, maxed: !next };
}

/**
 * 增加一位邻居的熟悉度，并补发新达到的阶段奖励。
 * @returns {{ gained: number, tiers: Array, rewardText: string }}
 */
export function gainRelationship(state, friendId, action) {
  const gained = relationshipActions[action] || 0;
  if (!friendId || gained < 1) return { gained: 0, tiers: [], rewardText: '' };

  initRelationships(state);
  const before = getRelationshipPoints(state, friendId);
  const after = before + gained;
  state.relationships.points[friendId] = after;

  const claimed = Array.isArray(state.relationships.claimed[friendId])
    ? state.relationships.claimed[friendId]
    : [];
  const newlyReached = getReachedTiers(after).filter((tier) => !claimed.includes(tier.id));
  const rewards = {};
  newlyReached.forEach((tier) => {
    Object.entries(tier.rewards).forEach(([key, count]) => {
      rewards[key] = (rewards[key] || 0) + count;
    });
    claimed.push(tier.id);
    logEvent(state, 'relationship_tier');
  });
  state.relationships.claimed[friendId] = claimed;
  if (newlyReached.length) addRewards(state, rewards);
  logEvent(state, 'relationship_gain');

  return {
    gained,
    tiers: newlyReached,
    rewardText: newlyReached.length ? formatRewards(rewards) : '',
  };
}
