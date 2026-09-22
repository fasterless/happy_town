// 小镇委托榜配置
//
// 和「订单」的区别：订单是常驻的 3 个槽位，委托榜是每天刷新的 5 个高额单子，
// 每种只能做一次，报酬按「需求物品价值 × 加成系数」算，所以后期委托单
// 明显比普通订单划算 —— 但它一天只来一次，是给成熟账号的每日目标。
//
// 报酬公式：coin = round(需求价值 × payFactor) + fixedCoin
//   payFactor 1.6 ~ 2.2（委托单比直接卖货贵 60%~120%，但会吃掉你的作物）
import { requiresValue } from './itemValue.js';

export const commissionJobs = [
  {
    id: 8001,
    name: "校车早餐铺",
    icon: "🚌",
    unlockLevel: 5,
    payFactor: 1.6,
    fixedCoin: 40,
    requires: [{ item: "goods_5001", count: 2 }, { item: "crop_1002", count: 3 }],
  },
  {
    id: 8002,
    name: "花艺工作室",
    icon: "💐",
    unlockLevel: 7,
    payFactor: 1.8,
    fixedCoin: 80,
    requires: [{ item: "crop_1008", count: 4 }, { item: "crop_1003", count: 3 }],
  },
  {
    id: 8003,
    name: "湖边烧烤摊",
    icon: "🏕️",
    unlockLevel: 9,
    payFactor: 1.9,
    fixedCoin: 120,
    requires: [{ item: "fish_1", count: 4 }, { item: "crop_1004", count: 2 }],
  },
  {
    id: 8004,
    name: "面包师年度大单",
    icon: "🥖",
    unlockLevel: 11,
    payFactor: 2.0,
    fixedCoin: 200,
    requires: [{ item: "goods_5001", count: 4 }, { item: "goods_5002", count: 2 }, { item: "crop_1006", count: 4 }],
  },
  {
    id: 8005,
    name: "镇长家宴备料",
    icon: "🎊",
    unlockLevel: 13,
    payFactor: 2.1,
    fixedCoin: 300,
    requires: [{ item: "goods_5005", count: 1 }, { item: "goods_5007", count: 2 }, { item: "crop_1005", count: 2 }],
  },
  {
    id: 8006,
    name: "剧团巡演便当",
    icon: "🎭",
    unlockLevel: 15,
    payFactor: 2.2,
    fixedCoin: 400,
    requires: [{ item: "goods_5004", count: 3 }, { item: "goods_5008", count: 1 }, { item: "egg", count: 4 }],
  },
];

// 委托榜每天刷新几个
export const COMMISSION_SLOTS = 4;

export function getCommissionJob(id) {
  return commissionJobs.find((j) => j.id === id);
}

/** 某个委托的基准报酬（不含天气/宠物加成） */
export function getCommissionCoin(job) {
  return Math.round(requiresValue(job.requires) * job.payFactor) + job.fixedCoin;
}

/** 某个委托的经验报酬（跟着需求物品数量走） */
export function getCommissionExp(job) {
  const items = job.requires.reduce((sum, r) => sum + r.count, 0);
  return 12 + items * 4;
}
