// 第六轮玩法：后山矿洞（下矿 / 镐升级 / 矿藏出售 / 收藏册）
import { describe, it, expect } from 'vitest';
import { createDefaultState } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { mergeState, normalizeState } from '../src/core/state.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { getItemName, getItemIcon } from '../src/utils/format.js';
import { oreValues, pickaxes, mineTrove } from '../src/config/mine.js';
import {
  isMineUnlocked, getPickLevel, getMaxStamina, getStaminaLeft, canDig,
  mineDig, upgradePickaxe, canUpgradePickaxe, getNextUpgrade,
  sellOre, sellAllOre, getTotalDigs,
} from '../src/systems/mine.js';

function freshState(level = 12) {
  const state = createDefaultState();
  state.user.created = true;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  return state;
}

describe('矿洞解锁', () => {
  it('Lv.8 以下锁定，Lv.8 及以上解锁', () => {
    expect(isMineUnlocked(freshState(7))).toBe(false);
    expect(isMineUnlocked(freshState(8))).toBe(true);
  });

  it('等级不够时下矿失败', () => {
    const state = freshState(7);
    const result = mineDig(state);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.8');
  });
});

describe('体力与下矿', () => {
  it('初始镐为木镐，体力上限 10', () => {
    const state = freshState();
    expect(getPickLevel(state)).toBe(1);
    expect(getMaxStamina(state)).toBe(10);
    expect(getStaminaLeft(state)).toBe(10);
  });

  it('每次下矿消耗 1 点免费体力', () => {
    const state = freshState();
    const before = getStaminaLeft(state);
    const result = mineDig(state);
    expect(result.success).toBe(true);
    expect(getStaminaLeft(state)).toBe(before - 1);
    expect(getTotalDigs(state)).toBe(1);
  });

  it('下矿会累计每日任务进度', () => {
    const state = freshState();
    mineDig(state);
    mineDig(state);
    expect(state.daily.progress.mine).toBe(2);
  });

  it('免费体力用完后花金币多挖，金币不足则失败', () => {
    const state = freshState();
    // 把免费体力耗尽
    for (let i = 0; i < getMaxStamina(state); i++) mineDig(state);
    expect(getStaminaLeft(state)).toBe(0);

    const coinBefore = state.wallet.coin;
    const paid = mineDig(state);
    expect(paid.success).toBe(true);
    // 付费多挖固定扣 8 金币，但这次挖到的若是碎金会立刻加回来
    const droppedCoin = paid.drop.key === 'coin' ? paid.drop.count : 0;
    expect(state.wallet.coin).toBe(coinBefore - 8 + droppedCoin);

    // 金币不足时挖不动
    state.wallet.coin = 0;
    const broke = mineDig(state);
    expect(broke.success).toBe(false);
    expect(canDig(state)).toBe(false);
  });

  it('跨天后免费体力自动恢复', () => {
    const state = freshState();
    for (let i = 0; i < 5; i++) mineDig(state);
    expect(getStaminaLeft(state)).toBe(getMaxStamina(state) - 5);

    // 模拟昨天用掉的体力
    state.mine.staminaDate = '2000-01-01';
    expect(getStaminaLeft(state)).toBe(getMaxStamina(state));
  });
});

describe('矿层深度受镐等级限制', () => {
  it('木镐（Lv.1）只挖得到浅层：绝不会出现铁矿/银矿/宝石', () => {
    const state = freshState();
    // 多挖几百次，minPick 过滤保证高层掉落永不出现
    for (let i = 0; i < 400; i++) {
      state.mine.staminaDate = ''; // 一直给免费体力，避免被金币限制
      state.mine.staminaUsed = 0;
      mineDig(state);
    }
    expect(state.inventory.ore_iron || 0).toBe(0);
    expect(state.inventory.ore_silver || 0).toBe(0);
    expect(state.inventory.gem_topaz || 0).toBe(0);
    expect(state.inventory.gem_amethyst || 0).toBe(0);
    // 浅层的铜矿或石头一定挖到过
    expect((state.inventory.ore_copper || 0) + (state.inventory.stone || 0)).toBeGreaterThan(0);
  });
});

describe('矿藏收藏册', () => {
  it('挖到的矿石/宝石计入收藏册，石头/碎金不计入', () => {
    const state = freshState();
    for (let i = 0; i < 300; i++) {
      state.mine.staminaDate = '';
      state.mine.staminaUsed = 0;
      mineDig(state);
    }
    // 收藏册只收录 mineTrove 里的键
    state.mine.found.forEach((key) => expect(mineTrove).toContain(key));
    // 木镐下必然挖到过铜矿
    expect(state.mine.found).toContain('ore_copper');
  });
});

