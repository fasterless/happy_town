// 加工坊系统
//
// 玩家选一个配方、投料开始加工，倒计时结束后领取成品。
// 加工中的任务保存在 state.crafting.queue = [{ recipeId, startedAt, time }]，
// 结构和农场地块一致（记录开始时间而不是剩余时间，离线也照走）。
import { getRecipe, craftingRecipes } from '../config/crafting.js';
import { getCount, addItem, spendItem, hasEnough } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { applyPetToCraftTime } from './pets.js';
import { getBuffMultiplier } from './dishes.js';
import { furnitureKey } from '../utils/format.js';
import { recordFurniture } from './codex.js';

// 同时最多进行的加工批次数
const MAX_QUEUE = 2;

// 锭配方领取时附赠的摆件（矿锭的「摆出来」出口，家具不在商店出售）
const FURNISHING_BY_RECIPE = { 5009: 3015, 5010: 3016, 5011: 3017 };

/**
 * 加工坊是否解锁（Lv.10，跟随 levels.js 的「作物加工」档位）
 */
export function isCraftingUnlocked(state) {
  return state.wallet.level >= 10;
}

/**
 * 某个配方当前是否可开工
 * @returns {Object} { ok, reason }
 */
function checkRecipe(state, recipe) {
  if (state.wallet.level < recipe.unlockLevel) {
    return { ok: false, reason: `Lv.${recipe.unlockLevel}解锁` };
  }
  if (state.crafting.queue.length >= MAX_QUEUE) {
    return { ok: false, reason: "加工台已满" };
  }
  for (const req of recipe.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      return { ok: false, reason: "原料不足" };
    }
  }
  return { ok: true };
}

/**
 * 开始一次加工
 * @param {Object} state
 * @param {number} recipeId - 配方ID
 * @returns {Object} { success, message }
 */
export function startCrafting(state, recipeId) {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { success: false, message: "配方不存在" };

  const check = checkRecipe(state, recipe);
  if (!check.ok) return { success: false, message: check.reason };

  for (const req of recipe.requires) {
    spendItem(state, req.item, req.count);
  }

  state.crafting.queue.push({
    recipeId: recipe.id,
    startedAt: new Date().toISOString(),
    // 鹦鹉缩短 20%，料理「香酥拼盘」再打 7 折（两者叠乘）
    time: Math.max(30, Math.floor(
      applyPetToCraftTime(recipe.time, state) * getBuffMultiplier(state, 'craftSpeed')
    )),
  });

  logEvent(state, "craft_start");
  return { success: true, message: `开始加工${recipe.name}`, state };
}

/**
 * 判断某个加工批次是否完成
 */
export function isBatchDone(batch) {
  if (!batch) return false;
  const elapsed = Math.floor((Date.now() - new Date(batch.startedAt).getTime()) / 1000);
  return elapsed >= batch.time;
}

/**
 * 领取一个完成的加工批次
 * @param {number} queueIndex
 */
export function claimCrafting(state, queueIndex) {
  const batch = state.crafting.queue[queueIndex];
  if (!batch) return { success: false, message: "没有这个加工批次" };

  if (!isBatchDone(batch)) {
    return { success: false, message: "还没有加工好" };
  }

  const recipe = getRecipe(batch.recipeId);
  if (!recipe) return { success: false, message: "配方配置错误" };

  state.crafting.queue.splice(queueIndex, 1);
  addItem(state, recipe.result.key, recipe.result.count);
  addItem(state, "exp", 3);
  const furnishingId = grantFurnishing(state, recipe);

  logEvent(state, "craft_finish");
  if (FURNISHING_BY_RECIPE[recipe.id]) logEvent(state, "ingot_smelt");
  trackDaily(state, "craft", 1);

  const gift = furnishingId ? "，顺手打造了一件摆件放进背包" : "";
  return {
    success: true,
    message: `加工完成：${recipe.icon}${recipe.name}×${recipe.result.count}，获得3经验${gift}`,
    state,
  };
}

/**
 * 一键领取所有完成的批次
 */
export function claimAllCrafting(state) {
  let claimed = 0;
  let exp = 0;
  let furnishings = 0;
  const doneNames = [];

  // 从后往前遍历，边删边安全
  for (let i = state.crafting.queue.length - 1; i >= 0; i--) {
    const batch = state.crafting.queue[i];
    if (!isBatchDone(batch)) continue;

    const recipe = getRecipe(batch.recipeId);
    if (!recipe) continue;

    state.crafting.queue.splice(i, 1);
    addItem(state, recipe.result.key, recipe.result.count);
    addItem(state, "exp", 3);
    if (grantFurnishing(state, recipe)) furnishings++;
    claimed++;
    exp += 3;
    doneNames.push(`${recipe.name}×${recipe.result.count}`);

    logEvent(state, "craft_finish");
    if (FURNISHING_BY_RECIPE[recipe.id]) logEvent(state, "ingot_smelt");
    trackDaily(state, "craft", 1);
  }

  if (!claimed) return { success: false, message: "没有加工好的成品" };

  const gift = furnishings ? `，顺手打造了${furnishings}件摆件` : "";
  return {
    success: true,
    message: `领取了${doneNames.join("、")}，获得${exp}经验${gift}`,
    state,
  };
}

/**
 * 取消一个加工批次（退还一半原料，向上取整）
 */
export function cancelCrafting(state, queueIndex) {
  const batch = state.crafting.queue[queueIndex];
  if (!batch) return { success: false, message: "没有这个加工批次" };

  const recipe = getRecipe(batch.recipeId);
  if (!recipe) return { success: false, message: "配方配置错误" };

  state.crafting.queue.splice(queueIndex, 1);
  recipe.requires.forEach((req) => {
    addItem(state, req.item, Math.ceil(req.count / 2));
  });

  return { success: true, message: `取消了${recipe.name}的加工，退还了一半原料`, state };
}

/**
 * 某配方当前拥有的原料份数（能开工几次）
 */
export function getRecipeAffordableCount(state, recipe) {
  let min = Infinity;
  for (const req of recipe.requires) {
    const times = Math.floor(getCount(state, req.item) / req.count);
    min = Math.min(min, times);
  }
  return min === Infinity ? 0 : min;
}

/**
 * 全部配方列表（渲染用）
 */
export function getAllRecipes() {
  return craftingRecipes;
}

/**
 * 熔炼配方的附赠：锭配方领取出锭之外，还送一件对应的装饰摆件进背包。
 * 摆件是「拥有过」语义的收藏，所以只在玩家还没有这件家具时送一次。
 * @param {Object} state
 * @param {Object} recipe
 * @returns {number|null} 送出的家具 id，没有则 null
 */
function grantFurnishing(state, recipe) {
  const furnitureId = FURNISHING_BY_RECIPE[recipe.id];
  if (!furnitureId) return null;
  if (getCount(state, furnitureKey(furnitureId)) > 0) return null;
  if (ownsFurnishingInRoom(state, furnitureId)) return null;

  addItem(state, furnitureKey(furnitureId), 1);
  recordFurniture(state, furnitureId);
  return furnitureId;
}

/** 房间里是否已经摆着这件家具 */
function ownsFurnishingInRoom(state, furnitureId) {
  return (state.home?.layout || []).some((item) => item && item.id === furnitureId);
}
