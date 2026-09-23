// 第八轮玩法 1/3：小镇剧情
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, normalizeState } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { levels } from '../src/config/levels.js';
import { storyChapters } from '../src/config/story.js';
import {
  isStoryUnlocked, getCurrentChapter, claimChapter, isStoryComplete, getChapterIndex,
} from '../src/systems/story.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  const tier = levels.filter((lv) => lv.level <= level).at(-1);
  state.wallet.exp = tier ? tier.needExp : 0;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  return state;
}

/** 把当前章节的任务进度全部灌满 */
function fillChapter(state) {
  const { tasks } = getCurrentChapter(state);
  tasks.forEach(({ task }) => {
    const { check } = task;
    if (check.stat) state.analytics[check.stat] = check.need;
    if (check.wallet === 'coin') state.wallet.coin = Math.max(state.wallet.coin, check.need);
    if (check.wallet === 'level') state.wallet.level = Math.max(state.wallet.level, check.need);
    if (check.planted) state.farm.plantedTypes = Array.from({ length: check.need }, (_, i) => 1000 + i);
    if (check.greenhouse) state.greenhouse.totalPlanted = check.need;
    if (check.served) state.cafe.totalServed = check.need;
    if (check.charms) state.charms.owned = Array.from({ length: check.need }, (_, i) => 8000 + i);
    if (check.talents) state.talents.unlocked = Array.from({ length: check.need }, (_, i) => `n${i}`);
  });
}

describe('小镇剧情', () => {
  it('Lv.3 解锁，Lv.2 锁定', () => {
    expect(isStoryUnlocked(freshState(2))).toBe(false);
    expect(isStoryUnlocked(freshState(3))).toBe(true);
  });

  it('新号从第一章开始，进度按已有计数计算', () => {
    const state = freshState(3);
    state.wallet.coin = 50;
    const current = getCurrentChapter(state);
    expect(current.chapter.id).toBe('ch1');

    const coinTask = current.tasks.find((entry) => entry.task.id === 'ch1_coin');
    expect(coinTask.progress).toBe(50);
    expect(coinTask.done).toBe(false);
  });

  it('任务没做完不能交付', () => {
    const state = freshState(3);
    state.wallet.coin = 0;
    const result = claimChapter(state);
    expect(result.success).toBe(false);
    expect(state.story.chapterIndex).toBe(0);
  });

  it('做完一章拿奖励并推进到下一章', () => {
    const state = freshState(3);
    fillChapter(state);
    const before = state.wallet.coin;

    const result = claimChapter(state);
    expect(result.success).toBe(true);
    expect(result.message).toContain('认识邻居');
    expect(getChapterIndex(state)).toBe(1);
    expect(state.wallet.coin).toBe(before + storyChapters[0].reward.coin);
    expect(state.analytics.story_chapter).toBe(1);
  });

  it('交付后进度保留，老玩家的历史计数直接算进新章节', () => {
    const state = freshState(8);
    state.analytics.friend_visit = 5;
    fillChapter(state);
    claimChapter(state);

    const current = getCurrentChapter(state);
    expect(current.chapter.id).toBe('ch2');
    const visit = current.tasks.find((entry) => entry.task.id === 'ch2_visit');
    expect(visit.done).toBe(true);
  });

  it('未解锁时不能交付', () => {
    const state = freshState(2);
    const result = claimChapter(state);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.3');
  });

  it('七章全部完成后进入通关状态', () => {
    const state = freshState(20);
    storyChapters.forEach(() => {
      fillChapter(state);
      expect(claimChapter(state).success).toBe(true);
    });

    expect(isStoryComplete(state)).toBe(true);
    expect(getCurrentChapter(state)).toBeNull();
    const again = claimChapter(state);
    expect(again.success).toBe(false);
    expect(state.analytics.story_chapter).toBe(storyChapters.length);

    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('story_first');
    expect(state.achievements.unlocked).toContain('story_all');
  });

  it('章节配置完整：任务目标为正，奖励非空', () => {
    expect(storyChapters.length).toBe(7);
    const ids = new Set();
    storyChapters.forEach((chapter) => {
      expect(chapter.tasks.length).toBeGreaterThan(0);
      expect(Object.keys(chapter.reward).length).toBeGreaterThan(0);
      chapter.tasks.forEach((task) => {
        expect(ids.has(task.id)).toBe(false);
        ids.add(task.id);
        expect(task.check.need).toBeGreaterThan(0);
      });
    });
  });
});

describe('存档迁移 v18', () => {
  it('v17 老存档迁移后从第一章开始且咖啡馆记录保留', () => {
    const saved = createDefaultState();
    saved.version = 17;
    delete saved.story;
    saved.cafe.totalServed = 4;

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(19);
    expect(merged.cafe.totalServed).toBe(4);
    expect(merged.story.chapterIndex).toBe(0);
  });

  it('损坏的 story 形状被 normalizeState 修好', () => {
    const state = createDefaultState();
    state.story = { chapterIndex: -3 };
    normalizeState(state);
    expect(state.story.chapterIndex).toBe(0);

    state.story = { chapterIndex: '坏掉了' };
    normalizeState(state);
    expect(state.story.chapterIndex).toBe(0);
  });
});
