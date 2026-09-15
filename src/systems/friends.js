// 好友系统模块
import { addItem } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { applyPetToFriendPoint } from './pets.js';

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

  // 获得友情点（宠物加成）
  const point = applyPetToFriendPoint(VISIT_FRIEND_POINT, state);
  addItem(state, "friendPoint", point);

  logEvent(state, "friend_visit");
  trackDaily(state, "visit", 1);
  emit(Events.FRIEND_VISITED, { friendId });

  return { success: true, message: `拜访了${friend.name}，获得${point}友情点`, state };
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
