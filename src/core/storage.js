// 数据持久化模块
import { STORAGE_KEY } from '../config/constants.js';
import { createDefaultState, mergeState, createDailyState } from './state.js';
import { migrateState } from './migrations.js';
import { todayKey, yesterdayKey } from '../utils/time.js';

let saveTimer = null;

/**
 * 从 localStorage 加载游戏状态
 * @returns {Object} 游戏状态
 */
export function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = createDefaultState();

    if (!saved) {
      return base;
    }

    const merged = mergeState(base, saved);
    migrateState(merged);
    rollDailyState(merged);
    return merged;
  } catch (error) {
    console.warn("Failed to load state", error);
    return createDefaultState();
  }
}

/**
 * 跨日重置每日任务，并累计连续登录天数
 * @param {Object} state
 */
export function rollDailyState(state) {
  const today = todayKey();
  if (state.daily?.date === today) {
    return state;
  }

  const yesterday = yesterdayKey();
  const lastLogin = state.achievements?.lastLoginDate;
  const streak = state.achievements?.loginStreak || 1;

  if (!state.achievements) {
    state.achievements = { unlocked: [], progress: {}, loginStreak: 1, lastLoginDate: today };
  }

  if (lastLogin === yesterday) {
    state.achievements.loginStreak = streak + 1;
  } else if (lastLogin !== today) {
    state.achievements.loginStreak = 1;
  }
  state.achievements.lastLoginDate = today;

  state.daily = createDailyState();
  state.user.lastLoginAt = new Date().toISOString();
  return state;
}

/**
 * 保存游戏状态到 localStorage
 * @param {Object} state - 游戏状态
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save state", error);
  }
}

/**
 * 防抖保存（300ms 内只保存一次）
 * @param {Object} state - 游戏状态
 */
export function debouncedSave(state) {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    saveState(state);
    saveTimer = null;
  }, 300);
}

/**
 * 清除所有存档数据
 */
export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 导出存档为 JSON 字符串
 * @param {Object} state - 游戏状态
 * @returns {string} JSON 字符串
 */
export function exportSave(state) {
  return JSON.stringify(state, null, 2);
}

/**
 * 从 JSON 字符串导入存档
 * @param {string} jsonString - JSON 字符串
 * @returns {Object|null} 游戏状态或 null（失败时）
 */
export function importSave(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    const base = createDefaultState();
    const merged = mergeState(base, imported);
    migrateState(merged);
    return merged;
  } catch (error) {
    console.error("Failed to import save", error);
    return null;
  }
}
