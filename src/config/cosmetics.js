// 称号与头像框配置（第八轮 2/3）
//
// 纯展示向的收藏：达到条件就解锁，装备后显示在顶栏名字旁边。
// 没有数值加成，收集本身就是目的。
//
// unlock 的读法与剧情任务一致：
//   { stat, need }   —— state.analytics[stat] 达到 need
//   { level }        —— 玩家等级
//   { story }        —— 完成的剧情章节数
//   { achievements } —— 已解锁的成就数
//   { memories }     —— 听过的邻居回忆段数
//   { closeFriends } —— 达到「知心」的邻居人数

// 收藏解锁等级
export const COSMETICS_MIN_LEVEL = 4;

// 称号。装备后显示在顶栏昵称后面。
export const titles = [
  { id: "newcomer", name: "新居民", icon: "🌱", unlock: { level: 4 }, desc: "升到 4 级" },
  { id: "farmer", name: "田园好手", icon: "🌾", unlock: { stat: "harvest_crop", need: 50 }, desc: "收获 50 次" },
  { id: "angler", name: "湖畔常客", icon: "🎣", unlock: { stat: "fishing_cast", need: 30 }, desc: "钓鱼 30 次" },
  { id: "miner", name: "矿脉行家", icon: "⛏️", unlock: { stat: "mine_dig", need: 30 }, desc: "下矿 30 次" },
  { id: "host", name: "好客主人", icon: "☕", unlock: { stat: "cafe_serve", need: 10 }, desc: "招待 10 位客人" },
  { id: "storyteller", name: "小镇说书人", icon: "📖", unlock: { story: 7 }, desc: "完成全部剧情" },
  { id: "legend", name: "邻里传说", icon: "🏆", unlock: { achievements: 30 }, desc: "解锁 30 项成就" },
  { id: "listener", name: "邻里知音", icon: "💛", unlock: { memories: 5 }, desc: "听过 5 段邻居回忆" },
  { id: "confidant", name: "知心好友", icon: "🤝", unlock: { closeFriends: 1 }, desc: "与 1 位邻居成为知心" },
];

// 头像框。装备后包在顶栏头像外面。
export const frames = [
  { id: "plain", name: "素框", icon: "⬜", css: "frame-plain", unlock: { level: 4 }, desc: "升到 4 级" },
  { id: "leaf", name: "藤叶框", icon: "🍃", css: "frame-leaf", unlock: { stat: "plant_crop", need: 20 }, desc: "种植 20 次" },
  { id: "wave", name: "波纹框", icon: "💧", css: "frame-wave", unlock: { stat: "fishing_cast", need: 10 }, desc: "钓鱼 10 次" },
  { id: "ore", name: "矿石框", icon: "🪨", css: "frame-ore", unlock: { stat: "mine_dig", need: 10 }, desc: "下矿 10 次" },
  { id: "bloom", name: "繁花框", icon: "🌸", css: "frame-bloom", unlock: { story: 3 }, desc: "完成 3 章剧情" },
  { id: "gold", name: "金穗框", icon: "✨", css: "frame-gold", unlock: { stat: "gold_crop", need: 5 }, desc: "收获 5 株金穗" },
  { id: "bond", name: "知心框", icon: "💛", css: "frame-bond", unlock: { closeFriends: 3 }, desc: "与 3 位邻居成为知心" },
];

/** 取一个称号的配置 */
export function getTitle(id) {
  return titles.find((item) => item.id === id);
}

/** 取一个头像框的配置 */
export function getFrame(id) {
  return frames.find((item) => item.id === id);
}
