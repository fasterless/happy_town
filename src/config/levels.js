// 等级配置
export const levels = [
  { level: 1, needExp: 0, unlock: "小麦、基础农田、基础房间" },
  { level: 2, needExp: 30, unlock: "番茄" },
  { level: 3, needExp: 80, unlock: "木桌、木椅" },
  { level: 4, needExp: 150, unlock: "草莓" },
  { level: 5, needExp: 250, unlock: "好友拜访" },
  { level: 6, needExp: 400, unlock: "玉米" },
  { level: 7, needExp: 600, unlock: "每日任务" },
  { level: 8, needExp: 850, unlock: "南瓜" },
  { level: 9, needExp: 1100, unlock: "基础商城" },
  { level: 10, needExp: 1500, unlock: "社区系统" },
  { level: 11, needExp: 1800, unlock: "成就系统" },
  { level: 12, needExp: 2200, unlock: "社区捐献" },
  { level: 13, needExp: 2700, unlock: "宠物系统" },
  { level: 15, needExp: 3500, unlock: "公共建筑建设" },
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

export function getNextLevelInfo(currentLevel) {
  return levels.find((lv) => lv.level === currentLevel + 1);
}
