// 等级配置
export const levels = [
  { level: 1, needExp: 0, unlock: "小麦、基础农田、基础房间" },
  { level: 2, needExp: 30, unlock: "番茄" },
  { level: 3, needExp: 80, unlock: "木桌、木椅、小镇剧情" },
  { level: 4, needExp: 150, unlock: "草莓、许愿池" },
  { level: 5, needExp: 250, unlock: "好友拜访、小镇委托榜、邻居求助板、天赋树" },
  { level: 6, needExp: 400, unlock: "玉米、料理铺（田园沙拉）" },
  { level: 7, needExp: 600, unlock: "每日任务" },
  { level: 8, needExp: 850, unlock: "南瓜、后山矿洞、咖啡馆" },
  { level: 9, needExp: 1100, unlock: "向日葵、鱼缸、温室大棚" },
  { level: 10, needExp: 1500, unlock: "社区系统、加工坊、杂交工坊" },
  { level: 11, needExp: 1800, unlock: "葡萄" },
  { level: 12, needExp: 2200, unlock: "南瓜派配方、钢琴" },
  { level: 13, needExp: 2700, unlock: "宠物系统" },
  { level: 14, needExp: 3100, unlock: "花束配方、秋千椅" },
  { level: 15, needExp: 3600, unlock: "公共建筑建设" },
  { level: 16, needExp: 4200, unlock: "稀有订单" },
  { level: 18, needExp: 5000, unlock: "作物加工" },
  { level: 20, needExp: 7000, unlock: "满级奖励" },
];

// 等级查询辅助函数
export function getLevelFromExp(exp) {
  let currentLevel = 1;
  for (const lv of levels) {
    if (exp >= lv.needExp) {
      currentLevel = lv.level;
    } else {
      break;
    }
  }
  return currentLevel;
}

// 取下一个等级档位。
// 等级表是跳跃的（13 → 15 → 18 → 20），所以不能查 currentLevel + 1，
// 否则 Lv.13 会查不到 Lv.14 而被误判成满级。
export function getNextLevelInfo(currentLevel) {
  return levels.find((lv) => lv.level > currentLevel);
}
