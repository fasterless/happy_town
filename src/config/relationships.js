// 邻居关系配置
//
// 关系进度是每位邻居独立累计的熟悉度。拜访、回应求助和帮浇都能推进，
// 达到阶段后奖励只发一次，不会因为重复互动回退或重复领取。
export const relationshipTiers = [
  { id: "acquainted", name: "相识", points: 3, rewards: { coin: 80 } },
  { id: "familiar", name: "熟识", points: 8, rewards: { friendPoint: 30, diamond: 5 } },
  { id: "close", name: "知心", points: 16, rewards: { diamond: 15, coin: 300 } },
];

export const relationshipActions = {
  visit: 1,
  help: 2,
  water: 1,
};
