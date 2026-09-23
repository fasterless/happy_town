// 第十三轮玩法（2/3）：共建邻居事件与永久回顾
import { describe, expect, it } from 'vitest';
import { createDefaultState, mergeState, normalizeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { storyChapters } from '../src/config/story.js';
import { inviteNeighborToTownProject, contributeToTownProject, getTownProjectJournal, getTownProjectProgress } from '../src/systems/townProjects.js';
import { renderCommunityView } from '../src/ui/renderer.js';

function completedStoryState() {
  const state = createDefaultState();
  state.wallet.level = 20;
  state.story.chapterIndex = storyChapters.length;
  return state;
}

describe('共建邻居参与与建设回顾', () => {
  it('邀请好友参与路线，按关系阶段生成邀请对白并记录回顾', () => {
    const state = completedStoryState();
    state.friends.find((friend) => friend.id === 'npc_florist').isFriend = true;
    state.relationships.points.npc_florist = 16;

    const result = inviteNeighborToTownProject(state, 'plaza', 'npc_florist');
    expect(result.success).toBe(true);
    expect(result.message).toContain('阿梨');
    expect(result.message).toContain('喜欢的花园');
    expect(state.community.projects.invitations.plaza).toBe('npc_florist');
    expect(getTownProjectJournal(state, 'plaza')).toHaveLength(1);
    expect(getTownProjectJournal(state, 'plaza')[0]).toMatchObject({ type: 'invite', tier: 'close', npcName: '花园阿梨' });
  });

  it('未成为好友不能邀请，同一路线不能重复邀请', () => {
    const state = completedStoryState();
    expect(inviteNeighborToTownProject(state, 'plaza', 'npc_florist').success).toBe(false);
    state.friends.find((friend) => friend.id === 'npc_mayor').isFriend = true;
    expect(inviteNeighborToTownProject(state, 'plaza', 'npc_mayor').success).toBe(true);
    expect(inviteNeighborToTownProject(state, 'plaza', 'npc_baker').success).toBe(false);
  });

  it('阶段完工记录冻结当时的伙伴与关系对白，之后关系变化不改写旧记录', () => {
    const state = completedStoryState();
    state.friends.find((friend) => friend.id === 'npc_florist').isFriend = true;
    state.relationships.points.npc_florist = 8;
    inviteNeighborToTownProject(state, 'plaza', 'npc_florist');
    state.inventory.twig = 20;
    const result = contributeToTownProject(state, 'plaza', 'twig', 20);

    expect(result.success).toBe(true);
    expect(result.storyLine).toContain('花园阿梨');
    expect(getTownProjectJournal(state, 'plaza')).toHaveLength(2);
    expect(getTownProjectJournal(state, 'plaza')[1]).toMatchObject({ type: 'stage', stage: 1, tier: 'familiar' });
    state.relationships.points.npc_florist = 16;
    expect(getTownProjectJournal(state, 'plaza')[1].line).toContain('等花长高');
    expect(getTownProjectProgress(state, 'plaza').tale).toContain('一起种下的小镇春天');
  });

  it('损坏的邀请与回顾字段归一化为空结构', () => {
    const state = createDefaultState();
    state.community.projects = { completed: [], progress: {}, invitations: null, journal: null };
    normalizeState(state);
    expect(state.community.projects.invitations).toEqual({});
    expect(state.community.projects.journal).toEqual([]);
  });

  it('v28 老存档迁移补齐邀请与永久回顾字段', () => {
    const saved = createDefaultState();
    saved.version = 28;
    saved.community.projects = { completed: [], progress: {} };
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.community.projects.invitations).toEqual({});
    expect(merged.community.projects.journal).toEqual([]);
  });

  it('共建页面展示邀请状态、当前伙伴对白和永久建设回顾', () => {
    const state = completedStoryState();
    state.wallet.level = 10;
    state.community.joined = true;
    state.friends.find((friend) => friend.id === 'npc_mayor').isFriend = true;
    inviteNeighborToTownProject(state, 'station', 'npc_mayor');

    const html = renderCommunityView(state);
    expect(html).toContain('邀请邻居：林镇长');
    expect(html).toContain('📖 共建回顾');
    expect(html).toContain('你邀请林镇长一起修整车站');
  });
});
