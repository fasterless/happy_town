// 料理系统
//
// 两道流程：
//   做菜（cookDish）：消耗原料 → 背包里多一道菜（dish_<id>），不进状态机
//   上菜（serveDish）：消耗一道菜 → state.buff 记一段有时效的增益
//
// 为什么把「做」和「吃」拆开：加工坊的批次是产能（排上去等时间就行），
// 而料理的价值在于「什么时候吃」。先做好囤着，看到高价订单再吃加成，
// 玩家才有决策空间。
//
// 同时生效的增益只能有一个（后吃的覆盖先吃的），避免多 buff 叠加后
// 数值失控，也让「吃哪道」成为真正的选择。
import { dishes, getDish, getDishAffordableCount } from '../config/dishes.js';
import { addItem, spendItem, hasEnough, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';
import { recordDish } from './codex.js';

// 同时最多生效几个增益（覆盖式，不叠加）
export const MAX_ACTIVE_BUFFS = 1;

/**
 * 料理铺是否解锁（跟着第一道料理的等级走）
 */
export function isDishesUnlocked(state) {
  return state.wallet.level >= dishes[0].unlockLevel;
}

/**
 * 做一道菜：扣原料，菜进背包
 */
export function cookDish(state, dishId) {
  const dish = getDish(dishId);
  if (!dish) {
    return { success: false, message: '没有这道料理' };
  }
  if (state.wallet.level < dish.unlockLevel) {
    return { success: false, message: `Lv.${dish.unlockLevel}解锁` };
  }
  for (const req of dish.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      return { success: false, message: '原料不足' };
    }
  }

  dish.requires.forEach((req) => spendItem(state, req.item, req.count));
  addItem(state, `dish_${dish.id}`, 1);

  logEvent(state, 'dish_cook');
  recordDish(state, dish.id); // 图鉴收录（料理会消耗，用位图记种类）
  emit(Events.DISH_COOKED, { dishId });

  return {
    success: true,
    message: `做好了${dish.icon}${dish.name}，放在背包里随时能上菜`,
    state,
  };
}

/**
 * 当前生效的增益（过期自动清掉）
 * @returns {Object|null} { type, value, expireAt, dishId }
 */
export function getActiveBuff(state) {
  const buff = state.buff.active;
  if (!buff) return null;
  if (buff.expireAt <= Date.now()) {
    state.buff.active = null; // 顺手清掉过期的，渲染时就不用判断两次
    return null;
  }
  return buff;
}

/**
 * 增益剩余秒数（没有生效中的增益返回 0）
 */
export function getBuffRemainingSeconds(state) {
  const buff = getActiveBuff(state);
  if (!buff) return 0;
  return Math.max(0, Math.floor((buff.expireAt - Date.now()) / 1000));
}

/**
 * 某个类型的增益倍率（没有对应增益时返回 1）
 * @param {Object} state
 * @param {string} type - 增益类型
 * @returns {number} 倍率
 */
export function getBuffMultiplier(state, type) {
  const buff = getActiveBuff(state);
  if (!buff || buff.type !== type) return 1;
  return buff.value;
}

/**
 * 上菜：吃掉背包里的一道菜，激活它的增益（覆盖当前增益）
 */
export function serveDish(state, dishId) {
  const dish = getDish(dishId);
  if (!dish) {
    return { success: false, message: '没有这道料理' };
  }
  if (getCount(state, `dish_${dish.id}`) < 1) {
    return { success: false, message: `背包里没有${dish.name}，先去料理铺做一份` };
  }

  spendItem(state, `dish_${dish.id}`, 1);

  state.buff.active = {
    dishId: dish.id,
    type: dish.buff.type,
    value: dish.buff.value,
    expireAt: Date.now() + dish.buff.durationSec * 1000,
  };

  logEvent(state, 'dish_serve');
  trackDaily(state, 'dish', 1);
  emit(Events.DISH_SERVED, { dishId });

  return {
    success: true,
    message: `上菜：${dish.icon}${dish.name}，${dish.desc}`,
    state,
  };
}

/**
 * 料理配方列表（渲染用）：附等级、可做份数、背包持有数
 */
export function getDishList(state) {
  return dishes.map((dish) => ({
    dish,
    unlocked: state.wallet.level >= dish.unlockLevel,
    affordable: getDishAffordableCount(state, dish),
    owned: getCount(state, `dish_${dish.id}`),
  }));
}

/**
 * 做过的料理种类数（图鉴/成就用）
 * 料理会消耗，所以用埋点里的位图统计，而不是数背包。
 */
export function getCookedDishCount(state) {
  let mask = Number(state.analytics.dish_types) || 0;
  let count = 0;
  while (mask) {
    mask &= mask - 1;
    count++;
  }
  return Math.min(count, dishes.length);
}

/**
 * 料理图鉴条目（渲染用）
 */
export function getDishCodexEntries(state) {
  return dishes.map((dish) => ({
    id: dish.id,
    icon: dish.icon,
    name: dish.name,
    cooked: isDishCooked(state, dish.id),
  }));
}

function isDishCooked(state, dishId) {
  const index = dishes.findIndex((d) => d.id === dishId);
  if (index < 0) return false;
  return ((Number(state.analytics.dish_types) || 0) & (1 << index)) !== 0;
}
