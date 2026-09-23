// 第六轮玩法 2/3、3/3：矿石熔炼 + 宝石护符
import { describe, it, expect } from 'vitest';
import { createDefaultState, mergeState, normalizeState } from '../src/core/state.js';
import { migrateState } from '../src/core/migrations.js';
import { checkAchievements } from '../src/systems/achievements.js';
import { getItemName, getItemIcon } from '../src/utils/format.js';
import { itemValue } from '../src/config/itemValue.js';
import { charms } from '../src/config/charms.js';
import { getCrop } from '../src/config/crops.js';
import { levels } from '../src/config/levels.js';
import * as CraftingSystem from '../src/systems/crafting.js';
import {
  isCharmsUnlocked, craftCharm, equipCharm, unequipCharm, getEquippedCharm,
  getCharmMultiplier, getCharmList,
} from '../src/systems/charms.js';
import { harvestCrop } from '../src/systems/farm.js';

function freshState(level = 16) {
  const state = createDefaultState();
  state.user.created = true;
  // 等级由经验推导：领取成品会发经验并重算等级，只写 level 不给经验会被打回 1 级
  const tier = levels.filter((lv) => lv.level <= level).at(-1);
  state.wallet.exp = tier ? tier.needExp : 0;
  state.wallet.level = level;
  state.wallet.coin = 100000;
  return state;
}

/** 把加工队列里的第一批拨到完成 */
function finishFirst(state) {
  state.crafting.queue[0].startedAt = new Date(Date.now() - 86_400_000).toISOString();
}

describe('矿石熔炼', () => {
  it('铜锭配方 Lv.10 可开工，缺料被拒', () => {
    const state = freshState(10);
    expect(CraftingSystem.startCrafting(state, 5009).success).toBe(false);

    state.inventory.ore_copper = 4;
    state.inventory.stone = 2;
    const result = CraftingSystem.startCrafting(state, 5009);
    expect(result.success).toBe(true);
    expect(state.inventory.ore_copper).toBe(0);
  });

  it('领取铜锭时首次附赠铜烛台摆件，第二次不再送', () => {
    const state = freshState(10);
    state.inventory.ore_copper = 4;
    state.inventory.stone = 2;

    // 加工台同时最多 2 批，所以先领完第一批再开第二批
    expect(CraftingSystem.startCrafting(state, 5009).success).toBe(true);
    finishFirst(state);
    const first = CraftingSystem.claimCrafting(state, 0);
    expect(first.success).toBe(true);
    expect(first.message).toContain('摆件');
    expect(state.inventory.ingot_copper).toBe(1);
    expect(state.inventory.f_3015).toBe(1);
    expect(state.analytics.ingot_smelt).toBe(1);

    state.inventory.ore_copper = 4;
    state.inventory.stone = 2;
    const secondStart = CraftingSystem.startCrafting(state, 5009);
    expect(
      secondStart.success,
      `二次开工失败：${secondStart.message}｜队列 ${state.crafting.queue.length}｜等级 ${state.wallet.level}｜铜矿 ${state.inventory.ore_copper}｜石头 ${state.inventory.stone}`,
    ).toBe(true);
    finishFirst(state);
    const second = CraftingSystem.claimCrafting(state, 0);
    expect(second.success).toBe(true);
    expect(second.message).not.toContain('摆件');
    expect(state.inventory.f_3015).toBe(1); // 摆件只送一次
    expect(state.inventory.ingot_copper).toBe(2);
  });

  it('普通配方领取不送摆件也不计入熔炼次数', () => {
    const state = freshState();
    state.inventory.crop_1001 = 4;
    CraftingSystem.startCrafting(state, 5001);
    finishFirst(state);
    const claim = CraftingSystem.claimCrafting(state, 0);
    expect(claim.message).not.toContain('摆件');
    expect(state.analytics.ingot_smelt).toBeUndefined();
  });

  it('锭的价值按原料递归计算', () => {
    // 铜锭 = 4 铜矿(12) + 2 石头(1) = 50
    expect(itemValue('ingot_copper')).toBe(50);
    expect(itemValue('ingot_iron')).toBeGreaterThan(itemValue('ingot_copper'));
    expect(itemValue('ingot_silver')).toBeGreaterThan(itemValue('ingot_iron'));
  });

  it('熔炼 10 块锭达成成就', () => {
    const state = freshState();
    state.analytics.ingot_smelt = 10;
    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('ingot_10');
  });

  it('矿锭与摆件都有显示名和图标', () => {
    ['ingot_copper', 'ingot_iron', 'ingot_silver'].forEach((key) => {
      expect(getItemName(key)).not.toBe(key);
      expect(getItemIcon(key)).not.toBe('📦');
    });
    expect(getItemName('f_3015')).toBe('铜烛台');
    expect(getItemName('f_3017')).toBe('银镜');
  });
});

