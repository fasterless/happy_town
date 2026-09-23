// 第十三轮玩法（3/3）：小镇风貌收藏
import { describe, expect, it } from 'vitest';
import { createDefaultState, mergeState, normalizeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { storyChapters } from '../src/config/story.js';
import { townStyles } from '../src/config/townStyles.js';
import * as TownStylesSystem from '../src/systems/townStyles.js';
import * as AchievementsSystem from '../src/systems/achievements.js';
import { renderCommunityView } from '../src/ui/renderer.js';

function completedStoryState() {
  const state = createDefaultState();
  state.wallet.level = 20;
  state.story.chapterIndex = storyChapters.length;
  return state;
}

describe('小镇风貌收藏', () => {
  it('路线未完工时不能预览或选择对应风貌', () => {
    const state = completedStoryState();
    expect(TownStylesSystem.getUnlockedTownStyles(state)).toEqual([]);
    expect(TownStylesSystem.previewTownStyle(state, 'plaza').success).toBe(false);
    expect(TownStylesSystem.chooseTownStyle(state, 'plaza').success).toBe(false);
    expect(state.community.projects.activeStyle).toBeNull();
  });

  it('仅路线完成后解锁主题预览', () => {
    const state = completedStoryState();
    state.community.projects.completed.push('plaza');
    expect(TownStylesSystem.getUnlockedTownStyles(state).map((style) => style.id)).toEqual(['plaza']);
    expect(TownStylesSystem.previewTownStyle(state, 'plaza')).toMatchObject({ success: true, style: { id: 'plaza' } });
    expect(TownStylesSystem.previewTownStyle(state, 'unknown').success).toBe(false);
    expect(state.community.projects.activeStyle).toBeNull();
    expect(state.community.projects.seenStyles).toEqual([]);
  });

  it('采用风貌会永久收录，恢复默认不会清除回顾或共建进度', () => {
    const state = completedStoryState();
    state.community.projects.completed.push('plaza', 'station');

    expect(TownStylesSystem.chooseTownStyle(state, 'plaza').success).toBe(true);
    expect(TownStylesSystem.getActiveTownStyle(state).id).toBe('plaza');
    expect(TownStylesSystem.chooseTownStyle(state, 'station').success).toBe(true);
    expect(state.community.projects.seenStyles).toEqual(['plaza', 'station']);
    expect(TownStylesSystem.clearTownStyle(state).success).toBe(true);
    expect(TownStylesSystem.getActiveTownStyle(state)).toBeNull();
    expect(TownStylesSystem.getSeenTownStyles(state).map((style) => style.id)).toEqual(['plaza', 'station']);
    expect(state.community.projects.completed).toEqual(['plaza', 'station']);
    expect(TownStylesSystem.clearTownStyle(state).success).toBe(false);
  });

  it('全收录成就按历史采用记录计算，不要求同时装备', () => {
    const state = completedStoryState();
    state.community.projects.completed.push(...townStyles.map((style) => style.projectId));
    state.community.projects.seenStyles = townStyles.map((style) => style.id);
    state.community.projects.activeStyle = null;
    AchievementsSystem.checkAchievements(state);
    expect(state.achievements.unlocked).toContain('town_styles_all');
    expect(TownStylesSystem.haveSeenAllTownStyles(state)).toBe(true);
  });

  it('社区页面显示锁定条件、风貌操作和历史收藏状态', () => {
    const state = completedStoryState();
    state.wallet.level = 10;
    state.community.joined = true;
    state.community.projects.completed.push('plaza');
    state.community.projects.seenStyles.push('plaza');
    const html = renderCommunityView(state);
    expect(html).toContain('小镇风貌收藏');
    expect(html).toContain('window.previewTownStyleHandler(\'plaza\')');
    expect(html).toContain('✓ 曾采用');
    expect(html).toContain('完成「车站新钟」解锁');
  });

  it('v29 老存档迁移与损坏存档归一化补齐风貌状态', () => {
    const saved = createDefaultState();
    saved.version = 29;
    saved.community.projects = { completed: ['plaza'], progress: {}, invitations: {}, journal: [] };
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.community.projects.activeStyle).toBeNull();
    expect(merged.community.projects.seenStyles).toEqual([]);

    merged.community.projects = { activeStyle: 3, seenStyles: null };
    normalizeState(merged);
    expect(merged.community.projects.activeStyle).toBeNull();
    expect(merged.community.projects.seenStyles).toEqual([]);
  });
});
