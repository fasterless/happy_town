// 第八轮玩法 2/3：称号与头像框
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, normalizeState, CURRENT_VERSION } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { levels } from '../src/config/levels.js';
import { titles, frames } from '../src/config/cosmetics.js';
import {
  isCosmeticsUnlocked, equipTitle, equipFrame, clearTitle,
  getEquippedTitle, getEquippedFrame, getCosmeticBoard, getUnlockedCosmeticCount,
} from '../src/systems/cosmetics.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  const tier = levels.filter((lv) => lv.level <= level).at(-1);
  state.wallet.exp = tier ? tier.needExp : 0;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  return state;
}

describe('称号与头像框', () => {
  it('Lv.4 解锁，Lv.3 锁定', () => {
    expect(isCosmeticsUnlocked(freshState(3))).toBe(false);
    expect(isCosmeticsUnlocked(freshState(4))).toBe(true);
  });

  it('等级够就解锁「新居民」，没达标的装备不了', () => {
    const state = freshState(4);
    expect(equipTitle(state, 'newcomer').success).toBe(true);
    expect(getEquippedTitle(state).id).toBe('newcomer');

    const farmer = equipTitle(state, 'farmer'); // 要收获 50 次
    expect(farmer.success).toBe(false);
    expect(farmer.message).toContain('收获 50 次');
    expect(getEquippedTitle(state).id).toBe('newcomer'); // 失败不改装备
  });

  it('达到计数后解锁并可以装备', () => {
    const state = freshState(8);
    state.analytics.fishing_cast = 30;
    expect(equipTitle(state, 'angler').success).toBe(true);
    expect(getEquippedTitle(state).name).toBe('湖畔常客');
    expect(state.analytics.cosmetic_equip).toBe(1);
  });

  it('剧情进度解锁称号', () => {
    const state = freshState(20);
    expect(equipTitle(state, 'storyteller').success).toBe(false);
    state.story.chapterIndex = 7;
    expect(equipTitle(state, 'storyteller').success).toBe(true);
  });

  it('卸下称号后顶栏不再显示', () => {
    const state = freshState(4);
    equipTitle(state, 'newcomer');
    expect(clearTitle(state).success).toBe(true);
    expect(getEquippedTitle(state)).toBeNull();
    expect(clearTitle(state).success).toBe(false);
  });

  it('头像框同理：未解锁拒绝，解锁后装备', () => {
    const state = freshState(4);
    expect(equipFrame(state, 'plain').success).toBe(true);
    expect(getEquippedFrame(state).css).toBe('frame-plain');

    expect(equipFrame(state, 'wave').success).toBe(false); // 要钓鱼 10 次
    state.analytics.fishing_cast = 10;
    expect(equipFrame(state, 'wave').success).toBe(true);
    expect(getEquippedFrame(state).id).toBe('wave');
  });

  it('不存在的收藏被拒绝', () => {
    const state = freshState(20);
    expect(equipTitle(state, 'nope').success).toBe(false);
    expect(equipFrame(state, 'nope').success).toBe(false);
  });

  it('未解锁系统时不能装备', () => {
    const state = freshState(3);
    expect(equipTitle(state, 'newcomer').message).toContain('Lv.4');
  });

  it('面板标注解锁与装备状态', () => {
    const state = freshState(4);
    equipTitle(state, 'newcomer');
    const board = getCosmeticBoard(state);

    const newcomer = board.titles.find((row) => row.item.id === 'newcomer');
    expect(newcomer.unlocked).toBe(true);
    expect(newcomer.equipped).toBe(true);

    const legend = board.titles.find((row) => row.item.id === 'legend');
    expect(legend.unlocked).toBe(false);
  });

  it('解锁全部收藏达成「收藏家」', () => {
    const state = freshState(20);
    state.analytics.harvest_crop = 50;
    state.analytics.fishing_cast = 30;
    state.analytics.mine_dig = 30;
    state.analytics.cafe_serve = 10;
    state.analytics.plant_crop = 20;
    state.analytics.gold_crop = 5;
    state.story.chapterIndex = 7;
    state.relationships.memories = {
      npc_mayor: ['acquainted', 'familiar', 'close'],
      npc_baker: ['acquainted', 'familiar'],
    };
    state.relationships.claimed = {
      npc_mayor: ['close'], npc_baker: ['close'], npc_florist: ['close'],
    };
    state.achievements.unlocked = Array.from({ length: 30 }, (_, i) => `a${i}`);

    expect(getUnlockedCosmeticCount(state)).toBe(titles.length + frames.length);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('cosmetic_all');
  });

  it('装备一次达成「有点面子」', () => {
    const state = freshState(4);
    equipFrame(state, 'plain');
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('cosmetic_first');
  });
});

describe('存档迁移 v19', () => {
  it('v18 老存档迁移后补上 cosmetics 且剧情进度保留', () => {
    const saved = createDefaultState();
    saved.version = 18;
    delete saved.cosmetics;
    saved.story.chapterIndex = 3;

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(CURRENT_VERSION);
    expect(merged.story.chapterIndex).toBe(3);
    expect(merged.cosmetics.equippedTitle).toBeNull();
    expect(merged.cosmetics.equippedFrame).toBeNull();
  });

  it('损坏的 cosmetics 形状被 normalizeState 修好', () => {
    const state = createDefaultState();
    state.cosmetics = { equippedTitle: 5, equippedFrame: false };
    normalizeState(state);
    expect(state.cosmetics.equippedTitle).toBeNull();
    expect(state.cosmetics.equippedFrame).toBeNull();
  });
});

describe('关系收藏', () => {
  it('听过五段回忆解锁称号，三位知心邻居解锁头像框', () => {
    const state = createDefaultState();
    state.wallet.level = 4;
    state.relationships.memories = {
      npc_mayor: ['acquainted', 'familiar'],
      npc_baker: ['acquainted', 'familiar'],
      npc_florist: ['acquainted'],
    };
    state.relationships.claimed = {
      npc_mayor: ['close'], npc_baker: ['close'], npc_florist: ['close'],
    };
    const board = getCosmeticBoard(state);
    expect(board.titles.find((row) => row.item.id === 'listener').unlocked).toBe(true);
    expect(board.frames.find((row) => row.item.id === 'bond').unlocked).toBe(true);
  });
});
