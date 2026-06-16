// 游戏常量配置

// 存储键
export const STORAGE_KEY = "neighbor-town-mvp-state-v2";

// 头像选项
export const avatars = ["🙂", "😊", "😄", "🤠", "🌻", "🍀", "⭐", "🐱", "🐶", "🧑"];

// 游戏配置参数
export const GAME_CONFIG = {
  farm: {
    defaultPlots: 6,
    maxPlots: 12,
  },
  home: {
    gridSize: { rows: 6, cols: 6 },
  },
  orders: {
    slots: 3,
    refreshCooldown: 300,
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
