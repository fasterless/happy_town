// 小镇剧情配置（第八轮 1/3）
//
// 一条线性的主线：每章由镇上的一位居民委托，章节里是几个小任务，
// 做的都是游戏里本来就会做的事（种地、收获、钓鱼、下矿、做菜、招待客人）。
// 任务按顺序完成，一章做完发奖励并解锁下一章。
//
// 任务进度不单独存：check 直接读 state 里已有的计数（analytics、钱包、
// 地块、各系统的累计字段），所以老玩家读档时已经做过的事会直接算进去。

// 剧情解锁等级
export const STORY_MIN_LEVEL = 3;
export const storyEndings = [
  { id: "lantern", name: "灯火镇口", icon: "🏮", line: "镇口每晚亮起一盏灯，晚归的人都能找到路。" },
  { id: "garden", name: "花满广场", icon: "🌸", line: "广场换上花坛，季节过去，花也会再开。" },
  { id: "station", name: "车站新钟", icon: "🔔", line: "旧车站挂上新钟，它只为迎接回来的人敲响。" },
];

// check 的几种读法：
//   { stat }            —— state.analytics[stat] 的累计次数
//   { wallet }          —— state.wallet[wallet]，如金币、等级
//   { count }           —— 背包里某个物品的持有数
//   { planted }         —— 种过的作物种类数
//   { greenhouse }      —— 温室累计种植次数
//   { served }          —— 咖啡馆累计招待客人数
//   { charms }          —— 已做成的护符数
//   { talents }         —— 已点亮的天赋数
//   { explore }         —— 已发现的探索物数量
//   { festivalRewards } —— 已兑换的庆典收藏数量
export const storyChapters = [
  {
    id: "ch1",
    title: "安顿下来",
    npc: "林镇长",
    icon: "👴",
    intro: "镇长在路口等你：新来的居民，先把田地安顿好吧。",
    tasks: [
      { id: "ch1_plant", text: "种下 3 株作物", check: { stat: "plant_crop", need: 3 } },
      { id: "ch1_harvest", text: "收获 3 次", check: { stat: "harvest_crop", need: 3 } },
      { id: "ch1_coin", text: "攒到 200 金币", check: { wallet: "coin", need: 200 } },
    ],
    reward: { coin: 300, exp: 30 },
  },
  {
    id: "ch2",
    title: "认识邻居",
    npc: "麦香面包师",
    icon: "🧑‍🍳",
    intro: "面包师探过头来：镇上的人都好相处，去串个门吧。",
    tasks: [
      { id: "ch2_visit", text: "拜访邻居 2 次", check: { stat: "friend_visit", need: 2 } },
      { id: "ch2_order", text: "完成 2 个订单", check: { stat: "order_complete", need: 2 } },
      { id: "ch2_crops", text: "种过 3 种不同的作物", check: { planted: true, need: 3 } },
    ],
    reward: { coin: 400, friendPoint: 30 },
  },
  {
    id: "ch3",
    title: "湖边的邀请",
    npc: "湖边老周",
    icon: "🎣",
    intro: "老周在码头招手：湖里的鱼今天咬钩，来试试。",
    tasks: [
      { id: "ch3_fish", text: "钓鱼 5 次", check: { stat: "fishing_cast", need: 5 } },
      { id: "ch3_level", text: "升到 8 级", check: { wallet: "level", need: 8 } },
    ],
    reward: { coin: 500, diamond: 10 },
  },
  {
    id: "ch4",
    title: "后山来信",
    npc: "矿洞阿石",
    icon: "⛏️",
    intro: "阿石托人捎话：后山的矿脉开了，缺个帮手。",
    tasks: [
      { id: "ch4_dig", text: "下矿 5 次", check: { stat: "mine_dig", need: 5 } },
      { id: "ch4_upgrade", text: "升级一次镐子", check: { stat: "pickaxe_upgrade", need: 1 } },
    ],
    reward: { coin: 600, diamond: 15 },
  },
  {
    id: "ch5",
    title: "开张大吉",
    npc: "咖啡小敏",
    icon: "👩‍💼",
    intro: "小敏把咖啡馆的钥匙递过来：菜你来做，客人我来招呼。",
    tasks: [
      { id: "ch5_cook", text: "做 2 道料理", check: { stat: "dish_cook", need: 2 } },
      { id: "ch5_serve", text: "招待 3 位客人", check: { served: true, need: 3 } },
    ],
    reward: { coin: 800, diamond: 20 },
  },
  {
    id: "ch6",
    title: "玻璃房",
    npc: "花园阿梨",
    icon: "👩‍🌾",
    intro: "阿梨站在新搭的温室前：这里不看天气，想种什么就种什么。",
    tasks: [
      { id: "ch6_green", text: "在温室种 3 株作物", check: { greenhouse: true, need: 3 } },
      { id: "ch6_harvest", text: "累计收获 30 次", check: { stat: "harvest_crop", need: 30 } },
    ],
    reward: { coin: 1000, diamond: 25 },
  },
  {
    id: "ch7",
    title: "小镇的传说",
    npc: "林镇长",
    icon: "👴",
    intro: "镇长翻开一本旧笔记：传说集齐护符、悟透天赋的人，才算真正的镇民。",
    tasks: [
      { id: "ch7_charm", text: "做成 1 枚护符", check: { charms: true, need: 1 } },
      { id: "ch7_talent", text: "点亮 5 个天赋", check: { talents: true, need: 5 } },
      { id: "ch7_level", text: "升到 16 级", check: { wallet: "level", need: 16 } },
    ],
    reward: { coin: 2000, diamond: 50 },
  },

  {
    id: "s2ch1", title: "小镇之外", npc: "林镇长", icon: "🧭",
    intro: "镇长合上第一本笔记：真正认识小镇，也要走出镇口看看。",
    tasks: [ { id: "s2_explore", text: "探索周边 3 次", check: { stat: "explore_visit", need: 3 } }, { id: "s2_find", text: "发现 3 种探索物", check: { explore: true, need: 3 } } ],
    reward: { coin: 1200, diamond: 20 },
  },
  {
    id: "s2ch2", title: "带回小镇的东西", npc: "麦香面包师", icon: "🧺",
    intro: "面包师看着你的行囊：外面的东西，也能做成家里的味道。",
    tasks: [ { id: "s2_dish", text: "做出松脂茶", check: { stat: "dish_cook", need: 1 } }, { id: "s2_commission", text: "完成 1 个委托", check: { stat: "commission_complete", need: 1 } } ],
    reward: { coin: 1500, diamond: 25 },
  },
  {
    id: "s2ch3", title: "四季还会回来", npc: "花园阿梨", icon: "🎊",
    intro: "阿梨把去年的花瓣夹进本子：庆典过去了，心意还会留下。",
    tasks: [ { id: "s2_festival_task", text: "完成 1 项庆典任务", check: { stat: "festival_task", need: 1 } }, { id: "s2_festival_reward", text: "兑换 1 份庆典收藏", check: { festivalRewards: true, need: 1 } } ],
    reward: { coin: 2500, diamond: 60 },
  },
];

/** 取一章的配置 */
export function getChapter(id) {
  return storyChapters.find((chapter) => chapter.id === id);
}
