// 格式化工具函数
import { crops } from '../config/crops.js';
import { furniture } from '../config/furniture.js';
import { craftingRecipes } from '../config/crafting.js';
import { hybridRecipes } from '../config/hybrid.js';
import { fishes } from '../systems/fishing.js';
import { dishes } from '../config/dishes.js';

// 默认配置表，供 getItemName / getItemIcon 在未显式传入 configs 时使用
const defaultConfigs = { crops, furniture, craftingRecipes, hybridRecipes, fishes, dishes };

// 基础物品的显示名与图标
const BASIC_LABELS = {
  coin: "金币",
  diamond: "钻石",
  exp: "经验",
  friendPoint: "友情点",
  communityContribution: "社区贡献",
  wood: "木材",
  stone: "石头",
  cloth: "布料",
  speed_ticket: "加速券",
  lottery_ticket: "抽奖券",
  egg: "鸡蛋",
  wool: "羊毛",
  milk: "牛奶",
  ore_copper: "铜矿",
  ore_iron: "铁矿",
  ore_silver: "银矿",
  gem_topaz: "黄水晶",
  gem_amethyst: "紫水晶",
  gem_emerald: "祖母绿",
  gem_crystal: "幻彩水晶",
  ingot_copper: "铜锭",
  ingot_iron: "铁锭",
  ingot_silver: "银锭",
  token_spring: "春朝花笺", token_summer: "清凉贝壳", token_autumn: "丰收麦穗", token_winter: "暖冬丝带", token_newyear: "庙会灯结",
  twig: "青树枝", resin: "松脂", pebble: "圆卵石", shell: "湖贝", ticket: "旧车票", bell: "铜车站铃",
};

const BASIC_ICONS = {
  coin: "🪙",
  diamond: "💎",
  exp: "⭐",
  friendPoint: "🤝",
  communityContribution: "🏅",
  wood: "🪵",
  stone: "🪨",
  cloth: "🧵",
  speed_ticket: "⏩",
  lottery_ticket: "🎟️",
  egg: "🥚",
  wool: "🧶",
  milk: "🥛",
  ore_copper: "🟤",
  ore_iron: "⚙️",
  ore_silver: "🥈",
  gem_topaz: "🔶",
  gem_amethyst: "💜",
  gem_emerald: "💚",
  gem_crystal: "💠",
  ingot_copper: "🟠",
  ingot_iron: "⚪",
  ingot_silver: "✨",
  token_spring: "🌸", token_summer: "🐚", token_autumn: "🌾", token_winter: "🎀", token_newyear: "🏮",
  twig: "🌿", resin: "🍯", pebble: "🪨", shell: "🐚", ticket: "🎫", bell: "🔔",
};

/**
 * 转义 HTML 特殊字符，用于把玩家输入安全地插入 innerHTML
 * @param {*} value - 任意值
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 格式化奖励对象为文本
 * @param {Object} rewards - 奖励对象 { coin: 100, crop_1001: 6, f_3008: 1, ... }
 * @param {Object} configs - 可选的配置覆盖 { crops, furniture }
 * @returns {string} 格式化的奖励文本
 */
export function formatRewards(rewards, configs = defaultConfigs) {
  const parts = [];

  for (const [key, value] of Object.entries(rewards || {})) {
    if (!value) continue;
    parts.push(`${getItemName(key, configs)}×${value}`);
  }

  return parts.join("、") || "无";
}

/**
 * 格式化价格标签
 * @param {string} priceType - 价格类型 (coin/diamond/rmb)
 * @param {number} price - 价格
 * @returns {string} 格式化的价格字符串
 */
export function moneyLabel(priceType, price) {
  if (priceType === "coin") return `${price}金币`;
  if (priceType === "diamond") return `${price}钻石`;
  if (priceType === "friendPoint") return `${price}友情点`;
  if (priceType === "rmb") return `¥${price}`;
  return String(price);
}

/**
 * 生成作物库存键
 * @param {number} cropId - 作物ID
 * @returns {string} 库存键名
 */
export function itemKey(cropId) {
  return `crop_${cropId}`;
}

/**
 * 生成家具库存键
 * @param {number} furnitureId - 家具ID
 * @returns {string} 库存键名
 */
