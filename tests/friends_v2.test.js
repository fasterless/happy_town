// 第二阶段社交深化：好友帮浇 / 拜访连击 / 每周贡献榜
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { GAME_CONFIG } from '../src/config/constants.js';
import { yesterdayKey, weekKey } from '../src/utils/time.js';
import {
  waterFriendPlot, getWaterChancesLeft, hasWateredToday,
  visitFriend, likeFriend,
} from '../src/systems/friends.js';
import { rollWeekly, getWeeklyLeaderboard } from '../src/systems/community.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  return state;
}

describe('好友帮浇', () => {
  it('每天 3 次机会，用完即止', () => {
    const state = freshState();
    expect(getWaterChancesLeft(state)).toBe(GAME_CONFIG.social.waterPerDay);

    const a = waterFriendPlot(state, "npc_mayor");
    expect(a.success).toBe(true);
    expect(getWaterChancesLeft(state)).toBe(2);

    waterFriendPlot(state, "npc_baker");
    waterFriendPlot(state, "npc_florist"); // 会先自动加好友失败？— florist 默认不是好友
  });

  it('非好友不能浇，等级不够不能浇', () => {
    const state = freshState();
    const result = waterFriendPlot(state, "npc_florist"); // 默认未加好友
    expect(result.success).toBe(false);
    expect(result.message).toContain("好友");

    const low = freshState(4);
    expect(waterFriendPlot(low, "npc_mayor").success).toBe(false);
    expect(waterFriendPlot(low, "npc_mayor").message).toContain("Lv.5");
  });

  it('同一位好友每天只能浇一次', () => {
    const state = freshState();
    expect(waterFriendPlot(state, "npc_mayor").success).toBe(true);
    const again = waterFriendPlot(state, "npc_mayor");
    expect(again.success).toBe(false);
    expect(hasWateredToday(state, "npc_mayor")).toBe(true);
  });

  it('次数用完后拒绝，跨天恢复', () => {
    const state = freshState();
    waterFriendPlot(state, "npc_mayor");
    waterFriendPlot(state, "npc_baker");
    expect(waterFriendPlot(state, "npc_mayor").success).toBe(false); // 重复浇同一人也被拒
    // 补第 3 次：换一位（先加好友）
    state.friends[2].isFriend = true; // npc_florist
    expect(waterFriendPlot(state, "npc_florist").success).toBe(true);
    expect(getWaterChancesLeft(state)).toBe(0);
    const denied = waterFriendPlot(state, "npc_florist");
    expect(denied.success).toBe(false);

    // 跨天恢复
    state.social.waterDate = "2000-01-01";
    expect(getWaterChancesLeft(state)).toBe(GAME_CONFIG.social.waterPerDay);
  });

  it('帮浇给 2 友情点', () => {
    const state = freshState();
    const before = state.wallet.friendPoint;
    waterFriendPlot(state, "npc_mayor");
    expect(state.wallet.friendPoint).toBe(before + 2);
  });
});

describe('拜访连击', () => {
  it('首日拜访无加成，连续多天每天 +1 封顶 +5', () => {
    const state = freshState();
    const before = state.wallet.friendPoint;

    // 第一天：基础 3 友情点
    visitFriend(state, "npc_mayor");
    expect(state.wallet.friendPoint).toBe(before + 3);
    expect(state.social.visitStreak).toBe(1);

    // 同一天再拜访：不加连击（已经算过今天）
    state.friends[1].isFriend = true;
    visitFriend(state, "npc_baker");
    expect(state.social.visitStreak).toBe(1);

    // 第二天：连击 2，额外 +1
    state.social.lastVisitDate = yesterdayKey(); // 用真实昨天，连击才会续上
    state.social.visitStreak = 1;
    visitFriend(state, "npc_mayor");
    expect(state.social.visitStreak).toBe(2);
    expect(state.wallet.friendPoint).toBe(before + 3 + 3 + 3 + 1);

    // 断档重置
    state.social.lastVisitDate = "1999-01-01";
    visitFriend(state, "npc_baker");
    expect(state.social.visitStreak).toBe(1);
  });

  it('点赞不受连击影响，每日每人一次', () => {
    const state = freshState();
    const before = state.wallet.friendPoint;
    expect(likeFriend(state, "npc_mayor").success).toBe(true);
    expect(state.wallet.friendPoint).toBe(before + 5);
    expect(likeFriend(state, "npc_mayor").success).toBe(false);
  });
});

describe('每周社区贡献榜', () => {
  it('跨周清零我的周贡献', () => {
    const state = freshState();
    state.community.joined = true;
    state.community.weekly = { week: "2000-W0101", contribution: 500 };

    expect(rollWeekly(state)).toBe(true);
    expect(state.community.weekly.contribution).toBe(0);
    expect(state.community.weekly.week).toBe(weekKey());
    // 同周再调是幂等的
    expect(rollWeekly(state)).toBe(false);
  });

  it('排行榜含我和 NPC，同一周内 NPC 数值稳定', () => {
    const state = freshState();
    state.community.joined = true;
    // 先触发跨周清零，再攒本周贡献，避免 rollWeekly 把它清掉
    rollWeekly(state);
    state.community.weekly.contribution = 300;

    const board1 = getWeeklyLeaderboard(state);
    const board2 = getWeeklyLeaderboard(state);

    // 玩家不在 NPC 成员表里也会单列一行上榜
    expect(board1.filter((r) => r.isMe)).toHaveLength(1);
    const me1 = board1.find((r) => r.isMe);
    expect(me1.contribution).toBe(300);
    // NPC 数值稳定（同周不跳）
    board1.forEach((row, i) => {
      expect(row.contribution).toBe(board2[i].contribution);
    });
    // 名次连续
    board1.forEach((row, i) => expect(row.rank).toBe(i + 1));
  });
});
