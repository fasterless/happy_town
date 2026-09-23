// 称号与头像框系统（第八轮 2/3）
//
// 解锁状态不单独存：每次从 state 里的计数现算，达到条件即解锁。
// 只存玩家当前装备的那一个（state.cosmetics.equippedTitle / equippedFrame）。
import { titles, frames, getTitle, getFrame, COSMETICS_MIN_LEVEL } from '../config/cosmetics.js';
import { logEvent } from '../utils/analytics.js';

/**
 * 收藏是否解锁
 */
export function isCosmeticsUnlocked(state) {
  return state.wallet.level >= COSMETICS_MIN_LEVEL;
}

/**
 * 一项收藏的解锁条件是否满足
 */
function isUnlocked(state, item) {
  const { unlock } = item;
  if (unlock.level) return state.wallet.level >= unlock.level;
  if (unlock.stat) return (state.analytics?.[unlock.stat] || 0) >= unlock.need;
  if (unlock.story) return (state.story?.chapterIndex || 0) >= unlock.story;
  if (unlock.achievements) return (state.achievements?.unlocked || []).length >= unlock.achievements;
  return false;
}

/**
 * 当前装备的称号（没装备或条件已不满足时返回 null）
 */
export function getEquippedTitle(state) {
  const title = getTitle(state.cosmetics?.equippedTitle);
  if (!title || !isUnlocked(state, title)) return null;
  return title;
}

/**
 * 当前装备的头像框
 */
export function getEquippedFrame(state) {
  const frame = getFrame(state.cosmetics?.equippedFrame);
  if (!frame || !isUnlocked(state, frame)) return null;
  return frame;
}

/**
 * 装备一个称号
 */
export function equipTitle(state, titleId) {
  if (!isCosmeticsUnlocked(state)) {
    return { success: false, message: `Lv.${COSMETICS_MIN_LEVEL} 解锁称号收藏` };
  }
  const title = getTitle(titleId);
  if (!title) return { success: false, message: '没有这个称号' };
  if (!isUnlocked(state, title)) {
    return { success: false, message: `还没解锁：${title.desc}` };
  }

  state.cosmetics.equippedTitle = title.id;
  logEvent(state, 'cosmetic_equip');
  return { success: true, message: `戴上了称号「${title.name}」`, state };
}

/**
 * 卸下称号
 */
export function clearTitle(state) {
  if (!state.cosmetics?.equippedTitle) {
    return { success: false, message: '现在没有装备称号' };
  }
  state.cosmetics.equippedTitle = null;
  return { success: true, message: '卸下了称号', state };
}

/**
 * 装备一个头像框
 */
export function equipFrame(state, frameId) {
  if (!isCosmeticsUnlocked(state)) {
    return { success: false, message: `Lv.${COSMETICS_MIN_LEVEL} 解锁头像框收藏` };
  }
  const frame = getFrame(frameId);
  if (!frame) return { success: false, message: '没有这个头像框' };
  if (!isUnlocked(state, frame)) {
    return { success: false, message: `还没解锁：${frame.desc}` };
  }

  state.cosmetics.equippedFrame = frame.id;
  logEvent(state, 'cosmetic_equip');
  return { success: true, message: `换上了${frame.icon}${frame.name}`, state };
}

/**
 * 收藏面板（渲染用）：附是否已解锁、是否装备中
 */
export function getCosmeticBoard(state) {
  return {
    titles: titles.map((item) => ({
      item,
      unlocked: isUnlocked(state, item),
      equipped: state.cosmetics?.equippedTitle === item.id,
    })),
    frames: frames.map((item) => ({
      item,
      unlocked: isUnlocked(state, item),
      equipped: state.cosmetics?.equippedFrame === item.id,
    })),
  };
}

/** 已解锁的收藏总数（成就用） */
export function getUnlockedCosmeticCount(state) {
  return [...titles, ...frames].filter((item) => isUnlocked(state, item)).length;
}

export { titles, frames, COSMETICS_MIN_LEVEL };
