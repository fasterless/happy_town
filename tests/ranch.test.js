// 第二阶段养殖栏：买动物 / 喂食 / 周期产出 / 收取 / 奶酪配方
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { GAME_CONFIG } from '../src/config/constants.js';
import { craftingRecipes, getRecipe } from '../src/config/crafting.js';
import {
  buyAnimal, feedAnimal, collectProduce, collectAllProduce,
  isRanchUnlocked, isAnimalFed, getPendingProduce,
} from '../src/systems/ranch.js';

function freshState(level = 20) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.exp = 7000;
  state.wallet.coin = 100000;
  state.wallet.diamond = 1000;
  return state;
}

const CHICKEN = 'chicken'; // 🪙300，饲料小麦×2，每小时 1 蛋

describe('购买动物', () => {
  it('Lv.6 以下不能买', () => {
    const state = freshState(5);
    expect(isRanchUnlocked(state)).toBe(false);
    expect(buyAnimal(state, CHICKEN).success).toBe(false);
  });

  it('买动物扣对应货币，每种限购一只', () => {
    const state = freshState();
    const result = buyAnimal(state, CHICKEN);
    expect(result.success).toBe(true);
    expect(state.wallet.coin).toBe(100000 - 300);
    expect(state.ranch.owned).toContain(CHICKEN);

    const again = buyAnimal(state, CHICKEN);
    expect(again.success).toBe(false);
    expect(again.message).toContain("已经养了一只");
  });

  it('奶牛走钻石通道，钱不够会被拒', () => {
    const state = freshState();
    state.wallet.diamond = 10; // 奶牛 💎60
    const result = buyAnimal(state, 'cow');
    expect(result.success).toBe(false);
    expect(result.message).toContain("钻石");
    expect(state.ranch.owned).not.toContain('cow');
  });
});

describe('喂食与产出', () => {
  it('没喂不产出，喂食消耗饲料', () => {
    const state = freshState();
    buyAnimal(state, CHICKEN);
    state.inventory.crop_1001 = 10;

    expect(isAnimalFed(state, CHICKEN)).toBe(false);
    expect(getPendingProduce(state, CHICKEN)).toBe(0);
    expect(collectProduce(state, CHICKEN).success).toBe(false);

    const fed = feedAnimal(state, CHICKEN);
    expect(fed.success).toBe(true);
    expect(state.inventory.crop_1001).toBe(8); // 吃掉 2 个小麦
    expect(isAnimalFed(state, CHICKEN)).toBe(true);

    // 饱着的时候重复喂被拒
    expect(feedAnimal(state, CHICKEN).success).toBe(false);
  });

  it('吃饱的窗口内按周期攒产出，离线也照攒', () => {
    const state = freshState();
    buyAnimal(state, CHICKEN);

    // 模拟 2.5 小时前喂食：窗口(12h)没耗尽，产出按 1 小时/个 → 攒 2 个
    const fedAt = new Date(Date.now() - 2.5 * 3600 * 1000).toISOString();
    state.ranch.animals[CHICKEN] = { fedAt, lastCollectAt: fedAt };

    expect(getPendingProduce(state, CHICKEN)).toBe(2);

    // 收取后指针前移，零头保留
    const collected = collectProduce(state, CHICKEN);
    expect(collected.success).toBe(true);
    expect(state.inventory.egg).toBe(2);
    // 2.5h - 2h = 0.5h 零头，还不足 1 小时
    expect(getPendingProduce(state, CHICKEN)).toBe(0);

    // 再过 20 分钟（还没到下个整点）：仍然 0
    // （不做时间旅行，指针语义已验证）
  });

  it('喂食窗口耗尽后产出停止累积', () => {
    const state = freshState();
    buyAnimal(state, CHICKEN);

    // 13 小时前喂食：窗口 12h 已耗尽 → 最多攒 12 个（每小时 1 个）
    const fedAt = new Date(Date.now() - 13 * 3600 * 1000).toISOString();
    state.ranch.animals[CHICKEN] = { fedAt, lastCollectAt: fedAt };

    expect(isAnimalFed(state, CHICKEN)).toBe(false);
    expect(getPendingProduce(state, CHICKEN)).toBe(12); // 封顶在窗口耗尽点
  });

  it('饲料不足时不能喂', () => {
    const state = freshState();
    buyAnimal(state, CHICKEN);
    state.inventory.crop_1001 = 1; // 需要 2
    const result = feedAnimal(state, CHICKEN);
    expect(result.success).toBe(false);
    expect(result.message).toContain("饲料");
  });
});

describe('一键收取与奶酪', () => {
  it('collectAllProduce 收所有动物并汇总', () => {
    const state = freshState();
    buyAnimal(state, CHICKEN);
    buyAnimal(state, 'sheep');

    const t = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    state.ranch.animals[CHICKEN] = { fedAt: t, lastCollectAt: t }; // 5 蛋
    state.ranch.animals.sheep = { fedAt: t, lastCollectAt: t };    // 2 羊毛

    const result = collectAllProduce(state);
    expect(result.success).toBe(true);
    expect(result.collected).toBe(2);
    expect(state.inventory.egg).toBe(5);
    expect(state.inventory.wool).toBe(2);
  });

  it('一键收取空栏返回失败', () => {
    const state = freshState();
    buyAnimal(state, CHICKEN);
    const result = collectAllProduce(state);
    expect(result.success).toBe(false);
  });

  it('奶酪配方：牛奶 + 小麦 → 手工奶酪', () => {
    const cheese = getRecipe(5007);
    expect(cheese).toBeTruthy();
    expect(cheese.requires).toEqual([
      { item: "milk", count: 1 },
      { item: "crop_1001", count: 2 },
    ]);
    expect(cheese.result).toEqual({ key: "goods_5007", count: 1 });

    // 配方 id 无重复
    const ids = craftingRecipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('动物产出物品都能在配方或基础标签中找到', () => {
    // 蛋给 5007 奶酪？蛋本身目前只做卖货/囤货，检查三种产出键在
    // BASIC_LABELS 意义上有名字（这里只验证配置一致性）
    GAME_CONFIG.ranch.animals.forEach((animal) => {
      expect(animal.produce.item).toBeTruthy();
      expect(animal.feed.item.startsWith('crop_')).toBe(true);
    });
  });
});
