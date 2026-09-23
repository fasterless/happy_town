// 邻居每日日程系统
//
// 每位邻居每天有一个固定状态（在家 / 出门 / 有心事），
// 由日期键哈希决定，同一天内不变。拜访时按状态给不同的回礼，
// 取代 events.js 里那份固定的回礼池。
//
// 回礼概率沿用邻居回礼的 35%；人情满格时必定触发。
import { addItem } from '../core/inventory.js';
import { todayKey } from '../utils/time.js';
import { getItemName, getItemIcon } from '../utils/format.js';
import { logEvent } from '../utils/analytics.js';
import { isFavorFull } from './helpBoard.js';
import { scheduleStates, neighborSchedules } from '../config/schedules.js';

const TRIGGER_CHANCE = 0.35;

/**
 * 把字符串映射成稳定的非负整数（同一天同一邻居永远得到同一个数）
 */
function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 按权重从状态表里取一个状态
 */
function pickState(roll) {
  const total = scheduleStates.reduce((sum, s) => sum + s.weight, 0);
  let cursor = roll % total;
  for (const state of scheduleStates) {
    cursor -= state.weight;
    if (cursor < 0) return state;
  }
  return scheduleStates[scheduleStates.length - 1];
}

/**
 * 初始化日程状态（normalizeState 里调用）
 */
export function initSchedules(state) {
  if (!state.schedules || typeof state.schedules !== "object") {
    state.schedules = {};
  }
  if (typeof state.schedules.date !== "string") state.schedules.date = "";
  if (!state.schedules.today || typeof state.schedules.today !== "object") {
    state.schedules.today = {};
  }
  return state;
}

/**
 * 确保今天的日程已经排好。跨天时重新排班，同一天内直接复用。
 * @returns {Object} friendId -> 状态 id
 */
export function ensureTodaySchedule(state) {
  initSchedules(state);
  const today = todayKey();
  if (state.schedules.date === today) return state.schedules.today;

  const todayStates = {};
  neighborSchedules.forEach((entry) => {
    const roll = hashString(`${today}:${entry.npc}`);
    todayStates[entry.npc] = pickState(roll).id;
  });
  state.schedules.date = today;
  state.schedules.today = todayStates;
  return todayStates;
}

/**
 * 某位邻居今天的状态（{ id, label, icon }），没有日程配置时返回 null
 */
export function getScheduleState(state, friendId) {
  const entry = neighborSchedules.find((n) => n.npc === friendId);
  if (!entry) return null;
  const todayStates = ensureTodaySchedule(state);
  const id = todayStates[friendId];
  return scheduleStates.find((s) => s.id === id) || scheduleStates[0];
}

/**
 * 今天是否已领过该邻居的日程回礼
 */
function hasClaimedToday(state, friendId) {
  const record = state.npcEvents && state.npcEvents.claimedToday
    ? state.npcEvents.claimedToday[friendId]
    : undefined;
  return record === todayKey();
}

/**
 * 拜访后按今天的状态尝试触发回礼
 * @returns {Object|null} 触发了的回礼（null = 本次没有）
 */
export function tryScheduleGift(state, friendId) {
  const entry = neighborSchedules.find((n) => n.npc === friendId);
  if (!entry) return null;
  if (hasClaimedToday(state, friendId)) return null;
  if (!isFavorFull(state, friendId) && Math.random() > TRIGGER_CHANCE) return null;

  const status = getScheduleState(state, friendId);
  const plan = entry.states[status.id];
  const reward = pickReward(plan.rewards);
  addItem(state, reward.key, reward.count);

  if (!state.npcEvents) state.npcEvents = { claimedToday: {} };
  if (!state.npcEvents.claimedToday) state.npcEvents.claimedToday = {};
  state.npcEvents.claimedToday[friendId] = todayKey();
  logEvent(state, "neighbor_gift");
  logEvent(state, "schedule_visit");

  return {
    npc: entry.npc,
    state: status.id,
    line: plan.lines[Math.floor(Math.random() * plan.lines.length)],
    rewardText: `${getItemIcon(reward.key)} ${getItemName(reward.key)}×${reward.count}`,
  };
}

function pickReward(rewards) {
  const total = rewards.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const reward of rewards) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return rewards[rewards.length - 1];
}