export function furnitureKey(furnitureId) {
  return `f_${furnitureId}`;
}

/**
 * 格式化大数字（添加千分位）
 * @param {number} num - 数字
 * @returns {string} 格式化的数字
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 获取物品名称
 * @param {string} key - 物品键名
 * @param {Object} configs - 配置对象（默认使用内置的 crops / furniture）
 * @returns {string} 物品名称
 */
export function getItemName(key, configs = defaultConfigs) {
  if (BASIC_LABELS[key]) return BASIC_LABELS[key];

  if (key.startsWith("gold_") && configs.crops) {
    const cropId = Number(key.replace("gold_", ""));
    const crop = configs.crops.find(c => c.id === cropId);
    return crop ? `金穗${crop.name}` : key;
  }

  if (key.startsWith("crop_") && configs.crops) {
    const cropId = Number(key.replace("crop_", ""));
    const crop = configs.crops.find(c => c.id === cropId);
    return crop ? crop.name : key;
  }

  if (key.startsWith("seed_") && configs.hybridRecipes) {
    const recipeId = Number(key.replace("seed_", ""));
    const recipe = configs.hybridRecipes.find(r => r.id === recipeId);
    return recipe ? `${recipe.name}种子` : key;
  }

  if (key.startsWith("f_") && configs.furniture) {
    const furId = Number(key.replace("f_", ""));
    const fur = configs.furniture.find(f => f.id === furId);
    return fur ? fur.name : key;
  }

  if (key.startsWith("goods_") && configs.craftingRecipes) {
    const recipeId = Number(key.replace("goods_", ""));
    const recipe = configs.craftingRecipes.find(r => r.id === recipeId);
    return recipe ? recipe.name : key;
  }

  if (key.startsWith("fish_") && configs.fishes) {
    const fishId = Number(key.replace("fish_", ""));
    const fish = configs.fishes.find(f => f.id === fishId);
    return fish ? fish.name : key;
  }

  if (key.startsWith("dish_") && configs.dishes) {
    const dishId = Number(key.replace("dish_", ""));
    const dish = configs.dishes.find(d => d.id === dishId);
    return dish ? dish.name : key;
  }

  return key;
}

/**
 * 获取物品图标
 * @param {string} key - 物品键名
 * @param {Object} configs - 配置对象（默认使用内置的 crops / furniture）
 * @returns {string} 物品图标
 */
export function getItemIcon(key, configs = defaultConfigs) {
  if (BASIC_ICONS[key]) return BASIC_ICONS[key];

  if (key.startsWith("gold_") && configs.crops) {
    const cropId = Number(key.replace("gold_", ""));
    const crop = configs.crops.find(c => c.id === cropId);
    return crop ? `✨${crop.icon}` : "✨";
  }

  if (key.startsWith("crop_") && configs.crops) {
    const cropId = Number(key.replace("crop_", ""));
    const crop = configs.crops.find(c => c.id === cropId);
    return crop ? crop.icon : "📦";
  }

  if (key.startsWith("seed_") && configs.hybridRecipes) {
    const recipeId = Number(key.replace("seed_", ""));
    const recipe = configs.hybridRecipes.find(r => r.id === recipeId);
    return recipe ? recipe.icon : "🌱";
  }

  if (key.startsWith("f_") && configs.furniture) {
    const furId = Number(key.replace("f_", ""));
    const fur = configs.furniture.find(f => f.id === furId);
    return fur ? fur.icon : "🎁";
  }

  if (key.startsWith("goods_") && configs.craftingRecipes) {
    const recipeId = Number(key.replace("goods_", ""));
    const recipe = configs.craftingRecipes.find(r => r.id === recipeId);
    return recipe ? recipe.icon : "📦";
  }

  if (key.startsWith("fish_") && configs.fishes) {
    const fishId = Number(key.replace("fish_", ""));
    const fish = configs.fishes.find(f => f.id === fishId);
    return fish ? fish.icon : "🐟";
  }

  if (key.startsWith("dish_") && configs.dishes) {
    const dishId = Number(key.replace("dish_", ""));
    const dish = configs.dishes.find(d => d.id === dishId);
    return dish ? dish.icon : "🍽️";
  }

  return "📦";
}
