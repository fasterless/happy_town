// 宠物喂养互动系统
// 让玩家能主动喂养宠物，增加沉浸感和日常互动

import { addItem, spendItem, hasEnough } from '../core/inventory.js';
import { showToast } from '../ui/toast.js';
import { playSound } from '../ui/audio.js';
import { pets } from '../config/pets.js';
import { crops } from '../config/crops.js';

export function feedPetInteraction(state, petId) {
  const pet = pets.find(p => p.id === petId);
  if (!pet) {
    return { success: false, message: "宠物不存在" };
  }

  if (!state.pets.owned.includes(petId)) {
    return { success: false, message: "尚未拥有该宠物" };
  }

  const today = new Date().toDateString();
  const lastFeed = state.pets.lastFeed?.[petId];

  if (lastFeed === today) {
    return { success: false, message: "今天已经喂养过了" };
  }

  // 检查食物
  for (const [itemKey, count] of Object.entries(pet.foodCost)) {
    if (!hasEnough(state, itemKey, count)) {
      return { success: false, message: `需要${count}${itemKey.startsWith('crop_') ? '个' : ''}${crops.find(c => c.id === parseInt(itemKey.replace('crop_', '')))?.name || itemKey}来喂养` };
    }
  }

  // 扣除食物
  for (const [itemKey, count] of Object.entries(pet.foodCost)) {
    spendItem(state, itemKey, count);
  }

  // 增加亲密度
  state.pets.intimacy[petId] = (state.pets.intimacy[petId] || 0) + 15;

  // 记录喂养时间
  state.pets.lastFeed = state.pets.lastFeed || {};
  state.pets.lastFeed[petId] = today;

  // 随机获得额外奖励（亲密度越高，奖励越好）
  const intimacyBonus = Math.min(0.5, state.pets.intimacy[petId] / 100);
  const extraReward = Math.floor(10 * (1 + intimacyBonus));

  addItem(state, "coin", extraReward);

  showToast(`成功喂养了${pet.name}！亲密度+15，获得${extraReward}金币奖励！`, "success");
  playSound("success");

  return { success: true, state };
}

// 获取宠物喂养状态
export function getPetFeedStatus(state, petId) {
  if (!state.pets.owned.includes(petId)) return null;

  const today = new Date().toDateString();
  const lastFeed = state.pets.lastFeed?.[petId];

  return {
    todayFed: lastFeed === today,
    intimacy: state.pets.intimacy[petId] || 0,
    nextFeedTime: lastFeed === today ? "今天已喂养" : "可以喂养"
  };
}