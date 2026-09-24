import { describe, it, expect } from 'vitest';
import { tileToScreen, screenToTile, TILE_W, TILE_H } from '../src/world/iso.js';
import { findPath } from '../src/world/pathfind.js';
import { isBlocked, FARM_PLOTS, GREENHOUSE_PLOTS, SPAWN } from '../src/world/map.js';
import {
  createWorldState,
  plantSeed,
  waterPlot,
  harvestPlot,
  sellCrop,
  plantGreenhouse,
  harvestGreenhouse,
  startCraft,
  collectCraft,
  cookDish,
  castLine,
  digMine,
  upgradePick,
  sellOre,
  serveGuest,
  todaysGuests,
  boardRequestOf,
  forageForest,
  completeBoardRequest,
  growthStage,
} from '../src/world/sim.js';
import { loadWorld, WORLD_STORAGE_KEY } from '../src/world/save.js';
import { dialogueOf, stepNpcs, createNpcs } from '../src/world/npc.js';
import { mineLoot } from '../src/config/mine.js';
import { craftingRecipes } from '../src/config/crafting.js';

const NOW = new Date('2026-09-24T08:00:00').getTime();

describe('等距坐标', () => {
  it('投影后再取整能回到原来的格子', () => {
    for (const [tx, ty] of [[0, 0], [3, 5], [14, 27], [31, 31]]) {
      const screen = tileToScreen(tx, ty);
      const back = screenToTile(screen.x, screen.y);
      expect(back).toEqual({ tx, ty });
    }
  });

  it('往右下走一格，屏幕上正好偏一个瓦片高', () => {
    const a = tileToScreen(2, 2);
    const b = tileToScreen(3, 3);
    expect(b.y - a.y).toBe(TILE_H);
    expect(b.x - a.x).toBe(0);
    expect(TILE_W).toBeGreaterThan(TILE_H);
  });
});

describe('寻路', () => {
  it('能绕开一堵墙', () => {
    const wall = new Set(['1,0', '1,1', '1,2']);
    const blocked = (tx, ty) => wall.has(`${tx},${ty}`);
    const path = findPath({ tx: 0, ty: 1 }, { tx: 2, ty: 1 }, blocked);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ tx: 2, ty: 1 });
    expect(path.every((step) => !blocked(step.tx, step.ty))).toBe(true);
  });

  it('终点被堵住时走不过去', () => {
    const path = findPath({ tx: 0, ty: 0 }, { tx: 1, ty: 0 }, (tx, ty) => tx === 1 && ty === 0);
    expect(path).toEqual([]);
  });

  it('小镇地图上从出生点走得到湖边', () => {
    const path = findPath(SPAWN, { tx: 14, ty: 15 }, isBlocked);
    expect(path.length).toBeGreaterThan(0);
    expect(isBlocked(SPAWN.tx, SPAWN.ty)).toBe(false);
  });
});

describe('种田', () => {
  it('播种扣金币，浇水后按时间成熟，收获进背包', () => {
    let state = createWorldState(NOW);
    const before = state.coin;
    let result = plantSeed(state, 0, 1001, NOW);
    expect(result.ok).toBe(true);
    state = result.state;
    expect(state.coin).toBe(before - 2);

    expect(growthStage(state.plots[0], { growTime: 30 }, NOW + 1000)).toBeLessThan(4);
    result = harvestPlot(state, 0, NOW + 1000);
    expect(result.ok).toBe(false);

    state = waterPlot(state, 0).state;
    result = harvestPlot(state, 0, NOW + 30000);
    expect(result.ok).toBe(true);
    expect(result.state.bag.crop_1001).toBe(2);

    result = sellCrop(result.state, 1001, 2);
    expect(result.ok).toBe(true);
    expect(result.state.coin).toBe(before - 2 + 4);
    expect(result.state.bag.crop_1001).toBeUndefined();
  });

  it('金币不够时种不了，不能重复播种', () => {
    const broke = createWorldState(NOW);
    broke.coin = 0;
    expect(plantSeed(broke, 0, 1001, NOW).ok).toBe(false);

    const planted = plantSeed(createWorldState(NOW), 0, 1001, NOW).state;
    expect(plantSeed(planted, 0, 1002, NOW).ok).toBe(false);
  });

  it('地图上正好有 12 块田和 6 块温室', () => {
    expect(FARM_PLOTS).toHaveLength(12);
    expect(GREENHOUSE_PLOTS).toHaveLength(6);
  });
});

