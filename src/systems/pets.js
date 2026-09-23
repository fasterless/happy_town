// 宠物系统模块
import { canAfford, spendPrice, addItem, spendItem, hasEnough } from '../core/inventory.js';
import { pets } from '../config/pets.js';
import { crops } from '../config/crops.js';
import { todayKey } from '../utils/time.js';
import { logEvent } from '../utils/analytics.js';

/**
 * 购买宠物
 * @param {Object} state - 游戏状态
 * @param {string} petId - 宠物ID
 * @returns {Object} 结果 { success, message, state }
 */
export function buyPet(state, petId) {
  const pet = pets.find(p => p.id === petId);
  if (!pet) {
    return { success: false, message: "宠物不存在" };
  }

  // 检查是否已拥有
  if (state.pets.owned.includes(petId)) {
    return { success: false, message: "已经拥有这只宠物了" };
  }

  // 检查等级（Lv.13解锁宠物系统）
  if (state.wallet.level < 13) {
    return { success: false, message: "Lv.13解锁宠物系统" };
  }

  // 检查货币
  if (!canAfford(state, pet.priceType, pet.price)) {
    return { success: false, message: "钻石不足" };
  }

  // 扣除货币
  spendPrice(state, pet.priceType, pet.price);

  // 添加宠物
  state.pets.owned.push(petId);

  // 初始化亲密度
  state.pets.intimacy[petId] = 0;

  return { success: true, message: `领养了${pet.name}`, state };
}

/**
 * 设置活跃宠物
 * @param {Object} state - 游戏状态
 * @param {string} petId - 宠物ID（null表示取消）
 * @returns {Object} 结果 { success, message, state }
 */
export function setActivePet(state, petId) {
  if (petId && !state.pets.owned.includes(petId)) {
    return { success: false, message: "尚未拥有该宠物" };
  }

  state.pets.active = petId;

  if (petId) {
    const pet = pets.find(p => p.id === petId);
    return { success: true, message: `设置了${pet.name}为活跃宠物`, state };
  } else {
    return { success: true, message: "取消了活跃宠物", state };
  }
}

/**
 * 喂养宠物
 * @param {Object} state - 游戏状态
 * @param {string} petId - 宠物ID
 * @returns {Object} 结果 { success, message, state }
 */
export function feedPet(state, petId) {
  const pet = pets.find(p => p.id === petId);
  if (!pet) {
    return { success: false, message: "宠物不存在" };
  }

  if (!state.pets.owned.includes(petId)) {
    return { success: false, message: "尚未拥有该宠物" };
  }

  const today = todayKey();
  if (!state.pets.lastFeed) state.pets.lastFeed = {};
  if (state.pets.lastFeed[petId] === today) {
    return { success: false, message: "今天已经喂养过了" };
  }

  // 检查食物
  for (const [itemKey, count] of Object.entries(pet.foodCost)) {
    if (!hasEnough(state, itemKey, count)) {
      return { success: false, message: "食物不足" };
    }
  }

  // 扣除食物
  for (const [itemKey, count] of Object.entries(pet.foodCost)) {
    spendItem(state, itemKey, count);
  }

  // 增加亲密度
  state.pets.intimacy[petId] = (state.pets.intimacy[petId] || 0) + 10;

  state.pets.lastFeed[petId] = today;
  logEvent(state, "pet_feed");

  return { success: true, message: `喂养了${pet.name}，亲密度+10`, state };
}

/**
 * 获取活跃宠物的buff
 * @param {Object} state - 游戏状态
 * @returns {Object|null} buff对象或null
 */
export function getActivePetBuff(state) {
  if (!state.pets.active) return null;

  const pet = pets.find(p => p.id === state.pets.active);
  if (!pet) return null;

  // 根据亲密度调整buff效果
  const intimacy = state.pets.intimacy[state.pets.active] || 0;
  const intimacyBonus = Math.min(0.5, intimacy / 200); // 最多增强50%

  return {
    ...pet.buff,
    enhancedValue: pet.buff.value * (1 + intimacyBonus),
  };
}

/**
 * 应用宠物buff到作物生长时间
 * @param {number} baseGrowTime - 基础生长时间（秒）
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的生长时间
 */
