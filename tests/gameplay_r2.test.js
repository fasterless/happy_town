// 第五轮玩法：友情商店 / 小镇集市
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { todayKey } from '../src/utils/time.js';
import { buyFriendGoods } from '../src/systems/shop.js';
import { friendShopGoods } from '../src/config/friendShop.js';
import {
  getDemand, getMarketPrice, sellOnMarket, getMarketBoard,
} from '../src/systems/market.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  state.wallet.coin = 10000;
  state.wallet.friendPoint = 500;
  return state;
}

describe('友情商店', () => {
  it('用友情点购买固定奖励商品', () => {
    const state = freshState();
    const result = buyFriendGoods(state, 6004); // 友情加速券：50 友情点 → speed_ticket×2
    expect(result.success).toBe(true);
    expect(state.wallet.friendPoint).toBe(500 - 50);
    expect(state.inventory.speed_ticket).toBe(2);
  });

  it('友情点不足被拒', () => {
    const state = freshState();
    state.wallet.friendPoint = 10;
    const result = buyFriendGoods(state, 6005); // 需要 60
    expect(result.success).toBe(false);
    expect(result.message).toContain("友情点");
    expect(state.wallet.friendPoint).toBe(10); // 不扣
  });

  it('神秘种子袋给随机已解锁种子', () => {
    const state = freshState();
    const result = buyFriendGoods(state, 6001);
    expect(result.success).toBe(true);
    // 种子袋至少给一种作物的种子入包
    const seedKeys = Object.keys(state.inventory).filter((k) => /^crop_\d+$/.test(k));
    expect(seedKeys.length).toBeGreaterThan(0);
  });

  it('商品配置价格合理且 id 唯一', () => {
    const ids = friendShopGoods.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    friendShopGoods.forEach((g) => {
      expect(g.price).toBeGreaterThan(0);
      // 每件商品要么有固定奖励要么有 dynamic 结算
      expect(g.rewards || g.dynamic).toBeTruthy();
    });
  });
});

describe('小镇集市', () => {
  it('需求热度当天稳定、跨天轮换', () => {
    const state = freshState();
    const d1 = getDemand(state, 1001);
    const d1again = getDemand(state, 1001);
    expect(d1).toBe(d1again); // 同一天不跳

    // 假装昨天算过
    state.market.date = '2000-01-01';
    const d2 = getDemand(state, 1001);
    expect(typeof d2).toBe('number');
    expect(d2).toBeGreaterThanOrEqual(0);
    expect(d2).toBeLessThanOrEqual(100);
  });

  it('单价在基准价的 0.7x 与 1.6x 之间（无供给压力时）', () => {
    const state = freshState();
    getMarketBoard(state).forEach(({ crop, unitPrice }) => {
      expect(unitPrice).toBeGreaterThanOrEqual(Math.max(1, Math.round(crop.sellPrice * 0.7)));
      expect(unitPrice).toBeLessThanOrEqual(Math.round(crop.sellPrice * 1.6) + 1);
    });
  });

  it('挂售越多单价越低（供给压价）', () => {
    const state = freshState();
    state.market.date = todayKey();
    state.market.demand[1001] = 50; // 固定热度便于比较
    state.market.listedToday[1001] = 0;

    const p0 = getMarketPrice(state, 1001);
    state.market.listedToday[1001] = 10;
    const p10 = getMarketPrice(state, 1001);
    expect(p10).toBeLessThan(p0);
    // 压价有 0.4 倍下限，不会归零
    expect(p10).toBeGreaterThanOrEqual(1);
  });

  it('挂售结算：扣库存、给金币、计入供给', () => {
    const state = freshState();
    state.inventory.crop_1001 = 10;
    state.market.date = todayKey();
    state.market.demand[1001] = 50;

    const unit = getMarketPrice(state, 1001);
    const result = sellOnMarket(state, 1001, 4);
    expect(result.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(6);
    expect(state.wallet.coin).toBe(10000 + unit * 4);
    expect(state.market.listedToday[1001]).toBe(4);
  });

  it('空库存挂售被拒，可指定数量', () => {
    const state = freshState();
    expect(sellOnMarket(state, 1002).success).toBe(false);

    state.inventory.crop_1001 = 5;
    sellOnMarket(state, 1001, 2);
    expect(state.inventory.crop_1001).toBe(3);
    // 超量挂售自动截断到持有量
    sellOnMarket(state, 1001, 99);
    expect(state.inventory.crop_1001).toBe(0);
  });

  it('行情板按倍率降序且含持有量', () => {
    const state = freshState();
    state.inventory.crop_1004 = 2;
    const board = getMarketBoard(state);
    expect(board.length).toBeGreaterThan(5);
    for (let i = 1; i < board.length; i++) {
      expect(board[i - 1].ratio).toBeGreaterThanOrEqual(board[i].ratio);
    }
    const corn = board.find((r) => r.crop.id === 1004);
    expect(corn.owned).toBe(2);
  });
});
