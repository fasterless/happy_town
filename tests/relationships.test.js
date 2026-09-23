// 邻居关系：独立进度、阶段奖励只发一次、旧存档迁移
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { visitFriend, waterFriendPlot } from '../src/systems/friends.js';
import { fulfillRequest, getTodayRequests } from '../src/systems/helpBoard.js';
import { todayKey } from '../src/utils/time.js';
import { getRelationshipProgress } from '../src/systems/relationships.js';
import { getCount } from '../src/core/inventory.js';

function freshState(level = 10) {
  const state = createDefaultState();
  state.wallet.level = level;
  return state;
}

describe('邻居关系进度', () => {
  it('拜访和帮浇分别增加熟悉度，且不影响其他邻居', () => {
    const state = freshState();
    visitFriend(state, 'npc_mayor');
    waterFriendPlot(state, 'npc_mayor');

    expect(getRelationshipProgress(state, 'npc_mayor').points).toBe(2);
    expect(getRelationshipProgress(state, 'npc_baker').points).toBe(0);
  });

  it('回应求助增加 2 点，达到阶段时奖励只发一次', () => {
    const state = freshState();
    const request = { friendId: 'npc_mayor', item: 'wood', name: '木材', icon: '🪵', count: 1, point: 5 };
    state.inventory.wood = 10;
    const beforeCoin = getCount(state, 'coin');

    for (let i = 0; i < 2; i++) {
      state.help.date = todayKey();
      state.help.requests = [{ ...request }];
      state.help.doneIds = {};
      expect(getTodayRequests(state)[0].friendId).toBe('npc_mayor');
      const result = fulfillRequest(state, 0);
      expect(result.success).toBe(true);
    }

    const progress = getRelationshipProgress(state, 'npc_mayor');
    expect(progress.points).toBe(4);
    expect(progress.current.id).toBe('acquainted');
    expect(getCount(state, 'coin')).toBe(beforeCoin + 80);

    state.help.date = todayKey();
    state.help.requests = [{ ...request }];
    state.help.doneIds = {};
    fulfillRequest(state, 0);
    expect(getCount(state, 'coin')).toBe(beforeCoin + 80);
  });

  it('一次跨越多个阶段时，未领奖励会一起补发', () => {
    const state = freshState();
    state.relationships.points.npc_baker = 15;
    visitFriend(state, 'npc_baker');

    const progress = getRelationshipProgress(state, 'npc_baker');
    expect(progress.points).toBe(16);
    expect(progress.current.id).toBe('close');
    expect(state.relationships.claimed.npc_baker).toEqual(['acquainted', 'familiar', 'close']);
    expect(getCount(state, 'diamond')).toBeGreaterThanOrEqual(20);
  });
});

describe('关系存档迁移', () => {
  it('v20 存档补上独立的关系进度', () => {
    const saved = createDefaultState();
    saved.version = 20;
    delete saved.relationships;
    const merged = mergeState(createDefaultState(), saved);
    delete merged.relationships;
    merged.version = 20;

    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.relationships).toEqual({ points: {}, claimed: {} });
  });
});
