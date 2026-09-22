// 许愿池配置
//
// 每天可以许一个愿：花一笔金币许下，第二天上线时按「心愿热度」结算运势。
// 热度 = 连续许愿天数，断一天归零 —— 这是个留存向的轻量玩法：
// 不需要额外操作，只在每天上线时多点一下，但连续签到的回报明显更高。
//
// 奖励分三档（小吉/中吉/超大吉），档位由运势决定，而运势主要看热度，
// 所以「天天来」本身就是在把奖励往高档推。
import { itemValue } from './itemValue.js';

export const wishes = [
  {
    id: 9001,
    name: "五谷丰登",
    icon: "🌾",
    cost: { coin: 100 },
    rewards: {
      low: { crop_1001: 6, crop_1006: 3, coin: 60 },
      mid: { crop_1003: 3, crop_1004: 2, diamond: 8, coin: 150 },
      high: { crop_1005: 2, crop_1010: 1, diamond: 30, lottery_ticket: 1, coin: 400 },
    },
  },
  {
    id: 9002,
    name: "财源广进",
    icon: "💰",
    cost: { coin: 200 },
    rewards: {
      low: { coin: 220 },
      mid: { coin: 480, diamond: 8 },
      high: { coin: 1300, diamond: 30 },
    },
  },
  {
    id: 9003,
    name: "邻里和睦",
    icon: "🤝",
    cost: { coin: 80 },
    rewards: {
      low: { friendPoint: 40 },
      mid: { friendPoint: 100, cloth: 3 },
      high: { friendPoint: 250, f_3007: 1 },
    },
  },
  {
    id: 9004,
    name: "匠人手艺",
    icon: "🔨",
    cost: { coin: 150 },
    rewards: {
      low: { wood: 12, stone: 10, coin: 80 },
      mid: { wood: 20, stone: 16, speed_ticket: 1, coin: 150 },
      high: { wood: 35, stone: 30, speed_ticket: 3, diamond: 15, coin: 300 },
    },
  },
];

// 热度上限：连续许愿这么多天，运势必进最高档
export const MAX_LUCK = 10;

// 每天可以刷新许愿选项的次数与价钱
export const WISH_REROLL_FREE = 1;
export const WISH_REROLL_COST = 30;

export function getWish(id) {
  return wishes.find((w) => w.id === id);
}

/** 一档奖励的参考总价值（界面展示用） */
export function wishTierValue(rewards) {
  return Object.entries(rewards || {}).reduce(
    (sum, [key, count]) => sum + itemValue(key) * count,
    0
  );
}
