// 天气系统模块
import { GAME_CONFIG } from '../config/constants.js';
import { todayKey } from '../utils/time.js';

// 天气类型配置
const weatherTypes = [
  { id: "sunny", name: "晴天", icon: "☀️", probability: 50 },
  { id: "rainy", name: "雨天", icon: "🌧️", probability: 30 },
  { id: "snowy", name: "下雪", icon: "❄️", probability: 15 },
  { id: "rainbow", name: "彩虹", icon: "🌈", probability: 5 }, // 稀有天气
];

/**
 * 更新每日天气
 * @param {Object} state - 游戏状态
 * @returns {Object} 更新后的状态
 */
export function updateDailyWeather(state) {
  const today = todayKey();

  // 如果今天已经生成过天气，不重复生成
  if (state.weather.lastUpdate === today) {
    return state;
  }

  // 随机生成天气
  const newWeather = generateRandomWeather();
  state.weather.current = newWeather;
  state.weather.lastUpdate = today;

  return state;
}

/**
 * 随机生成天气（基于概率）
 * @returns {string} 天气ID
 */
function generateRandomWeather() {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const weather of weatherTypes) {
    cumulative += weather.probability;
    if (random < cumulative) {
      return weather.id;
    }
  }

  return "sunny"; // 默认晴天
}

/**
 * 获取当前天气信息
 * @param {Object} state - 游戏状态
 * @returns {Object} 天气信息
 */
export function getCurrentWeather(state) {
  return weatherTypes.find(w => w.id === state.weather.current) || weatherTypes[0];
}

/**
 * 获取天气对作物生长的影响倍率
 * @param {Object} state - 游戏状态
 * @returns {number} 生长倍率
 */
export function getWeatherGrowthRate(state) {
  const weather = state.weather.current;
  return GAME_CONFIG.weather.effects[weather]?.growthRate || 1.0;
}

/**
 * 获取天气对订单奖励的影响倍率
 * @param {Object} state - 游戏状态
 * @returns {number} 奖励倍率
 */
export function getWeatherOrderBonus(state) {
  const weather = state.weather.current;
  return GAME_CONFIG.weather.effects[weather]?.orderBonus || 1.0;
}

/**
 * 检查是否是特殊天气（彩虹）
 * @param {Object} state - 游戏状态
 * @returns {boolean} 是否特殊天气
 */
export function isSpecialWeather(state) {
  return state.weather.current === "rainbow";
}

/**
 * 应用天气效果到作物生长时间
 * @param {number} baseGrowTime - 基础生长时间（秒）
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的生长时间
 */
export function applyWeatherToGrowTime(baseGrowTime, state) {
  const rate = getWeatherGrowthRate(state);
  return Math.floor(baseGrowTime / rate);
}

/**
 * 应用天气效果到订单奖励
 * @param {number} baseReward - 基础奖励
 * @param {Object} state - 游戏状态
 * @returns {number} 调整后的奖励
 */
export function applyWeatherToReward(baseReward, state) {
  const bonus = getWeatherOrderBonus(state);
  return Math.floor(baseReward * bonus);
}
