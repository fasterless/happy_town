// 数据埋点和统计工具

/**
 * 记录游戏事件
 * @param {Object} state - 游戏状态
 * @param {string} eventName - 事件名称
 * @returns {Object} 更新后的状态
 */
export function logEvent(state, eventName) {
  if (!state.analytics) {
    state.analytics = {};
  }

  if (!state.analytics[eventName]) {
    state.analytics[eventName] = 0;
  }

  state.analytics[eventName]++;
  return state;
}

/**
 * 获取事件统计数据
 * @param {Object} state - 游戏状态
 * @returns {Array} 统计数据数组
 */
export function getAnalytics(state) {
  const analytics = state.analytics || {};
  return Object.entries(analytics).map(([name, count]) => ({
    name: getEventDisplayName(name),
    count,
  }));
}

/**
 * 获取事件显示名称
 * @param {string} eventName - 事件名称
 * @returns {string} 显示名称
 */
function getEventDisplayName(eventName) {
  const names = {
    login: "登录",
    level_up: "升级",
    buy_seed: "购买种子",
    plant_crop: "种植作物",
    harvest_crop: "收获作物",
    order_complete: "完成订单",
    order_refresh: "刷新订单",
    furniture_buy: "购买家具",
    furniture_place: "摆放家具",
    friend_add: "添加好友",
    friend_visit: "拜访好友",
    home_like: "点赞家园",
    community_join: "加入社区",
    community_donate: "社区捐献",
    task_claim: "领取任务",
    box_claim: "领取宝箱",
    shop_buy: "商城购买",
  };

  return names[eventName] || eventName;
}

/**
 * 追踪每日任务进度
 * @param {Object} state - 游戏状态
 * @param {string} type - 任务类型
 * @param {number} amount - 进度增量
 * @returns {Object} 更新后的状态
 */
export function trackDaily(state, type, amount = 1) {
  if (!state.daily.progress[type]) {
    state.daily.progress[type] = 0;
  }
  state.daily.progress[type] += amount;
  return state;
}

/**
 * 获取任务完成状态
 * @param {Object} state - 游戏状态
 * @param {Object} task - 任务对象
 * @returns {boolean} 是否完成
 */
export function isTaskComplete(state, task) {
  const progress = state.daily.progress[task.type] || 0;
  return progress >= task.target;
}

/**
 * 获取任务进度百分比
 * @param {Object} state - 游戏状态
 * @param {Object} task - 任务对象
 * @returns {number} 进度百分比 (0-100)
 */
export function getTaskProgress(state, task) {
  const progress = state.daily.progress[task.type] || 0;
  return Math.min(100, Math.floor((progress / task.target) * 100));
}
