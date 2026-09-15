// 村民动态事件系统
// 用于让NPC有“今天心情”和日常事件，极大提升沉浸感

import { addItem, spendPrice } from '../core/inventory.js';
import { showToast } from '../ui/toast.js';
import { playSound } from '../ui/audio.js';

export const npcEvents = [
  {
    id: "mayor_fruit",
    name: "林镇长水果派",
    trigger: "daily",           // daily / visit / like / donate
    message: "镇长今天心情很好，愿意分享{count}个水果！",
    rewards: { crop_1003: 3 }   // 草莓
  },
  {
    id: "baker_daily",
    name: "面包师日常",
    trigger: "daily",
    message: "麦香面包师今天烤了新面包，送你1个！",
    rewards: { item: "bread", count: 1 }   // 需要在inventory中添加bread物品
  },
  {
    id: "florist_visit",
    name: "花园阿梨感谢",
    trigger: "visit",
    message: "花园阿梨很开心，送你1个花瓶！",
    rewards: { f_3003: 1 }
  },
  {
    id: "carpenter_like",
    name: "木工阿川喜欢",
    trigger: "like",
    message: "木工阿川很感动，送你1个木头！",
    rewards: { wood: 5 }
  },
  {
    id: "barista_gift",
    name: "咖啡小敏小礼物",
    trigger: "donate",
    message: "咖啡小敏今天心情好，送你1个幸运币！",
    rewards: { lucky_coin: 1 }
  }
];

// 触发NPC事件
export function triggerNpcEvent(state, friendId) {
  const friend = defaultFriends.find(f => f.id === friendId);
  if (!friend) return;

  // 根据触发类型决定事件
  let event = null;
  const today = new Date().toDateString(); // 简单日期判断

  // 每天触发一次
  if (state.npcEvents.lastTriggerDate !== today) {
    event = npcEvents.find(e => e.trigger === "daily");
    state.npcEvents.lastTriggerDate = today;
  }
  // 拜访触发
  else if (state.npcEvents.lastVisitTrigger === friendId) {
    event = npcEvents.find(e => e.trigger === "visit");
    state.npcEvents.lastVisitTrigger = null;
  }
  // 点赞触发
  else if (state.npcEvents.lastLikeTrigger === friendId) {
    event = npcEvents.find(e => e.trigger === "like");
    state.npcEvents.lastLikeTrigger = null;
  }
  // 捐献触发
  else if (state.npcEvents.lastDonateTrigger === friendId) {
    event = npcEvents.find(e => e.trigger === "donate");
    state.npcEvents.lastDonateTrigger = null;
  }

  if (!event) return;

  // 执行奖励
  if (event.rewards) {
    Object.entries(event.rewards).forEach(([key, count]) => {
      if (key.startsWith('f_')) {
        addItem(state, key, count);
      } else {
        // 普通物品
        addItem(state, key, count);
      }
    });

    // 显示消息
    const message = event.message.replace('{count}', count);
    showToast(message, 'success');
    playSound('success');
  }

  return true;
}

// 获取NPC事件列表
export function getNpcEvents(state) {
  return npcEvents.filter(event => {
    // 根据当前状态过滤可触发的事件
    return state.npcEvents.unlocked.includes(event.id);
  });
}

// 初始化NPC事件系统
export function initNpcEvents(state) {
  if (!state.npcEvents) {
    state.npcEvents = {
      lastTriggerDate: "",
      lastVisitTrigger: null,
      lastLikeTrigger: null,
      lastDonateTrigger: null,
      unlocked: ["mayor_fruit", "baker_daily"] // 默认解锁的事件
    };
  }
  return state;
}