// 第十四轮玩法（1/3）：邻居同行散步与永久回忆
import { describe, expect, it } from 'vitest';
import { createDefaultState, mergeState, normalizeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { storyChapters } from '../src/config/story.js';
import { renderExploreView } from '../src/ui/renderer.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { explorePlace, getExploreWalkJournal, walkWithNeighbor } from '../src/systems/explore.js';

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
});
