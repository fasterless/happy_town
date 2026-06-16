// 事件总线模块 - 用于模块间通信

const listeners = {};

/**
 * 订阅事件
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消订阅函数
 */
export function on(eventName, callback) {
  if (!listeners[eventName]) {
    listeners[eventName] = [];
  }

  listeners[eventName].push(callback);

  // 返回取消订阅函数
  return () => {
    off(eventName, callback);
  };
}

/**
 * 取消订阅事件
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 回调函数
 */
export function off(eventName, callback) {
  if (!listeners[eventName]) return;

  const index = listeners[eventName].indexOf(callback);
  if (index > -1) {
    listeners[eventName].splice(index, 1);
  }
}

/**
 * 触发事件
 * @param {string} eventName - 事件名称
 * @param {*} data - 事件数据
 */
export function emit(eventName, data) {
  if (!listeners[eventName]) return;

  listeners[eventName].forEach(callback => {
    try {
      callback(data);
    } catch (error) {
      console.error(`Error in event listener for ${eventName}:`, error);
    }
  });
}

/**
 * 只订阅一次事件
 * @param {string} eventName - 事件名称
 * @param {Function} callback - 回调函数
 * @returns {Function} 取消订阅函数
 */
export function once(eventName, callback) {
  const wrappedCallback = (data) => {
    callback(data);
    off(eventName, wrappedCallback);
  };

  return on(eventName, wrappedCallback);
}

/**
 * 清除所有事件监听器
 */
export function clearAll() {
  Object.keys(listeners).forEach(key => {
    delete listeners[key];
  });
}

/**
 * 清除指定事件的所有监听器
 * @param {string} eventName - 事件名称
 */
export function clearEvent(eventName) {
  delete listeners[eventName];
}

// 预定义的事件类型
export const Events = {
  // 用户相关
  USER_CREATED: 'user:created',
  USER_LEVEL_UP: 'user:level_up',

  // 农场相关
  CROP_PLANTED: 'crop:planted',
  CROP_HARVESTED: 'crop:harvested',

  // 订单相关
  ORDER_COMPLETED: 'order:completed',
  ORDER_REFRESHED: 'order:refreshed',

  // 家具相关
  FURNITURE_BOUGHT: 'furniture:bought',
  FURNITURE_PLACED: 'furniture:placed',

  // 好友相关
  FRIEND_ADDED: 'friend:added',
  FRIEND_VISITED: 'friend:visited',

  // 社区相关
  COMMUNITY_JOINED: 'community:joined',
  COMMUNITY_DONATED: 'community:donated',
  COMMUNITY_STAGE_COMPLETE: 'community:stage_complete',

  // 任务相关
  TASK_CLAIMED: 'task:claimed',
  BOX_CLAIMED: 'box:claimed',

  // 成就相关
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',

  // 系统相关
  STATE_UPDATED: 'state:updated',
  TOAST_SHOW: 'toast:show',
};