describe('镐子升级', () => {
  it('材料不足时升级失败', () => {
    const state = freshState();
    state.wallet.coin = 0;
    const result = upgradePickaxe(state);
    expect(result.success).toBe(false);
    expect(result.message).toContain('材料不足');
  });

  it('材料齐全时升级成功，提升等级与体力上限', () => {
    const state = freshState();
    expect(canUpgradePickaxe(state)).toBe(false);

    // 备齐木镐→石镐的材料：500 金币 + 铜矿×15
    state.wallet.coin = 500;
    state.inventory.ore_copper = 15;
    expect(canUpgradePickaxe(state)).toBe(true);

    const result = upgradePickaxe(state);
    expect(result.success).toBe(true);
    expect(getPickLevel(state)).toBe(2);
    expect(getMaxStamina(state)).toBe(pickaxes[1].maxStamina);
    // 材料被扣光
    expect(state.wallet.coin).toBe(0);
    expect(state.inventory.ore_copper).toBe(0);
  });

  it('满级镐无法继续升级', () => {
    const state = freshState();
    state.mine.pickLevel = pickaxes.length;
    expect(getNextUpgrade(state)).toBeNull();
    const result = upgradePickaxe(state);
    expect(result.success).toBe(false);
    expect(result.message).toContain('最高级');
  });

  it('升级次数累计可触达成就 pick_max（升满需 4 次）', () => {
    const state = freshState();
    // 直接喂满每一档材料逐级升级
    for (let lv = 1; lv < pickaxes.length; lv++) {
      const cost = pickaxes[lv].upgrade;
      Object.entries(cost).forEach(([key, need]) => {
        if (key === 'coin') state.wallet.coin += need;
        else state.inventory[key] = (state.inventory[key] || 0) + need;
      });
      const result = upgradePickaxe(state);
      expect(result.success).toBe(true);
    }
    expect(getPickLevel(state)).toBe(5);
    expect(state.analytics.pickaxe_upgrade).toBe(4);

    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('pick_max');
  });
});

describe('矿藏出售', () => {
  it('卖出单种矿石按卖价结算并清空持有', () => {
    const state = freshState();
    state.inventory.ore_copper = 10;
    const coinBefore = state.wallet.coin;
    const result = sellOre(state, 'ore_copper');
    expect(result.success).toBe(true);
    expect(state.inventory.ore_copper).toBe(0);
    expect(state.wallet.coin).toBe(coinBefore + oreValues.ore_copper * 10);
  });

  it('没有该矿藏时卖出失败', () => {
    const state = freshState();
    expect(sellOre(state, 'gem_emerald').success).toBe(false);
  });

  it('一键卖出清空所有矿石与宝石', () => {
    const state = freshState();
    state.inventory.ore_copper = 3;
    state.inventory.gem_topaz = 2;
    const coinBefore = state.wallet.coin;
    const result = sellAllOre(state);
    expect(result.success).toBe(true);
    expect(state.inventory.ore_copper).toBe(0);
    expect(state.inventory.gem_topaz).toBe(0);
    expect(state.wallet.coin).toBe(coinBefore + oreValues.ore_copper * 3 + oreValues.gem_topaz * 2);
  });

  it('背包无矿藏时一键卖出失败', () => {
    expect(sellAllOre(freshState()).success).toBe(false);
  });
});

describe('成就与展示', () => {
  it('mine_dig 成就随下矿次数推进', () => {
    const state = freshState();
    for (let i = 0; i < 10; i++) {
      state.mine.staminaDate = '';
      state.mine.staminaUsed = 0;
      mineDig(state);
    }
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('mine_10');
  });

  it('trove_all 成就按收藏册收录数推进', () => {
    const state = freshState();
    state.mine.found = [...mineTrove]; // 集齐 7 种
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('trove_all');
  });

  it('format 能解析矿石/宝石的名称与图标', () => {
    expect(getItemName('ore_copper')).toBe('铜矿');
    expect(getItemName('gem_crystal')).toBe('幻彩水晶');
    expect(getItemIcon('gem_amethyst')).toBe('💜');
  });
});

describe('存档迁移与形状', () => {
  it('v12 旧存档迁移后会补上 mine 与 charms 字段', () => {
    const legacy = createDefaultState();
    delete legacy.mine;
    legacy.version = 12;
    const migrated = migrateState(legacy);
    expect(migrated.version).toBeGreaterThanOrEqual(13);
    expect(migrated.mine).toBeTruthy();
    expect(migrated.mine.pickLevel).toBe(1);
    expect(Array.isArray(migrated.mine.found)).toBe(true);
    expect(Array.isArray(migrated.charms.owned)).toBe(true);
  });

  it('normalizeState 修复损坏的 mine 结构', () => {
    const state = createDefaultState();
    state.mine = { pickLevel: 99, found: 'oops' };
    normalizeState(state);
    expect(state.mine.pickLevel).toBe(5); // 夹到上限
    expect(Array.isArray(state.mine.found)).toBe(true);
  });

  it('mergeState 保留旧存档里的 mine 进度', () => {
    const base = createDefaultState();
    const saved = { mine: { pickLevel: 3, totalDigs: 42 } };
    const merged = mergeState(base, saved);
    expect(merged.mine.pickLevel).toBe(3);
    expect(merged.mine.totalDigs).toBe(42);
  });
});
