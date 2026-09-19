// 好友系统模块
import { addItem } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { applyPetToFriendPoint } from './pets.js';
import { tryNeighborGift } from './events.js';
import { GAME_CONFIG } from '../config/constants.js';
import { todayKey, yesterdayKey } from '../utils/time.js';

const VISIT_FRIEND_POINT = 3;
const LIKE_FRIEND_POINT = 5;

/**
 * 添加好友
 * @param {Object} state - 游戏状态
 * @param {string} friendId - 好友ID
 * @returns {Object} 结果 { success, message, state }
 */
export function addFriend(state, friendId) {
  const friend = state.friends.find(f => f.id === friendId);

  if (!friend) {
    return { success: false, message: "好友不存在" };
  }

  if (friend.isFriend) {
    return { success: false, message: "已经是好友了" };
  }

  friend.isFriend = true;

  logEvent(state, "friend_add");
  emit(Events.FRIEND_ADDED, { friendId });

  return { success: true, message: `添加了好友 ${friend.name}`, state };
}

/**
 * 拜访好友
 * @param {Object} state - 游戏状态
 * @param {string} friendId - 好友ID
 * @returns {Object} 结果 { success, message, state }
 */
export function visitFriend(state, friendId) {
  const friend = state.friends.find(f => f.id === friendId);

  if (!friend) {
    return { success: false, message: "好友不存在" };
  }

  if (!friend.isFriend) {
    return { success: false, message: "需要先添加好友" };
  }

  // 检查等级解锁（Lv.5解锁完整拜访功能）
  if (state.wallet.level < 5) {
    return { success: false, message: "Lv.5解锁拜访功能" };
  }

  // 拜访连击：连续多天都有拜访，每天额外 +1 友情点（封顶 +5）
  const social = state.social;
  const yesterday = yesterdayKey();
  const today = todayKey();
  if (social.lastVisitDate !== today) {
    // 今天第一次拜访：昨天有拜访就连击 +1，否则从头数
    social.visitStreak = social.lastVisitDate === yesterday ? social.visitStreak + 1 : 1;
    social.lastVisitDate = today;
  }
  const streakBonus = Math.min(
    Math.max(0, social.visitStreak - 1),
    GAME_CONFIG.social.visitStreakBonusMax
  );

  // 获得友情点（宠物加成 + 拜访连击）
  const point = applyPetToFriendPoint(VISIT_FRIEND_POINT, state);
  addItem(state, "friendPoint", point);
  if (streakBonus > 0) addItem(state, "friendPoint", streakBonus);

  logEvent(state, "friend_visit");
  trackDaily(state, "visit", 1);
  emit(Events.FRIEND_VISITED, { friendId });

  // 惊喜回礼：邻居今天心情好就塞点东西给你（每日每人限一次）
  const gift = tryNeighborGift(state, friendId);

  const giftText = gift ? ` ${gift.line}（获得${gift.rewardText}）` : "";
  const streakText = streakBonus > 0 ? `（连续拜访${social.visitStreak}天，+${streakBonus}）` : "";
  return {
    success: true,
    message: `拜访了${friend.name}，获得${point}友情点${streakText}${giftText}`,
    state,
  };
}

/**
 * 点赞好友
 * @param {Object} state - 游戏状态
 * @param {string} friendId - 好友ID
 * @returns {Object} 结果 { success, message, state }
 */
export function likeFriend(state, friendId) {
  const friend = state.friends.find(f => f.id === friendId);

  if (!friend) {
    return { success: false, message: "好友不存在" };
  }

  if (!friend.isFriend) {
    return { success: false, message: "需要先添加好友" };
  }

  // 检查今天是否已经点赞过
  if (state.daily.friendLikes[friendId]) {
    return { success: false, message: "今天已经点赞过了" };
  }

  // 点赞
  state.daily.friendLikes[friendId] = true;
  friend.likes = (friend.likes || 0) + 1;

  // 获得友情点（宠物加成）
  const point = applyPetToFriendPoint(LIKE_FRIEND_POINT, state);
  addItem(state, "friendPoint", point);

  logEvent(state, "home_like");
  trackDaily(state, "like", 1);

  return { success: true, message: `点赞了${friend.name}，获得${point}友情点`, state };
}

/**
 * 获取推荐好友（未添加的）
 * @param {Object} state - 游戏状态
 * @returns {Array} 未添加的好友列表
 */
export function getRecommendedFriends(state) {
  return state.friends.filter(f => !f.isFriend);
}

/**
 * 获取已添加的好友
 * @param {Object} state - 游戏状态
 * @returns {Array} 已添加的好友列表
 */
export function getMyFriends(state) {
  return state.friends.filter(f => f.isFriend);
}

/**
 * 检查今天是否已点赞某好友
 * @param {Object} state - 游戏状态
 * @param {string} friendId - 好友ID
 * @returns {boolean} 是否已点赞
 */
export function hasLikedToday(state, friendId) {
  return !!state.daily.friendLikes[friendId];
}

/**
 * 今天还剩的帮浇次数
 * @param {Object} state
 * @returns {number}
 */
export function getWaterChancesLeft(state) {
  if (state.social.waterDate !== todayKey()) {
    return GAME_CONFIG.social.waterPerDay;
  }
  return Math.max(0, GAME_CONFIG.social.waterPerDay - state.social.waterUsed);
}

/**
 * 好友帮浇：给好友一块未熟的地块拨快 waterBoostSec 秒。
 * NPC 好友的地块是模拟出来的：直接记录累计被浇秒数，拜访时一起结算。
 * @param {Object} state
 * @param {string} friendId
 * @returns {Object} { success, message, state }
 */
export function waterFriendPlot(state, friendId) {
  const friend = state.friends.find((f) => f.id === friendId);
  if (!friend || !friend.isFriend) {
    return { success: false, message: "需要先添加好友" };
  }
  if (state.wallet.level < GAME_CONFIG.social.waterMinLevel) {
    return { success: false, message: `Lv.${GAME_CONFIG.social.waterMinLevel}解锁帮浇` };
  }

  const today = todayKey();
  if (state.social.waterDate !== today) {
    // 新的一天，重置帮浇计数
    state.social.waterDate = today;
    state.social.waterUsed = 0;
    state.social.wateredBy = [];
  }
  if (state.social.waterUsed >= GAME_CONFIG.social.waterPerDay) {
    return { success: false, message: "今天的帮浇次数用完了，明天再来" };
  }
  if (state.social.wateredBy.includes(friendId)) {
    return { success: false, message: `今天已经帮${friend.name}浇过了` };
  }

  state.social.waterUsed += 1;
  state.social.wateredBy.push(friendId);

  // 记录邻居的人情：给好友的 mood 变热络，并给一点友情点
  const point = applyPetToFriendPoint(2, state);
  addItem(state, "friendPoint", point);
  logEvent(state, "friend_water");
  trackDaily(state, "water", 1);
  emit(Events.FRIEND_WATERED, { friendId });

  return {
    success: true,
    message: `帮${friend.name}浇了田，作物快了${Math.floor(GAME_CONFIG.social.waterBoostSec / 60)}分钟，获得${point}友情点`,
    state,
  };
}

/**
 * 今天是否已帮某好友浇过
 * @param {Object} state
 * @param {string} friendId
 * @returns {boolean}
 */
export function hasWateredToday(state, friendId) {
  return state.social.waterDate === todayKey() && state.social.wateredBy.includes(friendId);
}
