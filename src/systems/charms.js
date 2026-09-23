// 宝石护符系统（第六轮 3/3）
//
// 三件事：做护符（扣宝石和锭，记入 state.charms.owned）、装备护符
// （state.charms.equipped）、以及给其他系统一个「这枚护符加成多少」的查询。
// 护符加成和料理增益叠乘，但两者都是温和的小数字，叠在一起也不会失控。
import { charms, getCharm, CHARM_MIN_LEVEL } from '../config/charms.js';
import { spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';

/**
 * 护符系统是否解锁
 */
export function isCharmsUnlocked(state) {
  return state.wallet.level >= CHARM_MIN_LEVEL;
}

/**
 * 已拥有的护符 id 列表（老存档兜底为空）
 */
export function getOwnedCharms(state) {
  return Array.isArray(state.charms?.owned) ? state.charms.owned : [];
}

/**
 * 当前装备的护符（没有则 null）
 */
export function getEquippedCharm(state) {
  const id = state.charms?.equipped;
  if (!id || !getOwnedCharms(state).includes(id)) return null;
  return getCharm(id) || null;
}

/**
 * 护符对某个加成类型的倍率（没装备对应护符时返回 1）
 * @param {Object} state
 * @param {string} type - harvestBonus / miningLuck / orderBonus / fishingLuck
 * @returns {number}
 */
export function getCharmMultiplier(state, type) {
  const charm = getEquippedCharm(state);
  if (!charm || charm.buff.type !== type) return 1;
  return charm.buff.value;
}

/**
 * 做一枚护符：扣材料，记入收藏。每枚只能做一次。
 * @returns {Object} { success, message, state }
 */
export function craftCharm(state, charmId) {
  if (!isCharmsUnlocked(state)) {
    return { success: false, message: `Lv.${CHARM_MIN_LEVEL} 解锁宝石护符` };
  }

  const charm = getCharm(charmId);
  if (!charm) return { success: false, message: '没有这枚护符' };
  if (state.wallet.level < charm.unlockLevel) {
    return { success: false, message: `Lv.${charm.unlockLevel}解锁` };
  }
  if (getOwnedCharms(state).includes(charm.id)) {
    return { success: false, message: `已经有「${charm.name}」了` };
  }

  for (const req of charm.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      return { success: false, message: '材料不足' };
    }
  }

  charm.requires.forEach((req) => spendItem(state, req.item, req.count));
  state.charms.owned.push(charm.id);
  logEvent(state, 'charm_craft');

  return {
    success: true,
    message: `做成了${charm.icon}${charm.name}，装备上就能一直生效`,
    state,
  };
}

/**
 * 装备一枚已拥有的护符（同一时刻只能装备一枚）
 */
export function equipCharm(state, charmId) {
  if (!getOwnedCharms(state).includes(charmId)) {
    return { success: false, message: '还没有这枚护符' };
  }
  const charm = getCharm(charmId);
  if (!charm) return { success: false, message: '没有这枚护符' };

  state.charms.equipped = charm.id;
  logEvent(state, 'charm_equip');
  trackDaily(state, 'charm', 1);

  return { success: true, message: `装备了${charm.icon}${charm.name}：${charm.desc}`, state };
}

/**
 * 卸下当前装备的护符
 */
export function unequipCharm(state) {
  if (!state.charms?.equipped) {
    return { success: false, message: '现在没有装备护符' };
  }
  state.charms.equipped = null;
  return { success: true, message: '卸下了护符', state };
}

/**
 * 护符列表（渲染用）：附等级、是否已做、材料是否够、是否装备中
 */
export function getCharmList(state) {
  const owned = getOwnedCharms(state);
  return charms.map((charm) => ({
    charm,
    unlocked: state.wallet.level >= charm.unlockLevel,
    owned: owned.includes(charm.id),
    equipped: state.charms?.equipped === charm.id,
    affordable: charm.requires.every((req) => hasEnough(state, req.item, req.count)),
  }));
}

export { charms, CHARM_MIN_LEVEL };
