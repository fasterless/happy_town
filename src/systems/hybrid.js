// 杂交工坊
//
// 两种基础作物 + 金币 → 一包杂交种子（seed_<id>）。种子可以囤着种，
// 种下去收获、卖钱、交订单都和普通作物一样（getCrop 已解析杂交 id）。
// 配方首次合成记录进 state.hybrid.discovered，成为永久成就型追求。
import { hybridRecipes, getHybridRecipe } from '../config/hybrid.js';
import { spendItem, addItem, hasEnough } from '../core/inventory.js';
import { logEvent } from '../utils/analytics.js';
import { emit, Events } from '../core/events.js';

/**
 * 杂交是否解锁（跟着加工坊档位走，Lv.10）
 */
export function isHybridUnlocked(state) {
  return state.wallet.level >= 10;
}

/**
 * 某配方是否已发现
 */
export function isDiscovered(state, recipeId) {
  return state.hybrid.discovered.includes(recipeId);
}

/**
 * 检查一次杂交是否可行
 * @returns {Object} { ok, reason }
 */
function checkRecipe(state, recipe) {
  if (state.wallet.level < recipe.unlockLevel) {
    return { ok: false, reason: `需要Lv.${recipe.unlockLevel}` };
  }
  if (!hasEnough(state, "coin", recipe.coin)) {
    return { ok: false, reason: `还需要🪙${recipe.coin}的研究费` };
  }
  for (const req of recipe.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      return { ok: false, reason: "亲本材料不足" };
    }
  }
  return { ok: true };
}

/**
 * 执行一次杂交：消耗亲本作物和金币，产出一包种子（2 粒）
 * @param {Object} state
 * @param {number} recipeId
 * @returns {Object} { success, firstTime, message, state }
 */
export function crossbreed(state, recipeId) {
  const recipe = getHybridRecipe(recipeId);
  if (!recipe) {
    return { success: false, message: "杂交配方不存在" };
  }

  const check = checkRecipe(state, recipe);
  if (!check.ok) {
    return { success: false, message: check.reason };
  }

  spendItem(state, "coin", recipe.coin);
  recipe.requires.forEach((req) => {
    spendItem(state, req.item, req.count);
  });

  // 一包种子 2 粒：一包能种两块地，摊薄杂交成本
  const seedCount = 2;
  addItem(state, `seed_${recipe.id}`, seedCount);

  const firstTime = !isDiscovered(state, recipe.id);
  if (firstTime) {
    state.hybrid.discovered.push(recipe.id);
    logEvent(state, "hybrid_discover");
  }
  logEvent(state, "hybrid_crossbreed");
  emit(Events.HYBRID_DONE, { recipeId, firstTime });

  return {
    success: true,
    firstTime,
    message: `杂交成功！获得${seedCount}粒${recipe.icon}${recipe.name}种子${firstTime ? "，新图谱已点亮 🧬" : ""}`,
    state,
  };
}

/**
 * 某配方当前材料是否齐备（渲染按钮状态用）
 */
export function canCrossbreed(state, recipeId) {
  const recipe = getHybridRecipe(recipeId);
  if (!recipe) return false;
  return checkRecipe(state, recipe).ok;
}

/**
 * 已发现 / 总配方数
 */
export function getHybridStats(state) {
  return {
    discovered: state.hybrid.discovered.length,
    total: hybridRecipes.length,
  };
}
