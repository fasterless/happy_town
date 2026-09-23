// 第十三轮玩法（1/3）：小镇共建计划
import { describe, expect, it } from 'vitest';
import { createDefaultState, mergeState, normalizeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { storyChapters } from '../src/config/story.js';
import { townProjects } from '../src/config/townProjects.js';
import * as TownProjectsSystem from '../src/systems/townProjects.js';
import * as AchievementsSystem from '../src/systems/achievements.js';
import { renderCommunityView } from '../src/ui/renderer.js';

function finishedStoryState() {
  const state = createDefaultState();
  state.wallet.level = 20;
  state.story.chapterIndex = storyChapters.length;
  state.wallet.coin = 1000;
  return state;
}

describe('小镇共建计划', () => {
  it('第二季剧情完成后开放，且不要求加入原有社区', () => {
    const state = createDefaultState();
    expect(TownProjectsSystem.areTownProjectsUnlocked(state)).toBe(false);
    expect(TownProjectsSystem.contributeToTownProject(state, 'plaza', 'wood', 1).success).toBe(false);

    state.story.chapterIndex = storyChapters.length;
    expect(TownProjectsSystem.areTownProjectsUnlocked(state)).toBe(true);
    expect(state.community.joined).toBe(false);
    expect(TownProjectsSystem.getTownProjectProgress(state, 'plaza').stage).toBe(0);
  });

  it('多条路线可独立推进，过量提交只扣除阶段所需材料', () => {
    const state = finishedStoryState();
    state.inventory.twig = 25;

    const result = TownProjectsSystem.contributeToTownProject(state, 'plaza', 'twig', 25);
    expect(result.success).toBe(true);
    expect(result.donated).toBe(20);
    expect(state.inventory.twig).toBe(5);
    expect(TownProjectsSystem.getTownProjectProgress(state, 'plaza')).toMatchObject({ stage: 1, points: 0 });
    expect(TownProjectsSystem.getTownProjectProgress(state, 'station')).toMatchObject({ stage: 0, points: 0 });
    expect(state.community.projects.completed).toEqual([]);
  });

  it('拒绝无效路线、材料、数量和不足库存', () => {
    const state = finishedStoryState();
    state.inventory.wood = 0;
    expect(TownProjectsSystem.contributeToTownProject(state, 'unknown', 'wood', 1).success).toBe(false);
    expect(TownProjectsSystem.contributeToTownProject(state, 'plaza', 'ticket', 1).success).toBe(false);
    expect(TownProjectsSystem.contributeToTownProject(state, 'plaza', 'wood', 0).success).toBe(false);
    expect(TownProjectsSystem.contributeToTownProject(state, 'plaza', 'wood', 1).success).toBe(false);
  });

  it('完成路线后发放家具、登记图鉴并推进成就', () => {
    const state = finishedStoryState();
    state.inventory.twig = 20;
    state.inventory.wood = 30;
    expect(TownProjectsSystem.contributeToTownProject(state, 'plaza', 'twig', 20).completedStage).toBe(true);
    const result = TownProjectsSystem.contributeToTownProject(state, 'plaza', 'wood', 30);

    expect(result.success).toBe(true);
    expect(result.completedProject).toBe(true);
    expect(state.community.projects.completed).toContain('plaza');
    expect(state.inventory.f_3018).toBe(1);
    expect(state.codex.furniture).toContain(3018);
    expect(state.analytics.town_project_complete).toBe(1);
    expect(TownProjectsSystem.contributeToTownProject(state, 'plaza', 'wood', 1).success).toBe(false);

    AchievementsSystem.checkAchievements(state);
    expect(state.achievements.unlocked).toContain('town_project_first');

    state.community.projects.completed.push('station', 'shore');
    AchievementsSystem.checkAchievements(state);
    expect(state.achievements.unlocked).toContain('town_projects_all');
  });

  it('社区页面通关前隐藏路线，通关后展示所有路线及当前进度', () => {
    const state = finishedStoryState();
    state.wallet.level = 10;
    state.community.joined = true;
    expect(renderCommunityView(state)).toContain('花满广场');
    expect(renderCommunityView(state)).toContain('车站新钟');
    expect(renderCommunityView(state)).toContain('湖岸长椅');

    state.story.chapterIndex = storyChapters.length - 1;
    expect(renderCommunityView(state)).not.toContain('小镇共建计划');
  });

  it('v27 老存档迁移补齐进度结构，损坏结构可归一化', () => {
    const saved = createDefaultState();
    saved.version = 27;
    saved.community.projects = null;
    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);
    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.community.projects).toEqual({ completed: [], progress: {}, invitations: {}, journal: [], activeStyle: null, seenStyles: [] });

    merged.community.projects = { completed: null, progress: null };
    normalizeState(merged);
    expect(merged.community.projects).toEqual({ completed: [], progress: {}, invitations: {}, journal: [], activeStyle: null, seenStyles: [] });
  });

  it('所有共建路线都有阶段、正向需求和家具奖励', () => {
    expect(townProjects).toHaveLength(3);
    townProjects.forEach((project) => {
      expect(project.stages.length).toBeGreaterThan(0);
      project.stages.forEach((stage) => {
        expect(stage.target).toBeGreaterThan(0);
        expect(stage.accepts.length).toBeGreaterThan(0);
      });
      expect(Object.keys(project.stages.at(-1).reward).some((key) => key.startsWith('f_'))).toBe(true);
    });
  });
});
