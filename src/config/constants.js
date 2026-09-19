// 游戏常量配置

// 存储键
export const STORAGE_KEY = "neighbor-town-mvp-state-v2";

// 头像选项
export const avatars = ["🙂", "😊", "😄", "🤠", "🌻", "🍀", "⭐", "🐱", "🐶", "🧑"];

// 12 块农田的解锁等级：前 6 块开局就有，后面随升级逐步开放
export const PLOT_UNLOCK_LEVELS = [1, 1, 1, 1, 1, 1, 3, 5, 8, 12, 15, 18];

// 游戏配置参数
export const GAME_CONFIG = {
  farm: {
    defaultPlots: 6,
    // 基础 12 块之上还能扩建三档：15 / 18 / 21 块（对应 5x3 / 6x3 / 7x3 阵型）
    maxPlots: 21,
    basePlots: 12,
    expansions: [
      { plots: 15, coin: 2000, diamond: 20 },
      { plots: 18, coin: 8000, diamond: 50 },
      { plots: 21, coin: 20000, diamond: 100 },
    ],
  },
  home: {
    gridSize: { rows: 6, cols: 6 },
  },
  social: {
    // 好友帮浇：每天 3 次，每次给好友一块未熟地块拨快 5 分钟
    waterPerDay: 3,
    waterBoostSec: 300,
    waterMinLevel: 5,
    // 拜访连击：连续多天拜访任意好友，每天多给 1 友情点，封顶 5
    visitStreakBonusMax: 5,
  },
  orders: {
    slots: 3,
    refreshCooldown: 300,
    // 限时订单：每天可接一次，10 分钟内交付，奖励翻倍
    rushDurationSec: 600,
    rushMultiplier: 2,
    rushMinLevel: 5,
    // 连锁订单：连续完成同 type 订单，每连一层 +10% 金币，封顶 5 层
    chainBonusStep: 0.1,
    chainBonusMax: 5,
    // 预购：花 20 金币提前锁定明天第一个刷新位的订单
    reserveCost: 20,
  },
  limits: {
    maxLevel: 20,
    nicknameLength: [2, 12],
  },
  weather: {
    effects: {
      sunny: { growthRate: 1.0 },
      rainy: { growthRate: 1.2 },
      snowy: { growthRate: 0.5 },
      rainbow: { growthRate: 1.5, orderBonus: 2.0 },
    }
  }
};

// 初始资源配置
export const INITIAL_RESOURCES = {
  coin: 120,
  diamond: 30,
  wood: 80,
  stone: 40,
  cloth: 20,
};
