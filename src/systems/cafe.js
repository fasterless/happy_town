// 咖啡馆系统（第七轮 3/3）
//
// 每天开门时来一批客人，每人点一道菜（从玩家当前等级做得出的料理里抽）。
// 端上菜：扣背包里的一份料理，拿金币，客人按概率留小费。
// 一天的客人是固定的，端完就没了，明天再来新的一批。
import { dishes } from '../config/dishes.js';
import {
  CAFE_MIN_LEVEL, CAFE_GUESTS_PER_DAY, cafeGuests, getCafePrice,
} from '../config/cafe.js';
import { spendItem, hasEnough, addItem } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';

/**
 * 咖啡馆是否解锁
 */
export function isCafeUnlocked(state) {
  return state.wallet.level >= CAFE_MIN_LEVEL;
}

/**
 * 今天的客人名单（日期变了就重新接待一批）
 * @returns {Array} [{ guestId, dishId, served }]
 */
export function getTodayGuests(state) {
  const cafe = state.cafe;
  if (cafe.date !== todayKey()) {
    cafe.date = todayKey();
    cafe.guests = rollGuests(state);
  }
  return cafe.guests;
}

/**
 * 抽今天的客人：每人点一道当前等级做得出的菜，客人不重复
 */
function rollGuests(state) {
  const pool = dishes.filter((dish) => dish.unlockLevel <= state.wallet.level);
  if (!pool.length) return [];

  const guests = [...cafeGuests];
  for (let i = guests.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [guests[i], guests[j]] = [guests[j], guests[i]];
  }

  return guests.slice(0, CAFE_GUESTS_PER_DAY).map((guest) => ({
    guestId: guest.id,
    dishId: pool[Math.floor(Math.random() * pool.length)].id,
    served: false,
  }));
}

/**
 * 给一位客人上菜
 * @param {number} index - 客人在今日名单里的位置
 * @returns {Object} { success, message, state }
 */
export function serveGuest(state, index) {
  if (!isCafeUnlocked(state)) {
    return { success: false, message: `Lv.${CAFE_MIN_LEVEL} 解锁咖啡馆` };
  }

  const guests = getTodayGuests(state);
  const order = guests[index];
  if (!order) return { success: false, message: '没有这位客人' };
  if (order.served) return { success: false, message: '这位客人已经吃上了' };

  const dish = dishes.find((item) => item.id === order.dishId);
  if (!dish) return { success: false, message: '客人点的菜下架了' };

  const dishKey = `dish_${dish.id}`;
  if (!hasEnough(state, dishKey, 1)) {
    return { success: false, message: `还没做好${dish.name}，先去料理铺做一份` };
  }

  spendItem(state, dishKey, 1);
  order.served = true;

  const price = getCafePrice(dish);
  addItem(state, 'coin', price);

  // 小费：客人高兴了就多给一笔
  const guest = cafeGuests.find((item) => item.id === order.guestId);
  let tip = 0;
  if (guest && Math.random() < guest.tipChance) {
    tip = guest.tipCoin;
    addItem(state, 'coin', tip);
    state.cafe.totalTips = (state.cafe.totalTips || 0) + 1;
    logEvent(state, 'cafe_tip');
  }

  state.cafe.totalServed = (state.cafe.totalServed || 0) + 1;
  logEvent(state, 'cafe_serve');
  trackDaily(state, 'cafe', 1);

  const tipText = tip ? `，还留了🪙${tip}小费` : '';
  return {
    success: true,
    message: `${guest.icon}${guest.name}吃完了${dish.icon}${dish.name}，付了🪙${price}${tipText}`,
    state,
  };
}

/**
 * 今天还有几位客人没招待
 */
export function getGuestsWaiting(state) {
  return getTodayGuests(state).filter((order) => !order.served).length;
}

export { CAFE_MIN_LEVEL, cafeGuests, getCafePrice };
