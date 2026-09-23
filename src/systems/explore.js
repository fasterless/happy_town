import { EXPLORE_MIN_LEVEL, explorePlaces, getExplorePlace } from "../config/explore.js";
import { addRewards } from "../core/inventory.js";
import { logEvent } from "../utils/analytics.js";
import { todayKey } from "../utils/time.js";
import { formatRewards } from "../utils/format.js";
import { getRelationshipProgress, gainRelationship } from './relationships.js';
export function initExplore(state) {
  if (!state.explore || typeof state.explore !== "object") state.explore = { date: "", visited: [], found: [], walks: [] };
  if (typeof state.explore.date !== "string") state.explore.date = "";
  if (!Array.isArray(state.explore.visited)) state.explore.visited = [];
  if (!Array.isArray(state.explore.found)) state.explore.found = [];
  if (!Array.isArray(state.explore.walks)) state.explore.walks = [];
  if (state.explore.date !== todayKey()) { state.explore.date = todayKey(); state.explore.visited = []; }
  return state;
}
export function isExploreUnlocked(state) { return state.wallet.level >= EXPLORE_MIN_LEVEL; }
export function getExploreBoard(state) {
  initExplore(state);
  return explorePlaces.map((place) => ({
    ...place,
    unlocked: state.wallet.level >= place.level,
    visited: state.explore.visited.includes(place.id),
    discovered: place.finds.filter((find) => state.explore.found.includes(find.id)).length,
    tales: place.tales.filter((_, index) => state.explore.found.includes(place.finds[index].id)),
    walkFriends: getAvailableWalkFriends(state, place.id),
    walks: state.explore.walks.filter((walk) => walk.placeId === place.id),
  }));
}

function getAvailableWalkFriends(state, placeId) {
  const place = getExplorePlace(placeId);
  if (!place || state.wallet.level < place.level) return [];
  const walked = new Set(state.explore.walks.filter((walk) => walk.placeId === placeId).map((walk) => walk.friendId));
  return (state.friends || []).filter((friend) => friend.isFriend && !walked.has(friend.id)).map((friend) => {
    const relationship = getRelationshipProgress(state, friend.id);
    return { ...friend, relationship: relationship.current?.name || '刚认识' };
  });
}

function walkLine(place, friend, tier) {
  const lines = {
    grove: {
      base: `${friend.name}和你沿着林间小路慢慢走，停下来听了会儿风吹树叶的声音。`,
      acquainted: `${friend.name}指给你看路边的新芽：原来一起散步，也能发现平时错过的小事。`,
      familiar: `${friend.name}认出树下的旧记号，和你聊起第一次来这条小路的那天。`,
      close: `${friend.name}把步子放慢，笑着说：这段路以后也想和你常常再走。`,
    },
    shore: {
      base: `${friend.name}陪你沿湖岸走了一圈，浅滩上的水纹安静地向远处散开。`,
      acquainted: `${friend.name}捡起一枚圆石：下次再来，我们看看湖水有没有把它磨圆。`,
      familiar: `${friend.name}和你认出湖边熟悉的景色，约好下次换个时间来看日落。`,
      close: `${friend.name}在湖边陪你坐了一会儿：不用赶路的时候，风景显得格外温柔。`,
    },
    station: {
      base: `${friend.name}陪你走过旧站台，停下来听风掠过空站的回声。`,
      acquainted: `${friend.name}指着站牌说：等新钟响起，我们再一起回来听听。`,
      familiar: `${friend.name}和你对照旧车票的日期，聊起小镇最早迎接旅客的故事。`,
      close: `${friend.name}轻声说：和你一起走过的地方，总让人觉得还会再回来。`,
    },
  };
  return lines[place.id]?.[tier] || lines[place.id]?.base || `${friend.name}和你一起在${place.name}散步，留下了一段轻松的回忆。`;
}

export function getExploreWalkJournal(state, placeId = null) {
  initExplore(state);
  const walks = state.explore.walks;
  return placeId ? walks.filter((walk) => walk.placeId === placeId) : walks;
}

export function walkWithNeighbor(state, placeId, friendId) {
  const place = getExplorePlace(placeId);
  if (!place) return { success: false, message: '没有这个散步地点' };
  if (state.wallet.level < place.level) return { success: false, message: `Lv.${place.level} 开放${place.name}` };
  initExplore(state);

  const friend = (state.friends || []).find((entry) => entry.id === friendId && entry.isFriend);
  if (!friend) return { success: false, message: '先和这位邻居成为好友，再邀请一起散步' };
  if (state.explore.walks.some((walk) => walk.placeId === placeId && walk.friendId === friendId)) {
    return { success: false, message: '你们已经一起走过这里了，这段回忆会一直保留' };
  }

  const relationship = getRelationshipProgress(state, friendId);
  const tier = relationship.current?.id || 'base';
  const line = walkLine(place, friend, tier);
  gainRelationship(state, friendId, 'visit');
  const walk = {
    id: `${placeId}:${friendId}`,
    placeId,
    placeName: place.name,
    friendId,
    friendName: friend.name,
    tier,
    line,
    at: new Date().toISOString(),
  };
  state.explore.walks.push(walk);
  logEvent(state, 'explore_walk');
  return { success: true, message: line, state, walk };
}
export function explorePlace(state, placeId) {
  const place = getExplorePlace(placeId);
  if (!place) return { success: false, message: "没有这个地方" };
  if (state.wallet.level < place.level) return { success: false, message: `Lv.${place.level} 开放${place.name}` };
  initExplore(state);
  if (state.explore.visited.includes(place.id)) return { success: false, message: "今天已经来过这里了" };
  const rewards = {};
  place.finds.forEach((find) => {
    const rare = find.rare && Math.random() > 0.25;
    if (rare) return;
    rewards[find.id] = find.count;
    if (!state.explore.found.includes(find.id)) state.explore.found.push(find.id);
  });
  addRewards(state, rewards);
  state.explore.visited.push(place.id);
  logEvent(state, "explore_visit");
  return { success: true, message: `${place.story} 获得${formatRewards(rewards)}`, state };
}
