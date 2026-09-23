// 邻居每日日程：每天固定状态，拜访按状态给不同回礼
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { neighborSchedules, scheduleStates } from '../src/config/schedules.js';
import {
  ensureTodaySchedule, getScheduleState, tryScheduleGift,
} from '../src/systems/schedules.js';
import { visitFriend } from '../src/systems/friends.js';
import { todayKey } from '../src/utils/time.js';
import { getCount } from '../src/core/inventory.js';

function freshState(level = 10) {
  const state = createDefaultState();
  state.wallet.level = level;
  return state;
}

describe('每日排班', () => {
  it('每位邻居今天都有一个合法状态，且同一天内不变', () => {
    const state = freshState();
    const first = ensureTodaySchedule(state);
    const ids = scheduleStates.map((s) => s.id);

    neighborSchedules.forEach((entry) => {
      expect(ids).toContain(first[entry.npc]);
    });
    expect(state.schedules.date).toBe(todayKey());

    // 再取一次不会重排
    const again = ensureTodaySchedule(state);
    expect(again).toEqual(first);
  });

  it('跨天会重新排班', () => {
    const state = freshState();
    ensureTodaySchedule(state);
    state.schedules.date = '2000-01-01';

    const next = ensureTodaySchedule(state);
    expect(state.schedules.date).toBe(todayKey());
    neighborSchedules.forEach((entry) => {
      expect(scheduleStates.map((s) => s.id)).toContain(next[entry.npc]);
    });
  });

  it('没有日程配置的邻居返回 null', () => {
    expect(getScheduleState(freshState(), 'npc_nobody')).toBeNull();
  });
});

describe('按状态回礼', () => {
  it('触发时按今天的状态发对应的东西，且每人每天只一次', () => {
    const state = freshState();
    // 把概率绕开：人情满格必触发。这里直接把随机数钉死。
    const realRandom = Math.random;
    Math.random = () => 0;

    const friendId = 'npc_mayor';
    const status = getScheduleState(state, friendId);
    const plan = neighborSchedules.find((n) => n.npc === friendId).states[status.id];
    const before = getCount(state, plan.rewards[0].key);

    const gift = tryScheduleGift(state, friendId);
    expect(gift).not.toBeNull();
    expect(gift.state).toBe(status.id);
    expect(getCount(state, plan.rewards[0].key)).toBe(before + plan.rewards[0].count);

    // 同一天再拜访不再给
    expect(tryScheduleGift(state, friendId)).toBeNull();

    Math.random = realRandom;
  });

  it('没触发时什么都不给', () => {
    const state = freshState();
    const realRandom = Math.random;
    Math.random = () => 0.99;
    expect(tryScheduleGift(state, 'npc_baker')).toBeNull();
    Math.random = realRandom;
  });

  it('拜访好友会走日程回礼', () => {
    const state = freshState();
    const realRandom = Math.random;
    Math.random = () => 0;
    const result = visitFriend(state, 'npc_mayor');
    expect(result.success).toBe(true);
    expect(result.message).toContain('获得');
    Math.random = realRandom;
  });
});

describe('存档迁移', () => {
  it('没有日程字段的旧存档迁移后补上默认值', () => {
    const saved = createDefaultState();
    saved.version = 19;
    delete saved.schedules;
    const merged = mergeState(createDefaultState(), saved);
    delete merged.schedules;
    merged.version = 19;

    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.schedules).toEqual({ date: '', today: {} });
  });
});
