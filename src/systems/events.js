// 邻居日常事件系统
//
// 拜访好友时随机触发邻居的回礼彩蛋（每天每位邻居最多一次），
// 让「拜访」这个动作在拿满每日任务进度之后仍有惊喜。
import { addItem } from '../core/inventory.js';
import { todayKey } from '../utils/time.js';
import { getItemName, getItemIcon } from '../utils/format.js';
import { logEvent } from '../utils/analytics.js';

// 触发概率
const TRIGGER_CHANCE = 0.35;

// 每位邻居的回礼池（权重随机）
export const neighborGifts = [
  { id: "mayor", npc: "npc_mayor", rewards: [{ key: "coin", count: 25, weight: 1 }], lines: ["镇长塞给你一把糖果：拿去，年轻人！" ] },
  { id: "baker", npc: "npc_baker", rewards: [{ key: "goods_5001", count: 1, weight: 1 }], lines: ["面包师从烤箱里拿出一块刚出炉的面包递给你。"] },
  { id: "florist", npc: "npc_florist", rewards: [{ key: "crop_1003", count: 2, weight: 1 }], lines: ["阿梨剪下两颗草莓：尝尝今年第一批！"] },
  { id: "carpenter", npc: "npc_carpenter", rewards: [{ key: "wood", count: 6, weight: 1 }], lines: ["阿川把边角料装进你的口袋：留着总有用。"] },
  { id: "barista", npc: "npc_barista", rewards: [{ key: "speed_ticket", count: 1, weight: 1 }], lines: ["小敏隔着柜台晃了晃瓶子：这瓶能让作物快点长大。"] },
];

/**
 * 初始化邻居事件状态（normalizeState 里调用）
 */
export function initNeighborEvents(state) {
  if (!state.npcEvents || typeof state.npcEvents !== "object") {
    state.npcEvents = {};
  }
  if (typeof state.npcEvents.claimedToday !== "object" || state.npcEvents.claimedToday === null) {
    state.npcEvents.claimedToday = {};
  }
  return state;
}

/**
 * 今天是否已领过该邻居的回礼
 */
export function hasClaimedToday(state, friendId) {
  const record = state.npcEvents.claimedToday[friendId];
  return record === todayKey();
}

/**
 * 拜访后尝试触发邻居回礼
 * @returns {Object|null} 触发了的事件（null = 本次没有彩蛋）
 */
export function tryNeighborGift(state, friendId) {
  initNeighborEvents(state);

  const gift = neighborGifts.find((g) => g.npc === friendId);
  if (!gift) return null;
  if (hasClaimedToday(state, friendId)) return null;
  if (Math.random() > TRIGGER_CHANCE) return null;

  const reward = pickReward(gift.rewards);
  addItem(state, reward.key, reward.count);

  state.npcEvents.claimedToday[friendId] = todayKey();
  logEvent(state, "neighbor_gift");

  return {
    npc: gift.npc,
    line: gift.lines[Math.floor(Math.random() * gift.lines.length)],
    rewardText: `${getItemIcon(reward.key)} ${getItemName(reward.key)}×${reward.count}`,
  };
}

function pickReward(rewards) {
  const total = rewards.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const reward of rewards) {
    roll -= reward.weight;
    if (roll <= 0) return reward;
  }
  return rewards[rewards.length - 1];
}