export function applyPetToGrowTime(baseGrowTime, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "growthSpeed") {
    return Math.max(1, Math.floor(baseGrowTime / buff.enhancedValue));
  }
  return baseGrowTime;
}

/**
 * 应用宠物buff到种子价格
 *
 * 注意：折扣类 buff 的 value < 1，亲密度增强应让它更小（更便宜），
 * 因此这里不能直接用 enhancedValue（那是给倍率类 buff 用的）。
 * @param {number} basePrice - 基础价格
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的价格
 */
export function applyPetToSeedPrice(basePrice, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "seedDiscount") {
    const intimacy = state.pets.intimacy[state.pets.active] || 0;
    const intimacyBonus = Math.min(0.5, intimacy / 200);
    const rate = buff.value * (1 - intimacyBonus);
    return Math.max(1, Math.floor(basePrice * rate));
  }
  return basePrice;
}

/**
 * 应用宠物buff到订单奖励
 * @param {number} baseReward - 基础奖励
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的奖励
 */
export function applyPetToOrderReward(baseReward, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "orderBonus") {
    return Math.floor(baseReward * buff.enhancedValue);
  }
  return baseReward;
}

/**
 * 应用宠物buff到好友点
 * @param {number} basePoint - 基础友情点
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的友情点
 */
export function applyPetToFriendPoint(basePoint, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "friendPointBonus") {
    return Math.floor(basePoint * buff.enhancedValue);
  }
  return basePoint;
}

/**
 * 应用宠物buff到钓鱼稀有度（fishing.js 用它调整稀有鱼权重）
 * @param {number} baseWeightMultiplier - 基础稀有倍率
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的倍率
 */
export function applyPetToFishingLuck(baseWeightMultiplier, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "fishingLuck") {
    return baseWeightMultiplier * buff.enhancedValue;
  }
  return baseWeightMultiplier;
}

/**
 * 应用宠物buff到挖矿稀有度（mine.js 用它调整宝石/稀有矿权重）
 * @param {number} baseWeightMultiplier - 基础稀有倍率
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的倍率
 */
export function applyPetToMiningLuck(baseWeightMultiplier, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "miningLuck") {
    return baseWeightMultiplier * buff.enhancedValue;
  }
  return baseWeightMultiplier;
}

/**
 * 应用宠物buff到加工时长（crafting.js 用它缩短加工时间）
 * @param {number} baseTime - 基础加工秒数
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的秒数
 */
export function applyPetToCraftTime(baseTime, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "craftSpeed") {
    // 折扣类 buff：亲密度越高压得越低（越快）
    const intimacy = state.pets.intimacy[state.pets.active] || 0;
    const intimacyBonus = Math.min(0.5, intimacy / 200);
    const rate = buff.value * (1 - intimacyBonus);
    return Math.max(30, Math.floor(baseTime * rate));
  }
  return baseTime;
}

/**
 * 领取宠物每日礼物
 * @param {Object} state - 游戏状态
 * @returns {Object} 结果 { success, message, state }
 */
export function claimPetDailyGift(state) {
  const buff = getActivePetBuff(state);
  if (!buff || buff.type !== "dailyGift") {
    return { success: false, message: "当前宠物不提供每日礼物" };
  }

  const today = todayKey();
  if (state.pets.lastGiftDate === today) {
    return { success: false, message: "今天已经领取过了" };
  }

  // 随机赠送一种作物
  const cropIds = [1001, 1002, 1003, 1004, 1005];
  const randomCropId = cropIds[Math.floor(Math.random() * cropIds.length)];
  const itemKey = `crop_${randomCropId}`;
  const amount = 3;

  addItem(state, itemKey, amount);
  state.pets.lastGiftDate = today;

  const activePet = pets.find(p => p.id === state.pets.active);
  const crop = crops.find(c => c.id === randomCropId);

  return {
    success: true,
    message: `${activePet ? activePet.name : "宠物"}赠送了${amount}个${crop ? crop.name : "作物"}`,
    state
  };
}

/**
 * 今天是否已喂养过
 * @param {Object} state
 * @param {string} petId
 * @returns {boolean}
 */
export function hasFedToday(state, petId) {
  return state.pets.lastFeed?.[petId] === todayKey();
}
