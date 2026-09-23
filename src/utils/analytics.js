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
    craft_start: "开始加工",
    craft_finish: "完成加工",
    fishing_cast: "湖畔垂钓",
    fishing_sell: "卖出鱼获",
    lottery_spin: "幸运抽奖",
    seasonal_claim: "季节活动领奖",
    festival_task: "领取庆典任务",
    festival_reward: "兑换庆典收藏",
    explore_visit: "周边探索",
    explore_walk: "与邻居同行散步",
    explore_souvenir: "收藏散步足迹",
    explore_display: "摆出足迹纪念",
    explore_gift: "兑换足迹小礼",
    explore_season: "四季散步集章",
    yearbook_claim: "领取年鉴里程碑",
    yearbook_entry: "年鉴分册记入",
    yearbook_bind: "装订年鉴分册",
    yearbook_volume: "领取年鉴装订奖励",
    yearbook_backfill: "年鉴补记",
    yearbook_recall: "翻看往年年鉴",
    neighbor_gift: "邻居回礼",
    schedule_visit: "按日程拜访",
    relationship_gain: "提升邻居熟悉度",
    relationship_tier: "邻居关系进阶",
    relationship_memory: "倾听邻居回忆",
    pet_feed: "喂养宠物",
    hybrid_crossbreed: "杂交合成",
    hybrid_discover: "发现新图谱",
    hybrid_harvest: "收获杂交作物",
    market_sell: "集市挂售",
    codex_new_dish: "新料理收录",
    commission_complete: "完成委托",
    commission_reroll: "刷新委托榜",
    dish_cook: "做料理",
    dish_serve: "上菜",
    wish_make: "许愿",
    wish_settle: "愿望结算",
    wish_reroll: "刷新心愿",
    wish_high: "许愿大吉",
    help_fulfill: "帮助邻居",
    help_reroll: "刷新求助板",
    favor_full: "人情满格",
    mine_dig: "后山下矿",
    ore_sell: "卖出矿藏",
    pickaxe_upgrade: "升级镐子",
    ingot_smelt: "熔炼矿锭",
    charm_craft: "制作护符",
    charm_equip: "装备护符",
    talent_unlock: "点亮天赋",
    greenhouse_plant: "温室种植",
    cafe_serve: "咖啡馆上菜",
    cafe_tip: "收到小费",
    story_chapter: "完成剧情章节",
    story_ending: "选择剧情结局",
    town_project_donate: "参与小镇共建",
    town_project_complete: "完成小镇共建",
    town_project_invite: "邀请邻居参与共建",
    town_style_choose: "更换小镇风貌",
    cosmetic_equip: "装备称号或头像框",
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
