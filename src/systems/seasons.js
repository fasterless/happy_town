// 季节活动系统
import { seasonalEvents, getCurrentSeasonalEvent } from '../config/seasons.js';
import { addRewards } from '../core/inventory.js';
import { formatRewards } from '../utils/format.js';
import { logEvent } from '../utils/analytics.js';

/**
 * 全部季节活动（渲染用），附带当前状态
 */
export function getSeasonalEvents(state) {
  return seasonalEvents.map((event) => ({
    ...event,
    status: getEventStatus(state, event),
  }));
}

function getEventStatus(state, event) {
  if (getCurrentSeasonalEvent()?.id !== event.id) {
    return "inactive";
  }
  return state.seasons.claimedEventId === event.id ? "claimed" : "active";
}

/**
 * 领取当前季节活动的礼物
 */
export function claimSeasonalReward(state, eventId) {
  const event = seasonalEvents.find((e) => e.id === eventId);
  if (!event) return { success: false, message: "活动不存在" };

  if (getCurrentSeasonalEvent()?.id !== eventId) {
    return { success: false, message: "该活动当前未开放" };
  }

  if (state.seasons.claimedEventId === eventId) {
    return { success: false, message: "本次活动的礼物已经领过了" };
  }

  addRewards(state, event.rewards);
  state.seasons.claimedEventId = eventId;

  logEvent(state, "seasonal_claim");

  return {
    success: true,
    message: `领到了「${event.name}」的礼物：${formatRewards(event.rewards)}`,
    state,
  };
}
