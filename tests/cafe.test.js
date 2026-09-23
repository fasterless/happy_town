// 第七轮玩法 3/3：咖啡馆
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, normalizeState } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { levels } from '../src/config/levels.js';
import { dishes } from '../src/config/dishes.js';
import { getCafePrice } from '../src/config/cafe.js';
import {
  isCafeUnlocked, getTodayGuests, serveGuest, getGuestsWaiting, CAFE_MIN_LEVEL,
} from '../src/systems/cafe.js';

const SALAD = 7001; // 田园沙拉，Lv.6，原料是作物

function freshState(level = 16) {
  const state = createDefaultState();
  state.user.created = true;
  const tier = levels.filter((lv) => lv.level <= level).at(-1);
  state.wallet.exp = tier ? tier.needExp : 0;
  state.wallet.level = level;
  state.wallet.coin = 1000;
  return state;
}

/** 把今天的客人名单改成固定的一份，方便断言 */
function pinGuest(state, dishId) {
  getTodayGuests(state); // 先触发当天的抽取
  state.cafe.guests = [{ guestId: 'mayor', dishId, served: false }];
}

describe('咖啡馆', () => {
  it('Lv.8 解锁，Lv.7 锁定', () => {
    expect(isCafeUnlocked(freshState(7))).toBe(false);
    expect(isCafeUnlocked(freshState(8))).toBe(true);
    expect(CAFE_MIN_LEVEL).toBe(8);
  });

  it('每天来 4 位客人，点的菜不超过当前等级', () => {
    const state = freshState(8);
    const guests = getTodayGuests(state);
    expect(guests).toHaveLength(4);

    const affordable = new Set(
      dishes.filter((dish) => dish.unlockLevel <= 8).map((dish) => dish.id)
    );
    guests.forEach((order) => {
      expect(affordable.has(order.dishId)).toBe(true);
      expect(order.served).toBe(false);
    });
    // 同一天再取一次不换人
    expect(getTodayGuests(state)).toBe(guests);
  });

  it('没做好菜端不出去，也不扣金币', () => {
    const state = freshState(8);
    pinGuest(state, SALAD);
    const before = state.wallet.coin;

    const result = serveGuest(state, 0);
    expect(result.success).toBe(false);
    expect(result.message).toContain('田园沙拉');
    expect(state.wallet.coin).toBe(before);
    expect(state.cafe.guests[0].served).toBe(false);
  });

  it('端上菜拿金币，菜从背包扣掉，客人标记为已招待', () => {
    const state = freshState(8);
    pinGuest(state, SALAD);
    state.inventory.dish_7001 = 1;
    const before = state.wallet.coin;

    const result = serveGuest(state, 0);
    expect(result.success).toBe(true);
    expect(state.inventory.dish_7001).toBe(0);
    expect(state.cafe.guests[0].served).toBe(true);
    expect(state.wallet.coin).toBeGreaterThanOrEqual(before + getCafePrice(dishes[0]));
    expect(state.daily.progress.cafe).toBe(1);
    expect(state.analytics.cafe_serve).toBe(1);
    expect(getGuestsWaiting(state)).toBe(0);
  });

  it('同一位客人不能上两次菜', () => {
    const state = freshState(8);
    pinGuest(state, SALAD);
    state.inventory.dish_7001 = 2;

    expect(serveGuest(state, 0).success).toBe(true);
    const again = serveGuest(state, 0);
    expect(again.success).toBe(false);
    expect(state.inventory.dish_7001).toBe(1); // 第二次不扣菜
  });

  it('不存在的客人被拒绝', () => {
    const state = freshState(8);
    getTodayGuests(state);
    expect(serveGuest(state, 99).success).toBe(false);
  });

  it('未解锁时不能上菜', () => {
    const state = freshState(7);
    const result = serveGuest(state, 0);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.8');
  });

  it('菜价高于原料价值', () => {
    dishes.forEach((dish) => {
      expect(getCafePrice(dish)).toBeGreaterThan(dish.value);
    });
  });

  it('招待第一位客人达成「第一位客人」', () => {
    const state = freshState(8);
    pinGuest(state, SALAD);
    state.inventory.dish_7001 = 1;
    serveGuest(state, 0);
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('cafe_first');
  });

  it('累计 10 次小费达成「小费满满」', () => {
    const state = freshState(8);
    state.analytics.cafe_tip = 10;
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('cafe_tip_10');
  });
});

describe('存档迁移 v17', () => {
  it('v16 老存档迁移后补上 cafe 且温室记录保留', () => {
    const saved = createDefaultState();
    saved.version = 16;
    delete saved.cafe;
    saved.greenhouse.totalPlanted = 5;

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(19);
    expect(merged.greenhouse.totalPlanted).toBe(5);
    expect(Array.isArray(merged.cafe.guests)).toBe(true);
    expect(merged.cafe.totalServed).toBe(0);
  });

  it('损坏的 cafe 形状被 normalizeState 修好', () => {
    const state = createDefaultState();
    state.cafe = { date: 3, guests: '坏掉了', totalServed: '不是数字', totalTips: null };
    normalizeState(state);
    expect(state.cafe.date).toBe('');
    expect(Array.isArray(state.cafe.guests)).toBe(true);
    expect(state.cafe.totalServed).toBe(0);
    expect(state.cafe.totalTips).toBe(0);
  });
});
