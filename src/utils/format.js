// 格式化工具函数

/**
 * 格式化奖励对象为文本
 * @param {Object} rewards - 奖励对象 { coin: 100, diamond: 50, ... }
 * @returns {string} 格式化的奖励文本
 */
export function formatRewards(rewards) {
  const parts = [];

  if (rewards.coin) parts.push(`金币×${rewards.coin}`);
  if (rewards.diamond) parts.push(`钻石×${rewards.diamond}`);
  if (rewards.exp) parts.push(`经验×${rewards.exp}`);
  if (rewards.friendPoint) parts.push(`友情点×${rewards.friendPoint}`);
  if (rewards.communityContribution) parts.push(`社区贡献×${rewards.communityContribution}`);
  if (rewards.wood) parts.push(`木材×${rewards.wood}`);
  if (rewards.stone) parts.push(`石头×${rewards.stone}`);
  if (rewards.cloth) parts.push(`布料×${rewards.cloth}`);

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
 * @param {Object} configs - 配置对象
 * @returns {string} 物品名称
 */
export function getItemName(key, configs = {}) {
  if (key === "coin") return "金币";
  if (key === "diamond") return "钻石";
  if (key === "friendPoint") return "友情点";
  if (key === "communityContribution") return "社区贡献";
  if (key === "wood") return "木材";
  if (key === "stone") return "石头";
  if (key === "cloth") return "布料";
  if (key === "exp") return "经验";

  if (key.startsWith("crop_") && configs.crops) {
    const cropId = Number(key.replace("crop_", ""));
    const crop = configs.crops.find(c => c.id === cropId);
    return crop ? crop.name : key;
  }

  if (key.startsWith("f_") && configs.furniture) {
    const furId = Number(key.replace("f_", ""));
    const fur = configs.furniture.find(f => f.id === furId);
    return fur ? fur.name : key;
  }

  return key;
}

/**
 * 获取物品图标
 * @param {string} key - 物品键名
 * @param {Object} configs - 配置对象
 * @returns {string} 物品图标
 */
export function getItemIcon(key, configs = {}) {
  if (key === "coin") return "🪙";
  if (key === "diamond") return "💎";
  if (key === "friendPoint") return "🤝";
  if (key === "communityContribution") return "🏅";
  if (key === "wood") return "🪵";
  if (key === "stone") return "🪨";
  if (key === "cloth") return "🧵";
  if (key === "exp") return "⭐";

  if (key.startsWith("crop_") && configs.crops) {
    const cropId = Number(key.replace("crop_", ""));
    const crop = configs.crops.find(c => c.id === cropId);
    return crop ? crop.icon : "📦";
  }

  if (key.startsWith("f_") && configs.furniture) {
    const furId = Number(key.replace("f_", ""));
    const fur = configs.furniture.find(f => f.id === furId);
    return fur ? fur.icon : "🎁";
  }

  return "📦";
}
