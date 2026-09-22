// 每日任务配置
// type 对应 utils/analytics.js 里 trackDaily 的键。
export const dailyTasks = [
  { id: "login", name: "登录游戏", type: "login", target: 1, active: 10, rewards: { diamond: 5 } },
  { id: "harvest", name: "收获作物 5 次", type: "harvest", target: 5, active: 20, rewards: { coin: 50, exp: 10 } },
  { id: "order", name: "完成订单 3 次", type: "order", target: 3, active: 20, rewards: { coin: 100, exp: 20 } },
  { id: "visit", name: "拜访好友 3 次", type: "visit", target: 3, active: 15, rewards: { friendPoint: 20 } },
  { id: "like", name: "点赞好友 3 次", type: "like", target: 3, active: 15, rewards: { friendPoint: 20 } },
  { id: "fishing", name: "湖畔钓鱼 3 次", type: "fishing", target: 3, active: 15, rewards: { coin: 40 } },
  { id: "craft", name: "完成加工 1 次", type: "craft", target: 1, active: 15, rewards: { coin: 60 } },
  { id: "donate", name: "捐献社区资源 1 次", type: "donate", target: 1, active: 10, rewards: { communityContribution: 30 } },
  { id: "buyFurniture", name: "购买家具 1 次", type: "buyFurniture", target: 1, active: 10, rewards: { coin: 50 } },
  { id: "commission", name: "完成小镇委托 1 次", type: "commission", target: 1, active: 20, rewards: { coin: 120, exp: 15 } },
  { id: "dish", name: "做 1 道料理并上菜", type: "dish", target: 1, active: 15, rewards: { coin: 80, exp: 10 } },
  { id: "wish", name: "在许愿池许一个愿", type: "wish", target: 1, active: 10, rewards: { diamond: 3 } },
  { id: "help", name: "回应 1 位邻居的求助", type: "help", target: 1, active: 15, rewards: { friendPoint: 25 } },
];

// 活跃度宝箱配置
export const activeBoxes = [
  { score: 20, rewards: { coin: 100 } },
  { score: 40, rewards: { friendPoint: 30 } },
  { score: 60, rewards: { diamond: 10 } },
  { score: 80, rewards: { wood: 5, cloth: 5 } },
  { score: 100, rewards: { lottery_ticket: 1 } },
  { score: 130, rewards: { lottery_ticket: 1, diamond: 15 } },
  { score: 160, rewards: { coin: 800, speed_ticket: 2 } },
  { score: 190, rewards: { diamond: 25, lottery_ticket: 2 } },
];
