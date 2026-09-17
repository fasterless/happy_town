// NPC 好友配置
// mood 是拜访时可能触发的彩蛋描述（systems/events.js 的回礼池与之一一对应）
export const defaultFriends = [
  { id: "npc_mayor", name: "林镇长", avatar: "🧓", mood: "正在修喷泉", likes: 18, isFriend: true },
  { id: "npc_baker", name: "麦香面包师", avatar: "👩‍🍳", mood: "想收一篮小麦", likes: 12, isFriend: true },
  { id: "npc_florist", name: "花园阿梨", avatar: "👩‍🌾", mood: "家里有新花瓶", likes: 9, isFriend: false },
  { id: "npc_carpenter", name: "木工阿川", avatar: "👨‍🔧", mood: "做了把新椅子", likes: 7, isFriend: false },
  { id: "npc_barista", name: "咖啡小敏", avatar: "👩‍💼", mood: "欢迎来喝咖啡", likes: 15, isFriend: false },
];

// 社区配置
export const fountainStages = [
  { stage: 1, label: "修整广场地基", target: 800, accepts: [{ item: "wood", label: "木材" }, { item: "crop_1001", label: "小麦" }], reward: { coin: 100 } },
  { stage: 2, label: "铺设喷泉石材", target: 600, accepts: [{ item: "stone", label: "石头" }, { item: "crop_1002", label: "番茄" }], reward: { friendPoint: 50 } },
  { stage: 3, label: "布置花坛水景", target: 1000, accepts: [{ item: "crop_1003", label: "草莓" }, { item: "coin", label: "金币" }], reward: { diamond: 20 } },
  { stage: 4, label: "安装社区标识", target: 1200, accepts: [{ item: "crop_1004", label: "玉米" }, { item: "communityContribution", label: "社区贡献" }], reward: { f_3008: 1 } },
  { stage: 5, label: "完成庆典喷泉", target: 1300, accepts: [{ item: "crop_1005", label: "南瓜" }, { item: "coin", label: "金币" }], reward: { diamond: 80, f_3007: 1 } },
];
