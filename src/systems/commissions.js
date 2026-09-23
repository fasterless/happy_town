// 小镇委托榜系统
//
// 每天刷新一批高额委托单，每种一天只能做一次。与订单系统的分工：
//   订单 = 常驻 3 槽、可免费换单、随等级轮换 → 金币的基础来源
//   委托 = 每日限量、报酬高、需求复杂（常要加工成品/鱼获/畜产）→ 每日目标
//
// 结算规则：
//   - 报酬 = round(需求价值 × payFactor) + fixedCoin，再吃天气/宠物/料理加成
//   - 每天刷新 slots 个，已完成的当天不再出现
//   - 换一批要花钱（和订单的免费换单区分：委托本身更值钱，换单有成本）
import {
  commissionJobs, getCommissionJob, COMMISSION_SLOTS, getCommissionCoin, getCommissionExp,
} from '../config/commissions.js';
import { addItem, spendItem, hasEnough, getCount } from '../core/inventory.js';
import { logEvent, trackDaily } from '../utils/analytics.js';
import { todayKey } from '../utils/time.js';
import { emit, Events } from '../core/events.js';
import { applyWeatherToReward } from './weather.js';
import { applyPetToOrderReward } from './pets.js';
import { getBuffMultiplier } from './dishes.js';
import { getCharmMultiplier } from './charms.js';

// 换一批委托的价钱
export const REROLL_COST = 50;

/**
 * 委托榜是否解锁（跟着第一张委托的解锁等级走）
 */
export function isCommissionUnlocked(state) {
  return state.wallet.level >= commissionJobs[0].unlockLevel;
}

/**
 * 当前等级可见的委托池
 */
export function getAvailableJobs(state) {
  return commissionJobs.filter((j) => j.unlockLevel <= state.wallet.level);
}

/**
 * 今日委托榜（日期变了就重新抽）
 * @returns {number[]} 委托 id 列表
 */
export function getTodayJobs(state) {
  const board = state.commissions;
  if (board.date !== todayKey()) {
    board.date = todayKey();
    board.doneIds = [];
    board.jobIds = rollJobs(state);
  }
  return board.jobIds;
}

function rollJobs(state) {
  const pool = getAvailableJobs(state);
  if (!pool.length) return [];
  // 洗牌后取前 N 个，保证同一天内不重复
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled
    .slice(0, Math.min(COMMISSION_SLOTS, shuffled.length))
    .map((j) => j.id);
}

/**
 * 换一批今日委托
 */
export function rerollCommissions(state) {
  if (!isCommissionUnlocked(state)) {
    return { success: false, message: '等级不足，还没有委托榜' };
  }
  if (!hasEnough(state, 'coin', REROLL_COST)) {
    return { success: false, message: `换一批需要🪙${REROLL_COST}` };
  }

  spendItem(state, 'coin', REROLL_COST);
  const board = state.commissions;
  board.date = todayKey();
  board.jobIds = rollJobs(state);

  logEvent(state, 'commission_reroll');
  emit(Events.COMMISSION_REROLLED, {});

  return { success: true, message: '委托榜已刷新，看看今天有什么活', state };
}

/**
 * 某委托今天是否已完成
 */
export function isCommissionDone(state, jobId) {
  return state.commissions.doneIds.includes(jobId);
}

/**
 * 某委托当前材料是否齐备（且今天没交过）
 */
export function canCompleteCommission(state, jobId) {
  const job = getCommissionJob(jobId);
  if (!job) return false;
  if (state.wallet.level < job.unlockLevel) return false;
  if (isCommissionDone(state, jobId)) return false;
  return job.requires.every((req) => hasEnough(state, req.item, req.count));
}

/**
 * 完成一个委托：扣材料，按报酬公式发金币和经验
 */
export function completeCommission(state, jobId) {
  const job = getCommissionJob(jobId);
  if (!job) {
    return { success: false, message: '委托不存在' };
  }
  if (state.wallet.level < job.unlockLevel) {
    return { success: false, message: `需要Lv.${job.unlockLevel}` };
  }
  if (isCommissionDone(state, jobId)) {
    return { success: false, message: '这个委托今天已经交过了' };
  }
  for (const req of job.requires) {
    if (!hasEnough(state, req.item, req.count)) {
      return { success: false, message: '材料不足' };
    }
  }

  job.requires.forEach((req) => spendItem(state, req.item, req.count));

  // 报酬：基准 × 天气 × 宠物 × 料理加成 × 护符加成
  const base = getCommissionCoin(job);
  const coin = Math.round(
    applyPetToOrderReward(applyWeatherToReward(base, state), state)
    * getBuffMultiplier(state, 'orderBonus')
    * getCharmMultiplier(state, 'orderBonus')
  );
  const exp = Math.round(getCommissionExp(job) * getBuffMultiplier(state, 'expBonus'));

  addItem(state, 'coin', coin);
  addItem(state, 'exp', exp);

  state.commissions.doneIds.push(jobId);
  logEvent(state, 'commission_complete');
  trackDaily(state, 'commission', 1);
  emit(Events.COMMISSION_COMPLETED, { jobId });

  const hint = coin > base ? `（含加成，原 🪙${base}）` : '';
  return {
    success: true,
    message: `完成委托「${job.name}」，获得🪙${coin}和${exp}经验${hint}`,
    state,
  };
}

/**
 * 委托榜面板数据（渲染用）
 */
export function getCommissionBoard(state) {
  if (!isCommissionUnlocked(state)) return [];

  return getTodayJobs(state)
    .map((jobId) => {
      const job = getCommissionJob(jobId);
      if (!job) return null;
      return {
        job,
        done: isCommissionDone(state, jobId),
        canDo: canCompleteCommission(state, jobId),
        coin: getCommissionCoin(job),
        exp: getCommissionExp(job),
        requires: job.requires.map((req) => ({
          ...req,
          owned: getCount(state, req.item),
        })),
      };
    })
    .filter(Boolean);
}
