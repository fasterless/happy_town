import { EXPLORE_MIN_LEVEL, explorePlaces, getExplorePlace } from "../config/explore.js";
import { addRewards } from "../core/inventory.js";
import { logEvent } from "../utils/analytics.js";
import { todayKey } from "../utils/time.js";
import { getSeenStoryEndings } from "./story.js";
import { getSeenTownStyles } from "./townStyles.js";
import { formatRewards } from "../utils/format.js";
import { getRelationshipProgress, gainRelationship } from './relationships.js';
export function initExplore(state) {
  if (!state.explore || typeof state.explore !== "object") state.explore = { date: "", visited: [], found: [], walks: [] };
  if (typeof state.explore.date !== "string") state.explore.date = "";
  if (!Array.isArray(state.explore.visited)) state.explore.visited = [];
  if (!Array.isArray(state.explore.found)) state.explore.found = [];
  if (!Array.isArray(state.explore.walks)) state.explore.walks = [];
  if (!Array.isArray(state.explore.souvenirs)) state.explore.souvenirs = [];
  if (!state.explore.album || typeof state.explore.album !== "object") state.explore.album = {};
  if (!state.explore.display || typeof state.explore.display !== "object") state.explore.display = {};
  if (!state.explore.gifts || typeof state.explore.gifts !== "object") state.explore.gifts = { date: "", claimed: [] };
  if (!Array.isArray(state.explore.seasons)) state.explore.seasons = [];
  if (!Array.isArray(state.explore.yearbook)) state.explore.yearbook = [];
  if (!state.explore.volumes || typeof state.explore.volumes !== "object") state.explore.volumes = {};
  if (state.explore.date !== todayKey()) { state.explore.date = todayKey(); state.explore.visited = []; }
  if (state.explore.gifts.date !== todayKey()) { state.explore.gifts = { date: todayKey(), claimed: [] }; }
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
    souvenir: getWalkSouvenirStatus(state, place.id),
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


// 一个地点的同行回忆集齐这么多位不同邻居，就能领取一次足迹纪念
export const WALK_SOUVENIR_GOAL = 5;

export const walkSouvenirs = [
  { placeId: "grove", id: "souvenir_grove", name: "林间书签", icon: "🍃", rewards: { coin: 500, friendPoint: 30 } },
  { placeId: "shore", id: "souvenir_shore", name: "湖岸贝饰", icon: "🐚", rewards: { coin: 600, diamond: 10 } },
  { placeId: "station", id: "souvenir_station", name: "站台铃坠", icon: "🔔", rewards: { coin: 800, diamond: 15 } },
];

export function getWalkSouvenir(placeId) {
  return walkSouvenirs.find((souvenir) => souvenir.placeId === placeId) || null;
}

function walkFriendCount(state, placeId) {
  return new Set(state.explore.walks.filter((walk) => walk.placeId === placeId).map((walk) => walk.friendId)).size;
}

/**
 * 一个地点的足迹纪念状态：集齐同行回忆后可领一次，已领的永久保留
 * @returns {{ souvenir: Object, friends: number, goal: number, claimed: boolean, ready: boolean } | null}
 */
export function getWalkSouvenirStatus(state, placeId) {
  const souvenir = getWalkSouvenir(placeId);
  if (!souvenir) return null;
  initExplore(state);
  const friends = walkFriendCount(state, placeId);
  const claimed = state.explore.souvenirs.includes(souvenir.id);
  return { souvenir, friends, goal: WALK_SOUVENIR_GOAL, claimed, ready: !claimed && friends >= WALK_SOUVENIR_GOAL };
}

export function getClaimedWalkSouvenirs(state) {
  initExplore(state);
  return walkSouvenirs.filter((souvenir) => state.explore.souvenirs.includes(souvenir.id));
}

/**
 * 领取地点足迹纪念：集齐同行回忆后限领一次，领取不消耗回忆记录
 */
export function claimWalkSouvenir(state, placeId) {
  const status = getWalkSouvenirStatus(state, placeId);
  if (!status) return { success: false, message: "这个地方没有足迹纪念" };
  if (status.claimed) return { success: false, message: `${status.souvenir.name}已经收藏过了，会一直留着` };
  if (!status.ready) return { success: false, message: `再和 ${status.goal - status.friends} 位邻居走过${getExplorePlace(placeId).name}，就能收藏${status.souvenir.name}` };

  state.explore.souvenirs.push(status.souvenir.id);
  addRewards(state, status.souvenir.rewards);
  logEvent(state, "explore_souvenir");
  return { success: true, message: `收藏了${status.souvenir.icon}${status.souvenir.name}，获得${formatRewards(status.souvenir.rewards)}`, state, souvenir: status.souvenir };
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
  const season = recordSeasonWalk(state, placeId);
  logEvent(state, 'explore_walk');
  return { success: true, message: line, state, walk, season };
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

// ---------- round 14 3/3: walk album ----------

const ALBUM_COVERS = {
  grove: { title: "林间小路相册", icon: "🌲", line: "树影和脚步声都收进了这一册。" },
  shore: { title: "湖岸浅滩相册", icon: "🌊", line: "浅滩的水纹一页页留在这里。" },
  station: { title: "旧车站相册", icon: "🚉", line: "站台上的每次同行都有了封面。" },
};

export function getWalkAlbum(state, placeId) {
  initExplore(state);
  const place = getExplorePlace(placeId);
  const cover = ALBUM_COVERS[placeId];
  if (!place || !cover) return null;
  const souvenir = getWalkSouvenir(placeId);
  const unlocked = state.explore.souvenirs.includes(souvenir.id);
  return { placeId, ...cover, unlocked, pages: getExploreWalkJournal(state, placeId) };
}

export function getWalkAlbums(state) {
  return explorePlaces.map((place) => getWalkAlbum(state, place.id));
}


// ---------- round 15: souvenirs back into daily play ----------

export function getSouvenirDisplay(state) {
  initExplore(state);
  return getClaimedWalkSouvenirs(state).map((souvenir) => ({
    ...souvenir,
    shown: Boolean(state.explore.display[souvenir.id]),
  }));
}

export function toggleSouvenirDisplay(state, souvenirId) {
  const souvenir = walkSouvenirs.find((entry) => entry.id === souvenirId);
  if (!souvenir) return { success: false, message: "没有这枚足迹纪念" };
  initExplore(state);
  if (!state.explore.souvenirs.includes(souvenirId)) return { success: false, message: "先收藏这枚纪念，再摆出来" };
  state.explore.display[souvenirId] = !state.explore.display[souvenirId];
  const shown = state.explore.display[souvenirId];
  logEvent(state, "explore_display");
  return { success: true, message: shown ? souvenir.icon + souvenir.name + "摆上了陈列架" : souvenir.name + "收回了陈列架", state };
}

const SOUVENIR_GIFTS = {
  souvenir_grove: { coin: 60 },
  souvenir_shore: { coin: 80 },
  souvenir_station: { friendPoint: 15 },
};

export function claimSouvenirGift(state, souvenirId) {
  const souvenir = walkSouvenirs.find((entry) => entry.id === souvenirId);
  if (!souvenir) return { success: false, message: "没有这枚足迹纪念" };
  initExplore(state);
  if (!state.explore.souvenirs.includes(souvenirId)) return { success: false, message: "先收藏这枚纪念，再来换小礼" };
  if (state.explore.gifts.claimed.includes(souvenirId)) return { success: false, message: "今天已经用这枚纪念换过小礼了，明天再来" };
  const rewards = SOUVENIR_GIFTS[souvenirId];
  state.explore.gifts.claimed.push(souvenirId);
  addRewards(state, rewards);
  logEvent(state, "explore_gift");
  return { success: true, message: souvenir.name + "换来了" + formatRewards(rewards) + "，纪念还在", state };
}

export function getSouvenirGifts(state) {
  initExplore(state);
  return getClaimedWalkSouvenirs(state).map((souvenir) => ({
    ...souvenir,
    rewards: SOUVENIR_GIFTS[souvenir.id],
    claimedToday: state.explore.gifts.claimed.includes(souvenir.id),
  }));
}


const SOUVENIR_RECOGNITION = {
  souvenir_grove: "还记得林间小路的风声",
  souvenir_shore: "提起湖岸边一起看过的水纹",
  souvenir_station: "说起旧车站那声熟悉的钟响",
};

export function getSouvenirRecognition(state) {
  initExplore(state);
  const lines = state.explore.souvenirs
    .map((id) => {
      const souvenir = walkSouvenirs.find((entry) => entry.id === id);
      return souvenir ? souvenir.icon + SOUVENIR_RECOGNITION[id] : null;
    })
    .filter(Boolean);
  return lines.length ? "邻居" + lines.join("，") : "";
}

// ---------- round 16: seasonal walks ----------

export const WALK_SEASONS = [
  { id: "spring", name: "春", icon: "🌸", months: [3, 4, 5] },
  { id: "summer", name: "夏", icon: "🏖", months: [6, 7, 8] },
  { id: "autumn", name: "秋", icon: "🍂", months: [9, 10] },
  { id: "winter", name: "冬", icon: "❄", months: [11, 12, 1, 2] },
];

export function getWalkSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  return WALK_SEASONS.find((season) => season.months.includes(month));
}

const SEASON_LINES = {
  grove: {
    spring: "新芽刚冒头，林间小路比平时更亮。",
    summer: "树荫把整条小路罩得凉凉的。",
    autumn: "落叶铺满小路，踩上去轻轻响。",
    winter: "树枝光了，风声却比哪个季节都清楚。",
  },
  shore: {
    spring: "浅滩边的水暖了，石头上长出一层薄绿。",
    summer: "湖面反光晃眼，赤脚踩进水里正好。",
    autumn: "芦苇黄了，湖风带着一点干草的味道。",
    winter: "湖边结了薄冰，脚步声传得很远。",
  },
  station: {
    spring: "站台栏杆上停着回来的候鸟。",
    summer: "晚风穿过空站，钟声显得格外懒。",
    autumn: "落叶扫过站台，像有人刚下车。",
    winter: "雪落在站牌上，钟声却还是准时的。",
  },
};


export function recordSeasonWalk(state, placeId, date = new Date()) {
  const season = getWalkSeason(date);
  const place = getExplorePlace(placeId);
  if (!season || !place) return null;
  initExplore(state);
  const id = placeId + ":" + season.id;
  if (state.explore.seasons.some((stamp) => stamp.id === id)) return null;
  const stamp = {
    id,
    placeId,
    placeName: place.name,
    seasonId: season.id,
    seasonName: season.name,
    icon: season.icon,
    line: (SEASON_LINES[placeId] || {})[season.id] || "",
    at: date.toISOString(),
  };
  state.explore.seasons.push(stamp);
  logEvent(state, "explore_season");
  return stamp;
}

export function getSeasonStamps(state, placeId = null) {
  initExplore(state);
  return placeId ? state.explore.seasons.filter((stamp) => stamp.placeId === placeId) : state.explore.seasons;
}

export function getSeasonRoutes(state) {
  initExplore(state);
  return explorePlaces.map((place) => {
    const stamps = getSeasonStamps(state, place.id);
    const unlocked = WALK_SEASONS.every((season) => stamps.some((stamp) => stamp.seasonId === season.id));
    return {
      placeId: place.id,
      name: place.name + "四季路线",
      icon: place.icon,
      unlocked,
      stamps,
      line: unlocked ? stamps.map((stamp) => stamp.icon + stamp.line).join("") : "",
    };
  });
}

// ---------- round 17: town yearbook ----------

export const YEARBOOK_SECTIONS = [
  { id: "endings", name: "看过的结局", icon: "🏮" },
  { id: "styles", name: "小镇风貌", icon: "🎨" },
  { id: "souvenirs", name: "散步足迹", icon: "🍃" },
  { id: "seasons", name: "四季集章", icon: "🍂" },
];

function yearbookEntries(state) {
  return {
    endings: getSeenStoryEndings(state).map((ending) => ({ id: ending.id, name: ending.name, icon: ending.icon })),
    styles: getSeenTownStyles(state).map((style) => ({ id: style.id, name: style.name, icon: style.icon })),
    souvenirs: getClaimedWalkSouvenirs(state).map((souvenir) => ({ id: souvenir.id, name: souvenir.name, icon: souvenir.icon })),
    seasons: getSeasonStamps(state).map((stamp) => ({ id: stamp.id, name: stamp.placeName + "·" + stamp.seasonName, icon: stamp.icon })),
  };
}

export function getYearbook(state) {
  initExplore(state);
  const entries = yearbookEntries(state);
  return YEARBOOK_SECTIONS.map((section) => ({ ...section, entries: entries[section.id] }));
}

export function getYearbookCount(state) {
  return getYearbook(state).reduce((sum, section) => sum + section.entries.length, 0);
}


export const YEARBOOK_MILESTONES = [
  { id: "yb_3", need: 3, rewards: { coin: 300 } },
  { id: "yb_8", need: 8, rewards: { coin: 800, diamond: 10 } },
  { id: "yb_15", need: 15, rewards: { diamond: 30, friendPoint: 50 } },
];

export function claimYearbookMilestone(state, milestoneId) {
  const milestone = YEARBOOK_MILESTONES.find((entry) => entry.id === milestoneId);
  if (!milestone) return { success: false, message: "没有这个里程碑" };
  initExplore(state);
  if (state.explore.yearbook.includes(milestoneId)) return { success: false, message: "这个里程碑已经领过了" };
  const count = getYearbookCount(state);
  if (count < milestone.need) return { success: false, message: "年鉴还差 " + (milestone.need - count) + " 条记录" };
  state.explore.yearbook.push(milestoneId);
  addRewards(state, milestone.rewards);
  logEvent(state, "yearbook_claim");
  return { success: true, message: "年鉴收录了 " + count + " 条记录，获得" + formatRewards(milestone.rewards), state };
}

export function getYearbookMilestones(state) {
  initExplore(state);
  const count = getYearbookCount(state);
  return YEARBOOK_MILESTONES.map((milestone) => ({
    ...milestone,
    count,
    claimed: state.explore.yearbook.includes(milestone.id),
    ready: count >= milestone.need && !state.explore.yearbook.includes(milestone.id),
  }));
}

// ---------- round 18 1/3: yearbook volumes ----------

export function getYearbookVolume(state, year = new Date().getFullYear()) {
  initExplore(state);
  const key = String(year);
  const volume = state.explore.volumes[key];
  if (!volume) return null;
  const sections = YEARBOOK_SECTIONS.map((section) => ({
    ...section,
    entries: Array.isArray(volume[section.id]) ? volume[section.id] : [],
  }));
  return {
    year: key,
    bound: Boolean(volume.bound),
    count: sections.reduce((sum, section) => sum + section.entries.length, 0),
    sections,
  };
}

export function getYearbookVolumes(state) {
  initExplore(state);
  return Object.keys(state.explore.volumes).sort().map((year) => getYearbookVolume(state, year));
}

function volumeOf(state, year) {
  const key = String(year);
  if (!state.explore.volumes[key]) state.explore.volumes[key] = { bound: false };
  return state.explore.volumes[key];
}

export function recordYearbookEntry(state, year, sectionId, entry) {
  const section = YEARBOOK_SECTIONS.find((item) => item.id === sectionId);
  if (!section || !entry || !entry.id) return false;
  initExplore(state);
  const volume = volumeOf(state, year);
  if (!Array.isArray(volume[sectionId])) volume[sectionId] = [];
  if (volume[sectionId].some((item) => item.id === entry.id)) return false;
  volume[sectionId].push({ id: entry.id, name: entry.name, icon: entry.icon });
  logEvent(state, "yearbook_entry");
  return true;
}

export function bindYearbookVolume(state, year = new Date().getFullYear()) {
  const volume = getYearbookVolume(state, year);
  if (!volume) return { success: false, message: year + " 年还没有可以装订的记录" };
  if (volume.bound) return { success: false, message: year + " 年的年鉴已经装订过了" };
  if (!volume.count) return { success: false, message: year + " 年还没有可以装订的记录" };
  state.explore.volumes[String(year)].bound = true;
  logEvent(state, "yearbook_bind");
  return { success: true, message: year + " 年的年鉴装订成册，共 " + volume.count + " 条记录", state };
}


export const YEARBOOK_VOLUME_REWARDS = [
  { id: "vol_1", need: 1, rewards: { coin: 200 } },
  { id: "vol_3", need: 3, rewards: { coin: 600, diamond: 8 } },
];

export function claimYearbookVolumeReward(state, rewardId) {
  const reward = YEARBOOK_VOLUME_REWARDS.find((entry) => entry.id === rewardId);
  if (!reward) return { success: false, message: "没有这个装订奖励" };
  initExplore(state);
  if (!Array.isArray(state.explore.volumes.claimed)) state.explore.volumes.claimed = [];
  if (state.explore.volumes.claimed.includes(rewardId)) return { success: false, message: "这个装订奖励已经领过了" };
  const bound = getYearbookVolumes(state).filter((volume) => volume.bound).length;
  if (bound < reward.need) return { success: false, message: "还差 " + (reward.need - bound) + " 册装订好的年鉴" };
  state.explore.volumes.claimed.push(rewardId);
  addRewards(state, reward.rewards);
  logEvent(state, "yearbook_volume");
  return { success: true, message: "装订了 " + bound + " 册年鉴，获得" + formatRewards(reward.rewards), state };
}

export function getYearbookVolumeRewards(state) {
  initExplore(state);
  if (!Array.isArray(state.explore.volumes.claimed)) state.explore.volumes.claimed = [];
  const bound = getYearbookVolumes(state).filter((volume) => volume.bound).length;
  return YEARBOOK_VOLUME_REWARDS.map((reward) => ({
    ...reward,
    bound,
    claimed: state.explore.volumes.claimed.includes(reward.id),
    ready: bound >= reward.need && !state.explore.volumes.claimed.includes(reward.id),
  }));
}

// ---------- round 18 2/3: backfill a past year ----------

export function getYearbookBackfill(state, year) {
  const volume = getYearbookVolume(state, year);
  if (!volume) return [];
  const recorded = new Set(volume.sections.flatMap((section) => section.entries.map((entry) => section.id + ":" + entry.id)));
  return getYearbook(state).flatMap((section) => section.entries
    .filter((entry) => !recorded.has(section.id + ":" + entry.id))
    .map((entry) => ({ sectionId: section.id, entry })));
}

export function backfillYearbookVolume(state, year) {
  const volume = getYearbookVolume(state, year);
  if (!volume) return { success: false, message: year + " 年还没有分册，先记入一条记录", added: 0 };
  const missing = getYearbookBackfill(state, year);
  if (!missing.length) return { success: false, message: year + " 年的分册已经记下了所有收藏", added: 0 };
  missing.forEach(({ sectionId, entry }) => recordYearbookEntry(state, year, sectionId, entry));
  missing.forEach(() => logEvent(state, "yearbook_backfill"));
  return { success: true, message: "补记了 " + missing.length + " 条收藏到 " + year + " 年，不补发奖励", added: missing.length, state };
}

// ---------- round 18 3/3: yearbook covers ----------

export const YEARBOOK_COVERS = [
  { id: "cover_1", need: 1, icon: "📒", name: "素笺封面", line: "第一册装订好的时候，封面还是空白的。" },
  { id: "cover_3", need: 3, icon: "📕", name: "三载封面", line: "三年的记录叠在一起，封面也厚了起来。" },
  { id: "cover_5", need: 5, icon: "📗", name: "长卷封面", line: "五年过去，翻开哪一册都能找到那年的事。" },
];

function boundVolumeCount(state) {
  return getYearbookVolumes(state).filter((volume) => volume.bound).length;
}

export function getYearbookCovers(state) {
  initExplore(state);
  const bound = boundVolumeCount(state);
  return YEARBOOK_COVERS.map((cover) => ({ ...cover, bound, unlocked: bound >= cover.need }));
}

export function getYearbookCover(state) {
  return getYearbookCovers(state).filter((cover) => cover.unlocked).slice(-1)[0] || null;
}

// ---------- round 19 1/3: rereading a past volume ----------

const VOLUME_RECALLS = [
  "说翻开那一册时，像回到了那年的傍晚",
  "把那一年的事又讲了一遍，语气比从前慢",
  "指着分册里的一页，说还记得那天的天气",
  "笑着说那一册比记忆里厚了不少",
  "轻声念出分册上的一行字，然后停了停",
];

function boundPastVolumes(state) {
  return getYearbookVolumes(state).filter((volume) => volume.bound && volume.year < String(new Date().getFullYear()));
}

export function getYearbookRecallLine(state, year) {
  const past = boundPastVolumes(state);
  const index = past.findIndex((volume) => volume.year === String(year));
  if (index < 0) return "";
  return past[index].year + " 年的年鉴，" + VOLUME_RECALLS[index % VOLUME_RECALLS.length];
}

export function getYearbookRecall(state) {
  initExplore(state);
  const lines = boundPastVolumes(state).map((volume) => getYearbookRecallLine(state, volume.year)).filter(Boolean);
  if (!lines.length) return "";
  logEvent(state, "yearbook_recall");
  return "邻居翻看往年分册：" + lines.join("；");
}
