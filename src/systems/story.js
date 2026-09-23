// 小镇剧情系统（第八轮 1/3）
//
// 进度存在 state.story.chapterIndex：指向当前进行的章节，
// 等于章节总数时表示全部完成。任务本身的进度不存，每次从 state 里现算，
// 所以玩家在解锁剧情之前做过的事也会被算进去。
import { storyChapters, STORY_MIN_LEVEL } from '../config/story.js';
import { addRewards } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';

/**
 * 剧情是否解锁
 */
export function isStoryUnlocked(state) {
  return state.wallet.level >= STORY_MIN_LEVEL;
}

/**
 * 当前进行到第几章（0 起，等于章节数表示通关）
 */
export function getChapterIndex(state) {
  const index = state.story?.chapterIndex || 0;
  return Math.min(index, storyChapters.length);
}

/**
 * 是否已通关
 */
export function isStoryComplete(state) {
  return getChapterIndex(state) >= storyChapters.length;
}

/**
 * 一个任务的当前进度
 */
function taskProgress(state, task) {
  const { check } = task;
  if (check.stat) return state.analytics?.[check.stat] || 0;
  if (check.wallet) return state.wallet?.[check.wallet] || 0;
  if (check.count) return state.inventory?.[check.count] || 0;
  if (check.planted) return (state.farm?.plantedTypes || []).length;
  if (check.greenhouse) return state.greenhouse?.totalPlanted || 0;
  if (check.served) return state.cafe?.totalServed || 0;
  if (check.charms) return (state.charms?.owned || []).length;
  if (check.talents) return (state.talents?.unlocked || []).length;
  return 0;
}

/**
 * 当前章节的任务完成情况（通关后返回 null）
 */
export function getCurrentChapter(state) {
  if (isStoryComplete(state)) return null;
  const chapter = storyChapters[getChapterIndex(state)];
  return {
    chapter,
    tasks: chapter.tasks.map((task) => {
      const progress = taskProgress(state, task);
      return {
        task,
        progress: Math.min(progress, task.check.need),
        done: progress >= task.check.need,
      };
    }),
  };
}

/**
 * 领取当前章节的奖励并推进到下一章（任务没做完时拒绝）
 * @returns {Object} { success, message, state }
 */
export function claimChapter(state) {
  if (!isStoryUnlocked(state)) {
    return { success: false, message: `Lv.${STORY_MIN_LEVEL} 解锁小镇剧情` };
  }
  if (isStoryComplete(state)) {
    return { success: false, message: '剧情已经全部完成了' };
  }

  const current = getCurrentChapter(state);
  const pending = current.tasks.filter((entry) => !entry.done);
  if (pending.length) {
    return { success: false, message: `还有 ${pending.length} 件委托没完成` };
  }

  const { chapter } = current;
  addRewards(state, chapter.reward);
  state.story.chapterIndex = getChapterIndex(state) + 1;
  logEvent(state, 'story_chapter');

  const next = storyChapters[state.story.chapterIndex];
  const tail = next ? `下一章：${next.title}` : '小镇的故事到这里告一段落';
  return {
    success: true,
    message: `完成了「${chapter.title}」，${chapter.npc}很满意。${tail}`,
    state,
  };
}

export { storyChapters, STORY_MIN_LEVEL };
