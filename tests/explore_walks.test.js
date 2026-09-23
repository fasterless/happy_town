// 第十四轮玩法（1/3）：邻居同行散步与永久回忆
import { describe, expect, it } from 'vitest';
import { createDefaultState, mergeState, normalizeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { storyChapters } from '../src/config/story.js';
import { renderExploreView } from '../src/ui/renderer.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { claimSouvenirGift, claimWalkSouvenir, bindYearbookVolume, claimYearbookMilestone, claimYearbookVolumeReward,  explorePlace, getClaimedWalkSouvenirs, getExploreWalkJournal, getSeasonRoutes, getSouvenirDisplay, getSouvenirRecognition, getWalkAlbum, getWalkSeason, getYearbook, getYearbookCount, getYearbookVolume, getYearbookVolumes, recordYearbookEntry,  recordSeasonWalk, toggleSouvenirDisplay, walkWithNeighbor } from '../src/systems/explore.js';
import { visitFriend } from '../src/systems/friends.js';
import { renderHomeView } from '../src/ui/renderer.js';

const WALK_FRIENDS = ['npc_mayor', 'npc_baker', 'npc_florist', 'npc_carpenter', 'npc_barista'];

function befriendAll(state) {
  state.friends.forEach((friend) => { friend.isFriend = true; });
}

function fillWalks(state, placeId) {
  befriendAll(state);
  WALK_FRIENDS.forEach((friendId) => walkWithNeighbor(state, placeId, friendId));
}

function finishedState() {
  const state = createDefaultState();
  state.wallet.level = 20;
  state.story.chapterIndex = storyChapters.length;
  return state;
}

describe('邻居同行散步', () => {
  it('同一地点与邻居只可同行一次，留下关系阶段与永久对白记录', () => {
    const state = finishedState();
    state.relationships.points.npc_mayor = 8;

    const result = walkWithNeighbor(state, 'grove', 'npc_mayor');
    expect(result.success).toBe(true);
    expect(result.walk).toMatchObject({ placeId: 'grove', friendId: 'npc_mayor', tier: 'familiar', friendName: '林镇长' });
    expect(result.message).toContain('林镇长');
    expect(getExploreWalkJournal(state, 'grove')).toHaveLength(1);
    expect(state.relationships.points.npc_mayor).toBe(9);
    expect(walkWithNeighbor(state, 'grove', 'npc_mayor').success).toBe(false);
  });

  it('不同关系阶段生成不同同行对白，历史文案不随关系升级而变化', () => {
    const state = finishedState();
    state.relationships.points.npc_baker = 0;
    const result = walkWithNeighbor(state, 'shore', 'npc_baker');
    expect(result.walk.tier).toBe('base');
    expect(result.walk.line).toContain('湖岸走了一圈');

    state.friends.find((friend) => friend.id === 'npc_florist').isFriend = true;
    state.relationships.points.npc_florist = 16;
    const close = walkWithNeighbor(state, 'shore', 'npc_florist');
    expect(close.walk.tier).toBe('close');
    expect(close.walk.line).toContain('风景显得格外温柔');
    state.relationships.points.npc_florist = 20;
    expect(getExploreWalkJournal(state, 'shore').find((walk) => walk.friendId === 'npc_florist').line).toBe(close.walk.line);
  });

  it('散步不要求先探索地点，也不消耗每日探索次数或物品', () => {
    const state = finishedState();
    state.explore.date = '2000-01-01';
    state.explore.visited = [];
    const beforeInventory = { ...state.inventory };
    const beforeLevel = state.wallet.level;

    const result = walkWithNeighbor(state, 'grove', 'npc_mayor');
    expect(result.success).toBe(true);
    expect(state.explore.visited).toEqual([]);
    expect(state.inventory).toEqual(beforeInventory);
    expect(state.wallet.level).toBe(beforeLevel);
    expect(state.explore.date).not.toBe('2000-01-01');
  });

  it('当天独自探索过地点后仍可邀请邻居同行', () => {
    const state = finishedState();
    expect(explorePlace(state, 'grove').success).toBe(true);
    const walked = walkWithNeighbor(state, 'grove', 'npc_mayor');
    expect(walked.success).toBe(true);
    expect(state.explore.visited).toContain('grove');
    expect(getExploreWalkJournal(state, 'grove')).toHaveLength(1);
  });

  it('拒绝未开放地点、未知地点与非好友', () => {
    const state = finishedState();
    expect(walkWithNeighbor(state, 'unknown', 'npc_mayor').success).toBe(false);
    state.wallet.level = 6;
    expect(walkWithNeighbor(state, 'shore', 'npc_mayor').success).toBe(false);
    state.wallet.level = 20;
    state.friends.find((friend) => friend.id === 'npc_florist').isFriend = false;
    expect(walkWithNeighbor(state, 'grove', 'npc_florist').success).toBe(false);
  });

  it('探索页展示同行入口和永久回忆记录', () => {
    const state = finishedState();
    state.friends.find((friend) => friend.id === 'npc_florist').isFriend = true;
    walkWithNeighbor(state, 'grove', 'npc_florist');
    const html = renderExploreView(state);
    expect(html).toContain('邀请散步');
    expect(html).toContain('邻居同行回忆');
    expect(html).toContain('和你沿着林间小路');
  });

  it('成就统计唯一同行过的邻居人数，单次散步不会重复计数', () => {
    const state = finishedState();
    walkWithNeighbor(state, 'grove', 'npc_mayor');
    walkWithNeighbor(state, 'shore', 'npc_mayor');
    walkWithNeighbor(state, 'grove', 'npc_baker');
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('explore_walk_1');
    expect(state.achievements.progress.explore_walk_all).toBe(2);
  });

  it('集齐一个地点的同行回忆后可领取一次足迹纪念，领取不消耗回忆', () => {
    const state = finishedState();
    befriendAll(state);
    WALK_FRIENDS.slice(0, 4).forEach((friendId) => walkWithNeighbor(state, 'grove', friendId));
    expect(claimWalkSouvenir(state, 'grove').success).toBe(false);

    walkWithNeighbor(state, 'grove', 'npc_barista');
    const before = state.explore.walks.length;
    const result = claimWalkSouvenir(state, 'grove');
    expect(result.success).toBe(true);
    expect(result.souvenir.id).toBe('souvenir_grove');
    expect(result.message).toContain('林间书签');
    expect(state.wallet.coin).toBeGreaterThan(0);
    expect(state.explore.walks).toHaveLength(before);
    expect(getClaimedWalkSouvenirs(state).map((souvenir) => souvenir.id)).toEqual(['souvenir_grove']);
    expect(claimWalkSouvenir(state, 'grove').success).toBe(false);
  });

  it('足迹纪念按地点分开计算，旧档里已经集齐的回忆可以直接补领', () => {
    const state = finishedState();
    fillWalks(state, 'grove');
    walkWithNeighbor(state, 'shore', 'npc_mayor');
    expect(claimWalkSouvenir(state, 'shore').success).toBe(false);
    expect(claimWalkSouvenir(state, 'grove').success).toBe(true);
  });

  it('探索页按进度展示足迹纪念，集齐后显示收藏按钮', () => {
    const state = finishedState();
    walkWithNeighbor(state, 'grove', 'npc_mayor');
    expect(renderExploreView(state)).toContain('林间书签 · 同行 1/5');

    fillWalks(state, 'grove');
    const ready = renderExploreView(state);
    expect(ready).toContain('收藏🍃林间书签');
    expect(ready).toContain("claimWalkSouvenirHandler('grove')");

    claimWalkSouvenir(state, 'grove');
    expect(renderExploreView(state)).toContain('林间书签 · 已收藏');
  });

  it('收藏足迹纪念解锁成就，集齐三枚达成全收藏', () => {
    const state = finishedState();
    fillWalks(state, 'grove');
    claimWalkSouvenir(state, 'grove');
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('explore_souvenir_1');
    expect(state.achievements.progress.explore_souvenir_all).toBe(1);

    fillWalks(state, 'shore');
    fillWalks(state, 'station');
    claimWalkSouvenir(state, 'shore');
    claimWalkSouvenir(state, 'station');
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('explore_souvenir_all');
  });

  it('v31 老存档迁移和损坏结构归一化会补齐 souvenirs', () => {
    const saved = createDefaultState();
    saved.version = 31;
    delete saved.explore.souvenirs;
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.explore.souvenirs).toEqual([]);

    merged.explore.souvenirs = null;
    normalizeState(merged);
    expect(merged.explore.souvenirs).toEqual([]);
  });

  it('v30 老存档迁移和损坏结构归一化会补齐 walks', () => {
    const saved = createDefaultState();
    saved.version = 30;
    delete saved.explore.walks;
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.explore.walks).toEqual([]);

    merged.explore.walks = null;
    normalizeState(merged);
    expect(merged.explore.walks).toEqual([]);
  });

  it("散步相册：集齐足迹纪念后解锁封面，不发新奖励", () => {
    const state = finishedState();
    fillWalks(state, "grove");
    expect(getWalkAlbum(state, "grove").unlocked).toBe(false);
    claimWalkSouvenir(state, "grove");
    const album = getWalkAlbum(state, "grove");
    expect(album.unlocked).toBe(true);
    expect(album.pages).toHaveLength(5);
    expect(getWalkAlbum(state, "shore").unlocked).toBe(false);
    const coin = state.wallet.coin;
    expect(coin).toBe(state.wallet.coin);
  });

  it("家园陈列只改展示，不占家具格也不消耗纪念", () => {
    const state = finishedState();
    fillWalks(state, "grove");
    claimWalkSouvenir(state, "grove");
    expect(toggleSouvenirDisplay(state, "souvenir_grove").success).toBe(true);
    expect(getSouvenirDisplay(state)[0].shown).toBe(true);
    expect(state.explore.souvenirs).toContain("souvenir_grove");
    expect(toggleSouvenirDisplay(state, "souvenir_shore").success).toBe(false);
    expect(renderHomeView(state).score).toContain("林间书签");
  });

  it("每枚纪念每天只能换一次小礼，纪念本身不消耗", () => {
    const state = finishedState();
    fillWalks(state, "grove");
    claimWalkSouvenir(state, "grove");
    const before = state.wallet.coin;
    expect(claimSouvenirGift(state, "souvenir_grove").success).toBe(true);
    expect(state.wallet.coin).toBe(before + 60);
    expect(state.explore.souvenirs).toContain("souvenir_grove");
    expect(claimSouvenirGift(state, "souvenir_grove").success).toBe(false);
    state.explore.gifts.date = "2000-01-01";
    expect(claimSouvenirGift(state, "souvenir_grove").success).toBe(true);
  });

  it("拜访时邻居按已收藏的足迹多一句对白，不加数值", () => {
    const state = finishedState();
    expect(getSouvenirRecognition(state)).toBe("");
    fillWalks(state, "grove");
    claimWalkSouvenir(state, "grove");
    const points = state.wallet.friendPoint;
    const result = visitFriend(state, "npc_mayor");
    expect(result.success).toBe(true);
    expect(result.message).toContain("林间小路的风声");
    expect(state.wallet.friendPoint - points).toBeLessThan(20);
  });

  it("同季同行盖一枚季章，每个地点每个季节只盖一次", () => {
    const state = finishedState();
    walkWithNeighbor(state, "grove", "npc_mayor");
    const stamped = state.explore.seasons.length;
    expect(stamped).toBe(1);
    walkWithNeighbor(state, "grove", "npc_baker");
    expect(state.explore.seasons).toHaveLength(1);
    const season = getWalkSeason(new Date("2026-01-15"));
    expect(recordSeasonWalk(state, "grove", new Date("2026-01-15")).seasonId).toBe(season.id);
    expect(recordSeasonWalk(state, "grove", new Date("2026-02-02"))).toBeNull();
  });

  it("集齐一个地点的四季集章后解锁常驻路线", () => {
    const state = finishedState();
    ["2026-04-01", "2026-07-01", "2026-09-15", "2026-12-01"].forEach((day) => {
      expect(recordSeasonWalk(state, "shore", new Date(day))).not.toBeNull();
    });
    const route = getSeasonRoutes(state).find((entry) => entry.placeId === "shore");
    expect(route.unlocked).toBe(true);
    expect(route.line.length).toBeGreaterThan(0);
    expect(getSeasonRoutes(state).find((entry) => entry.placeId === "grove").unlocked).toBe(false);
    checkAchievements(state);
    expect(state.achievements.progress.explore_season_all).toBe(4);
  });

  it("年鉴汇总已有收藏，里程碑达标领一次且不消耗收藏", () => {
    const state = finishedState();
    state.story.seenEndings = ["lantern", "garden", "station"];
    fillWalks(state, "grove");
    claimWalkSouvenir(state, "grove");
    expect(getYearbookCount(state)).toBeGreaterThanOrEqual(4);
    const before = getYearbookCount(state);
    expect(claimYearbookMilestone(state, "yb_3").success).toBe(true);
    expect(getYearbookCount(state)).toBe(before);
    expect(claimYearbookMilestone(state, "yb_3").success).toBe(false);
    expect(getYearbook(state).find((section) => section.id === "endings").entries).toHaveLength(3);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain("yearbook_1");
  });

  it("年鉴按年份装订，装订奖励只领一次且不消耗记录", () => {
    const state = finishedState();
    expect(recordYearbookEntry(state, 2024, "souvenirs", { id: "souvenir_grove", name: "林间书签", icon: "🍃" })).toBe(true);
    expect(recordYearbookEntry(state, 2024, "souvenirs", { id: "souvenir_grove", name: "林间书签", icon: "🍃" })).toBe(false);
    recordYearbookEntry(state, 2025, "seasons", { id: "grove:spring", name: "林间小路·春", icon: "🌸" });
    recordYearbookEntry(state, 2026, "endings", { id: "lantern", name: "灯会", icon: "🏮" });
    expect(getYearbookVolumes(state)).toHaveLength(3);
    expect(bindYearbookVolume(state, 2024).success).toBe(true);
    expect(bindYearbookVolume(state, 2024).success).toBe(false);
    expect(getYearbookVolume(state, 2024).bound).toBe(true);
    expect(getYearbookVolume(state, 2024).count).toBe(1);
    expect(claimYearbookVolumeReward(state, "vol_1").success).toBe(true);
    expect(claimYearbookVolumeReward(state, "vol_1").success).toBe(false);
    expect(claimYearbookVolumeReward(state, "vol_3").success).toBe(false);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain("yearbook_volume_1");
  });

  it("v33 老存档迁移会补齐年鉴分册", () => {
    const saved = createDefaultState();
    saved.version = 33;
    delete saved.explore.volumes;
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.explore.volumes).toEqual({});
    merged.explore.volumes = null;
    normalizeState(merged);
    expect(merged.explore.volumes).toEqual({});
  });

  it("v32 老存档迁移和损坏结构归一化会补齐新字段", () => {
    const saved = createDefaultState();
    saved.version = 32;
    delete saved.explore.seasons;
    delete saved.explore.yearbook;
    delete saved.explore.display;
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.explore.seasons).toEqual([]);
    expect(merged.explore.yearbook).toEqual([]);
    expect(merged.explore.display).toEqual({});

    merged.explore.seasons = null;
    normalizeState(merged);
    expect(merged.explore.seasons).toEqual([]);
  });

});
