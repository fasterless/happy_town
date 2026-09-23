import { EXPLORE_MIN_LEVEL, explorePlaces, getExplorePlace } from "../config/explore.js";
import { addRewards } from "../core/inventory.js";
import { logEvent } from "../utils/analytics.js";
import { todayKey } from "../utils/time.js";
import { formatRewards } from "../utils/format.js";
export function initExplore(state) {
  if (!state.explore || typeof state.explore !== "object") state.explore = { date: "", visited: [], found: [] };
  if (typeof state.explore.date !== "string") state.explore.date = "";
  if (!Array.isArray(state.explore.visited)) state.explore.visited = [];
  if (!Array.isArray(state.explore.found)) state.explore.found = [];
  if (state.explore.date !== todayKey()) { state.explore.date = todayKey(); state.explore.visited = []; }
  return state;
}
export function isExploreUnlocked(state) { return state.wallet.level >= EXPLORE_MIN_LEVEL; }
export function getExploreBoard(state) {
  initExplore(state);
  return explorePlaces.map((place) => ({ ...place, unlocked: state.wallet.level >= place.level, visited: state.explore.visited.includes(place.id), discovered: place.finds.filter((find) => state.explore.found.includes(find.id)).length, tales: place.tales.filter((_, index) => state.explore.found.includes(place.finds[index].id)) }));
}
export function explorePlace(state, placeId) {
  const place = getExplorePlace(placeId);
  if (!place) return { success: false, message: "没有这个地方" };
  if (state.wallet.level < place.level) return { success: false, message: `Lv.${place.level} 开放${place.name}` };
  initExplore(state);
  if (state.explore.visited.includes(place.id)) return { success: false, message: "今天已经来过这里了" };
  const rewards = {};
  place.finds.forEach((find) => {
    const rare = find.rare && Math.random() > 0.25;
    if (rare) return;
    rewards[find.id] = find.count;
    if (!state.explore.found.includes(find.id)) state.explore.found.push(find.id);
  });
  addRewards(state, rewards);
  state.explore.visited.push(place.id);
  logEvent(state, "explore_visit");
  return { success: true, message: `${place.story} 获得${formatRewards(rewards)}`, state };
}