describe('温室、加工、料理', () => {
  it('温室一天只能种一轮，成熟后收获', () => {
    let state = createWorldState(NOW);
    state = plantGreenhouse(state, 0, 1301, NOW).state;
    expect(plantGreenhouse(state, 0, 1301, NOW + 1000).ok).toBe(false);
    const harvested = harvestGreenhouse(state, 0, NOW + 10 * 60 * 1000);
    expect(harvested.ok).toBe(true);
    expect(harvested.state.bag.crop_1301).toBe(3);
  });

  it('加工消耗原料，到点才能取成品', () => {
    let state = createWorldState(NOW);
    state.bag.crop_1001 = 4;
    const recipe = craftingRecipes[0];
    state = startCraft(state, recipe.id, NOW).state;
    expect(state.bag.crop_1001).toBeUndefined();
    expect(collectCraft(state, NOW + 1000).ok).toBe(false);
    const done = collectCraft(state, NOW + recipe.time * 1000);
    expect(done.ok).toBe(true);
    expect(done.state.bag[recipe.result.key]).toBe(1);
  });

  it('食材够就能做出菜', () => {
    const state = createWorldState(NOW);
    state.bag.crop_1002 = 3;
    state.bag.crop_1006 = 2;
    const cooked = cookDish(state, 7001);
    expect(cooked.ok).toBe(true);
    expect(cooked.state.bag.dish_7001).toBe(1);
  });
});

describe('萤火林与公告栏', () => {
  it('采集每天最多三次，并把资源放进独立背包', () => {
    let state = createWorldState(NOW);
    for (let i = 0; i < 3; i += 1) {
      const result = forageForest(state, NOW);
      expect(result.ok).toBe(true);
      state = result.state;
    }
    expect(forageForest(state, NOW).ok).toBe(false);
    expect(Object.keys(state.bag).some((key) => key.startsWith('forage_'))).toBe(true);
  });

  it('公告栏当天固定一张委托，材料够时只能完成一次', () => {
    const request = boardRequestOf(NOW);
    let state = createWorldState(NOW);
    state.bag[request.item] = request.count;
    const result = completeBoardRequest(state, NOW);
    expect(result.ok).toBe(true);
    expect(result.state.coin).toBe(200 + request.reward);
    expect(completeBoardRequest(result.state, NOW).ok).toBe(false);
    expect(boardRequestOf(NOW)).toEqual(request);
  });
});

describe('钓鱼、矿洞、咖啡馆', () => {
  it('钓上来的都是已知的鱼', () => {
    let state = createWorldState(NOW);
    for (let i = 0; i < 12; i += 1) {
      const result = castLine(state, NOW);
      expect(result.ok).toBe(true);
      state = result.state;
    }
    const keys = Object.keys(state.bag);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => /^fish_[1-6]$/.test(key))).toBe(true);
    expect(state.coin).toBeLessThan(200);
  });

  it('挖到的东西都在矿洞掉落表里', () => {
    const known = new Set(mineLoot.map((item) => item.key));
    let state = createWorldState(NOW);
    for (let i = 0; i < 10; i += 1) state = digMine(state, NOW).state;
    for (const key of Object.keys(state.bag)) expect(known.has(key)).toBe(true);
    expect(state.stamina).toBe(0);
    expect(digMine(state, NOW).ok).toBe(false);
  });

  it('材料不够升不了镐，够了就能升', () => {
    const state = createWorldState(NOW);
    expect(upgradePick(state).ok).toBe(false);
    state.coin = 500;
    state.bag.ore_copper = 15;
    const upgraded = upgradePick(state);
    expect(upgraded.ok).toBe(true);
    expect(upgraded.state.pickLevel).toBe(2);
    expect(upgraded.state.coin).toBe(0);
  });

  it('矿石按配置的价格卖出', () => {
    const state = createWorldState(NOW);
    state.bag.ore_copper = 2;
    const sold = sellOre(state, 'ore_copper', 2);
    expect(sold.ok).toBe(true);
    expect(sold.state.coin).toBe(200 + 24);
  });

  it('客人点的菜端上才给钱', () => {
    const guest = todaysGuests(NOW)[0];
    const state = createWorldState(NOW);
    expect(serveGuest(state, guest.id, NOW).ok).toBe(false);
    state.bag[`dish_${guest.dish.id}`] = 1;
    const served = serveGuest(state, guest.id, NOW);
    expect(served.ok).toBe(true);
    expect(served.state.coin).toBeGreaterThan(200);
    expect(serveGuest(served.state, guest.id, NOW).ok).toBe(false);
  });
});

describe('存档与邻居', () => {
  it('坏存档回退成新档，不抛错', () => {
    const memory = new Map();
    globalThis.localStorage = {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k),
    };
    localStorage.setItem(WORLD_STORAGE_KEY, '{不是json');
    const fresh = loadWorld(NOW);
    expect(fresh.coin).toBe(200);
    expect(fresh.plots).toHaveLength(12);

    localStorage.setItem(WORLD_STORAGE_KEY, JSON.stringify({ version: 1, coin: 999, plots: [] }));
    const kept = loadWorld(NOW);
    expect(kept.coin).toBe(999);
    expect(kept.plots).toHaveLength(12);
    localStorage.removeItem(WORLD_STORAGE_KEY);
  });

  it('邻居会走动，也有话说', () => {
    const npcs = createNpcs();
    const moved = stepNpcs(npcs, 5000, 900);
    const travelled = moved.some((npc, i) => npc.tx !== npcs[i].tx || npc.ty !== npcs[i].ty);
    expect(travelled).toBe(true);
    expect(dialogueOf('npc_mayor', NOW).length).toBeGreaterThan(0);
  });
});
