// 邻居求助板系统
//
// 玩法：每天有 3 位邻居张榜求购一样东西，玩家送过去拿友情点和「人情」。
// 同一位邻居帮到 FAVOR_FOR_BONUS 次后，他的人情满格，当天之后他对你的
// 回礼必定触发（回礼本身在 systems/events.js，读 isFavorFull）。
//
// 设计意图：好友系统原本只有「拜访/点赞/帮浇」三个按钮，点完就没了。
// 求助板给每个邻居一条持续的支线 —— 你今天送他一篮小麦，
// 他的 mood 会变热络，回礼也更好。这让「社交」从每日打卡变成有来有回。
import { HELP_SLOTS, HELP_REROLL_COST, getRequestableItems, getHelpReward, FAVOR_FOR_BONUS } from '../config/helpBoard.js';
import { spendItem, hasEnough, addItem, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';
import { emit, Events } from '../core/events.js';
import { getBuffMultiplier } from './dishes.js';

/**
 * 求助板是否解锁（跟着好友系统走，Lv.5）
 */
export function isHelpUnlocked(state) {
  return state.wallet.level >= 5;
}

/**
 * 今日求助榜（日期变了重抽）
 * @returns {Array<{friendId, item, name, icon, count, point}>}
 */
export function getTodayRequests(state) {
  const board = state.help;
  if (board.date !== todayKey()) {
    board.date = todayKey();
    board.requests = rollRequests(state);
  }
  return board.requests;
}

function rollRequests(state) {
  const friends = state.friends.filter((f) => f.isFriend);
  if (!friends.length) return [];

  const pool = getRequestableItems(state);
  if (!pool.length) return [];

  // 洗牌好友，避免总是同一批人上榜
  const shuffledFriends = [...friends];
  for (let i = shuffledFriends.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledFriends[i], shuffledFriends[j]] = [shuffledFriends[j], shuffledFriends[i]];
  }

  // 物品总权重，循环复用
  const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);

  const slots = Math.min(HELP_SLOTS, shuffledFriends.length);
  const requests = [];
  for (let i = 0; i < slots; i++) {
    // 按权重抽一样物品（成品/畜产比作物稀有，权重低但给得多）
    let roll = Math.random() * totalWeight;
    let picked = pool[0];
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll <= 0) {
        picked = entry;
        break;
      }
    }

    // 数量：成品/畜产 1-2 个，作物 3-6 个
    const isRaw = picked.weight >= 3;
    const count = isRaw ? 3 + Math.floor(Math.random() * 4) : 1 + Math.floor(Math.random() * 2);

    requests.push({
      friendId: shuffledFriends[i].id,
      item: picked.item,
      name: picked.name,
      icon: picked.icon,
      count,
      point: getHelpReward(state, picked, count),
    });
  }

  return requests;
}

/**
 * 换一批求助
 */
export function rerollRequests(state) {
  if (!isHelpUnlocked(state)) {
    return { success: false, message: 'Lv.5 解锁邻居求助板' };
  }
  if (!hasEnough(state, 'coin', HELP_REROLL_COST)) {
    return { success: false, message: `换一批需要🪙${HELP_REROLL_COST}` };
  }

  spendItem(state, 'coin', HELP_REROLL_COST);
  const board = state.help;
  board.date = todayKey();
  board.requests = rollRequests(state);

  logEvent(state, 'help_reroll');
  emit(Events.HELP_REROLLED, {});

  return { success: true, message: '邻居们换了新需求', state };
}

/**
 * 某位邻居今天的人情是否已满（满格后拜访必定触发回礼）
 */
export function isFavorFull(state, friendId) {
  const record = state.help?.favors?.[friendId];
  return !!record && record.count >= FAVOR_FOR_BONUS && record.date === todayKey();
}

/**
 * 送东西给邻居：扣物品、给友情点、攒人情
 */
export function fulfillRequest(state, index) {
  const requests = getTodayRequests(state);
  const request = requests[index];
  if (!request) {
    return { success: false, message: '没有这个求助' };
  }

  const friend = state.friends.find((f) => f.id === request.friendId);
  if (!friend) {
    return { success: false, message: '这位邻居不在镇上了' };
  }

  const today = todayKey();
  if (state.help.doneIds[`${request.friendId}`] === today) {
    return { success: false, message: `今天已经帮过${friend.name}了` };
  }
  if (!hasEnough(state, request.item, request.count)) {
    return { success: false, message: `${request.name}不够，还差 ${request.count - getCount(state, request.item)} 个` };
  }

  spendItem(state, request.item, request.count);

  // 人情计数（按日，跨天清零）
  if (!state.help.favors[friend.id] || state.help.favors[friend.id].date !== today) {
    state.help.favors[friend.id] = { date: today, count: 0 };
  }
  state.help.favors[friend.id].count += 1;

  const full = isFavorFull(state, friend.id);
  if (full) logEvent(state, 'favor_full');

  // 友情点吃宠物与料理加成（和拜访/点赞同一条通道）
  const point = Math.floor(request.point * getBuffMultiplier(state, 'friendPointBonus'));
  addItem(state, 'friendPoint', point);

  state.help.doneIds[friend.id] = today;
  logEvent(state, 'help_fulfill');
  trackDaily(state, 'help', 1);
  emit(Events.HELP_FULFILLED, { friendId: friend.id, point });

  const fullText = full ? '，他把你们当自己人了 🤝' : '';
  return {
    success: true,
    message: `给${friend.name}送了${request.count}个${request.icon}${request.name}，获得${point}友情点${fullText}`,
    state,
  };
}

/**
 * 求助榜面板数据（渲染用）
 */
export function getHelpBoard(state) {
  if (!isHelpUnlocked(state)) return [];

  return getTodayRequests(state).map((request, index) => {
    const friend = state.friends.find((f) => f.id === request.friendId);
    const owned = getCount(state, request.item);
    const done = state.help.doneIds[request.friendId] === todayKey();
    return {
      index,
      request,
      friend,
      owned,
      done,
      canDo: !done && owned >= request.count,
      favor: state.help.favors[request.friendId]?.count || 0,
    };
  });
}
