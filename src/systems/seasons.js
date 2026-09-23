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

export function ensureFestivalBaseline(state, event, date = new Date()) {
  if (!event?.tasks?.length) return null;
  if (!state.seasons.festivals || typeof state.seasons.festivals !== "object") state.seasons.festivals = {};
  const period = `${event.id}:${date.getFullYear()}`;
  if (!state.seasons.festivals[period]) state.seasons.festivals[period] = { baseline: {}, claimed: [] };
  const record = state.seasons.festivals[period];
  if (!record.baseline || typeof record.baseline !== "object") record.baseline = {};
  if (!Array.isArray(record.claimed)) record.claimed = [];
  event.tasks.forEach((task) => {
    if (!(task.id in record.baseline)) record.baseline[task.id] = state.analytics?.[task.stat] || 0;
  });
  return record;
}

export function getFestivalTasks(state, event) {
  const record = ensureFestivalBaseline(state, event) || { baseline: {}, claimed: [] };
  return (event.tasks || []).map((task) => {
    const current = state.analytics?.[task.stat] || 0;
    const progress = Math.max(0, current - (Number(record.baseline?.[task.id]) || 0));
    return { ...task, progress: Math.min(progress, task.target), done: progress >= task.target, claimed: record.claimed.includes(task.id) };
  });
}

export function claimFestivalTask(state, eventId, taskId) {
  const event = seasonalEvents.find((item) => item.id === eventId);
  if (!event || getCurrentSeasonalEvent()?.id !== eventId) return { success: false, message: "当前没有这场庆典" };
  const record = ensureFestivalBaseline(state, event);
  const row = getFestivalTasks(state, event).find((task) => task.id === taskId);
  if (!row) return { success: false, message: "没有这项庆典任务" };
  if (row.claimed) return { success: false, message: "这项心意已经领过了" };
  if (!row.done) return { success: false, message: `还差 ${row.target - row.progress} 次` };
  addRewards(state, row.rewards);
  addRewards(state, { [event.token]: 1 });
  record.claimed.push(taskId);
  logEvent(state, "festival_task");
  return { success: true, message: `完成庆典任务「${row.name}」，获得${formatRewards(row.rewards)}和${event.tokenIcon}${event.tokenName}`, state };
}

export function getFestivalHistory(state, event, date = new Date()) {
  const current = `${event.id}:${date.getFullYear()}`;
  const records = Object.entries(state.seasons.festivals || {})
    .filter(([period]) => period.startsWith(`${event.id}:`) && period !== current)
    .map(([period, record]) => ({ year: Number(period.split(':')[1]), completed: Array.isArray(record.claimed) ? record.claimed.length : 0 }))
    .filter((item) => item.completed > 0)
    .sort((a, b) => b.year - a.year);
  return { years: records, rewardClaimed: isFestivalRewardClaimed(state, event.id) };
}

export function getFestivalTokenCount(state, event) {
  return state.inventory?.[event.token] || 0;
}

export function isFestivalRewardClaimed(state, eventId) {
  return Array.isArray(state.seasons.festivalRewards) && state.seasons.festivalRewards.includes(eventId);
}

export function claimFestivalReward(state, eventId) {
  const event = seasonalEvents.find((item) => item.id === eventId);
  if (!event) return { success: false, message: "没有这场庆典" };
  if (getCurrentSeasonalEvent()?.id !== eventId) return { success: false, message: "等庆典返场时再兑换" };
  if (isFestivalRewardClaimed(state, eventId)) return { success: false, message: "这份收藏已经兑换过了" };
  if (getFestivalTokenCount(state, event) < 3) return { success: false, message: `还需要 ${3 - getFestivalTokenCount(state, event)} 枚${event.tokenName}` };
  if (!Array.isArray(state.seasons.festivalRewards)) state.seasons.festivalRewards = [];
  state.inventory[event.token] -= 3;
  state.seasons.festivalRewards.push(eventId);
  logEvent(state, "festival_reward");
  return { success: true, message: `兑换了${event.rewardItem.icon}${event.rewardItem.name}，已收入庆典收藏`, state };
}
