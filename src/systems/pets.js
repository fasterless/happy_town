// 宠物系统模块
import { canAfford, spendPrice, addItem, spendItem, hasEnough } from '../core/inventory.js';
import { todayKey } from '../utils/time.js';

// 宠物配置
export const pets = [
  {
    id: "cat",
    name: "农场小猫",
    icon: "🐱",
    desc: "加速作物生长5%",
    price: 200,
    priceType: "diamond",
    buff: { type: "growthSpeed", value: 1.05 },
    foodCost: { crop_1001: 2 }, // 小麦
  },
  {
    id: "dog",
    name: "牧羊犬",
    icon: "🐶",
    desc: "增加订单奖励10%",
    price: 250,
    priceType: "diamond",
    buff: { type: "orderBonus", value: 1.10 },
    foodCost: { crop_1002: 2 }, // 番茄
  },
  {
    id: "rabbit",
    name: "兔子",
    icon: "🐰",
    desc: "每日赠送随机作物",
    price: 180,
    priceType: "diamond",
    buff: { type: "dailyGift", value: "random_crop" },
    foodCost: { crop_1003: 1 }, // 草莓
  },
  {
    id: "duck",
    name: "鸭子",
    icon: "🦆",
    desc: "增加好友点获取50%",
    price: 150,
    priceType: "diamond",
    buff: { type: "friendPointBonus", value: 1.50 },
    foodCost: { crop_1001: 3 }, // 小麦
  },
  {
    id: "pig",
    name: "小猪",
    icon: "🐷",
    desc: "降低种子价格10%",
    price: 220,
    priceType: "diamond",
    buff: { type: "seedDiscount", value: 0.90 },
    foodCost: { crop_1004: 1 }, // 玉米
  },
];

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

  // 检查今天是否已喂养过
  const today = todayKey();
  const lastFeedKey = `${petId}_lastFeed`;
  if (state.pets[lastFeedKey] === today) {
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

  // 记录喂养时间
  state.pets[lastFeedKey] = today;

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
 * 应用宠物buff到种子价格
 * @param {number} basePrice - 基础价格
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的价格
 */
export function applyPetToSeedPrice(basePrice, state) {
  const buff = getActivePetBuff(state);
  if (buff && buff.type === "seedDiscount") {
    return Math.floor(basePrice * buff.enhancedValue);
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

  return { success: true, message: `${state.pets.active}赠送了${amount}个作物`, state };
}