describe('宝石护符', () => {
  it('Lv.10 解锁，Lv.9 锁定', () => {
    expect(isCharmsUnlocked(freshState(9))).toBe(false);
    expect(isCharmsUnlocked(freshState(10))).toBe(true);
  });

  it('材料不足做不成，做成后材料被扣且不能重复做', () => {
    const state = freshState(10);
    expect(craftCharm(state, 8001).success).toBe(false);

    state.inventory.gem_topaz = 3;
    state.inventory.ingot_iron = 1;
    const result = craftCharm(state, 8001);
    expect(result.success).toBe(true);
    expect(state.inventory.gem_topaz).toBe(0);
    expect(state.inventory.ingot_iron).toBe(0);
    expect(state.charms.owned).toContain(8001);

    state.inventory.gem_topaz = 3;
    state.inventory.ingot_iron = 1;
    expect(craftCharm(state, 8001).success).toBe(false);
    expect(state.inventory.gem_topaz).toBe(3); // 重复制作不扣材料
  });

  it('等级不够的护符做不成', () => {
    const state = freshState(10);
    state.inventory.gem_amethyst = 3;
    state.inventory.ingot_silver = 1;
    const result = craftCharm(state, 8002); // 紫水晶护符要 Lv.12
    expect(result.success).toBe(false);
    expect(result.message).toContain('Lv.12');
  });

  it('装备后对应加成生效，卸下后回到 1', () => {
    const state = freshState(12);
    state.inventory.gem_amethyst = 3;
    state.inventory.ingot_silver = 1;
    craftCharm(state, 8002);

    expect(getCharmMultiplier(state, 'miningLuck')).toBe(1);
    const equipped = equipCharm(state, 8002);
    expect(equipped.success).toBe(true);
    expect(state.daily.progress.charm).toBe(1);
    expect(getEquippedCharm(state).id).toBe(8002);
    expect(getCharmMultiplier(state, 'miningLuck')).toBe(1.5);
    // 只加成自己的类型
    expect(getCharmMultiplier(state, 'orderBonus')).toBe(1);

    expect(unequipCharm(state).success).toBe(true);
    expect(getEquippedCharm(state)).toBeNull();
    expect(getCharmMultiplier(state, 'miningLuck')).toBe(1);
  });

  it('没拥有的护符装备不了', () => {
    const state = freshState(16);
    expect(equipCharm(state, 8004).success).toBe(false);
    expect(unequipCharm(state).success).toBe(false);
  });

  it('集齐 4 枚达成护符大师成就', () => {
    const state = freshState(16);
    charms.forEach((charm) => {
      charm.requires.forEach((req) => {
        state.inventory[req.item] = (state.inventory[req.item] || 0) + req.count;
      });
      expect(craftCharm(state, charm.id).success).toBe(true);
    });
    expect(state.charms.owned).toHaveLength(4);

    checkAchievements(state);
    expect(state.achievements.unlocked).toContain('charm_first');
    expect(state.achievements.unlocked).toContain('charm_all');
  });

  it('列表标注已做、装备中与材料是否够', () => {
    const state = freshState(16);
    state.inventory.gem_topaz = 3;
    state.inventory.ingot_iron = 1;
    craftCharm(state, 8001);
    equipCharm(state, 8001);

    const list = getCharmList(state);
    const topaz = list.find((row) => row.charm.id === 8001);
    expect(topaz.owned).toBe(true);
    expect(topaz.equipped).toBe(true);

    const crystal = list.find((row) => row.charm.id === 8004);
    expect(crystal.owned).toBe(false);
    expect(crystal.affordable).toBe(false);
  });
});

describe('护符加成接入', () => {
  it('黄水晶护符让收获产量 +10%', () => {
    const state = freshState(16);
    state.inventory.gem_topaz = 3;
    state.inventory.ingot_iron = 1;
    craftCharm(state, 8001);
    equipCharm(state, 8001);

    // 稻米每次收 3 个，×1.1 四舍五入 = 3，看不出；临时改 harvestCount 验证倍率真的参与计算
    const rice = getCrop(1006);
    const original = rice.harvestCount;
    rice.harvestCount = 10; // 10 × 1.1 = 11

    state.farm.plots[0] = {
      cropId: 1006,
      plantedAt: new Date(Date.now() - 86_400_000).toISOString(),
      growTime: 1,
    };
    const result = harvestCrop(state, 0);
    rice.harvestCount = original;

    expect(result.success).toBe(true);
    expect(state.inventory.crop_1006).toBe(11);
  });
});

describe('存档迁移 v14', () => {
  it('v13 老存档迁移后补上 charms 且镐等级保留', () => {
    const saved = createDefaultState();
    saved.version = 13;
    delete saved.charms;
    saved.mine.pickLevel = 3;

    const merged = mergeState(createDefaultState(), saved);
    migrateState(merged);

    expect(merged.version).toBe(15);
    expect(merged.mine.pickLevel).toBe(3);
    expect(Array.isArray(merged.charms.owned)).toBe(true);
    expect(merged.charms.equipped).toBeNull();
  });

  it('损坏的 charms 形状被 normalizeState 修好', () => {
    const state = createDefaultState();
    state.charms = { owned: '坏掉了', equipped: '不是数字' };
    normalizeState(state);
    expect(Array.isArray(state.charms.owned)).toBe(true);
    expect(state.charms.equipped).toBeNull();
  });
});
