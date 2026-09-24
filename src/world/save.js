// 像素小镇的存档
//
// 用自己的键，和主游戏的 neighbor-town-mvp-state-v2 互不读写。
// 读到坏数据或旧形状时回退到默认状态，不抛错。

import { createWorldState } from './sim.js';

export const WORLD_STORAGE_KEY = 'neighbor-town-world-state-v1';

const storage = () => (typeof localStorage === 'undefined' ? null : localStorage);

export function loadWorld(now = Date.now()) {
  const base = createWorldState(now);
  const store = storage();
  if (!store) return base;
  try {
    const saved = JSON.parse(store.getItem(WORLD_STORAGE_KEY));
    if (!saved || saved.version !== 1) return base;
    return {
      ...base,
      ...saved,
      bag: { ...base.bag, ...(saved.bag || {}) },
      plots: base.plots.map((plot, i) => ({ ...plot, ...(saved.plots?.[i] || {}) })),
      greenhouse: base.greenhouse.map((plot, i) => ({ ...plot, ...(saved.greenhouse?.[i] || {}) })),
      cafeServed: Array.isArray(saved.cafeServed) ? saved.cafeServed : [],
      forageCount: Number.isFinite(saved.forageCount) ? saved.forageCount : base.forageCount,
      forageDay: typeof saved.forageDay === 'string' ? saved.forageDay : base.forageDay,
      boardDone: Boolean(saved.boardDone),
      boardDay: typeof saved.boardDay === 'string' ? saved.boardDay : base.boardDay,
      bonusDay: typeof saved.bonusDay === 'string' ? saved.bonusDay : base.bonusDay,
      wishDay: typeof saved.wishDay === 'string' ? saved.wishDay : base.wishDay,
      friends: saved.friends && typeof saved.friends === 'object' ? saved.friends : base.friends,
      stats: { ...base.stats, ...(saved.stats && typeof saved.stats === 'object' ? saved.stats : {}) },
    };
  } catch (error) {
    console.warn('像素小镇存档读不出来，用新档', error);
    return base;
  }
}

export function saveWorld(state) {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(WORLD_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('像素小镇存档写失败', error);
  }
}
