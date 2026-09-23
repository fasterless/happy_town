// 邻居关系系统
//
// 每位邻居有独立的熟悉度。达到阶段时发放一次奖励，
// 旧进度再次触发时只补发还没领过的阶段，不会重复发放。
import { relationshipTiers, relationshipActions, getNeighborMemory } from '../config/relationships.js';
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
  if (!state.relationships.memories || typeof state.relationships.memories !== 'object') {
    state.relationships.memories = {};
  }
  return state;
}

function rememberedTiers(state, friendId) {
  const value = state.relationships.memories[friendId];
  return Array.isArray(value) ? value : [];
}

export function getAvailableMemory(state, friendId) {
  initRelationships(state);
  const reached = getReachedTiers(getRelationshipPoints(state, friendId));
  const remembered = rememberedTiers(state, friendId);
  const tier = reached.find((item) => !remembered.includes(item.id));
  if (!tier) return null;
  const memory = getNeighborMemory(friendId, tier.id);
  return memory ? { tier, memory } : null;
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

/**
 * 听一位邻居当前可解锁的一段回忆，奖励只领一次。
 */
export function recallNeighborMemory(state, friendId) {
  const available = getAvailableMemory(state, friendId);
  if (!available) return { success: false, message: '现在还没有新的回忆' };

  addRewards(state, available.memory.rewards);
  const remembered = rememberedTiers(state, friendId);
  remembered.push(available.tier.id);
  state.relationships.memories[friendId] = remembered;
  logEvent(state, 'relationship_memory');

  return {
    success: true,
    message: `听完「${available.memory.title}」，获得${formatRewards(available.memory.rewards)}`,
    state,
  };
}
