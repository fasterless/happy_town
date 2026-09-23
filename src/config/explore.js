export const EXPLORE_MIN_LEVEL = 6;
export const explorePlaces = [
  { id: "grove", name: "林间小路", icon: "🌲", level: 6, finds: [ { id: "twig", name: "青树枝", icon: "🌿", count: 2 }, { id: "resin", name: "松脂", icon: "🍯", count: 1, rare: true } ], story: "风吹过树梢，小路尽头有一丛新芽。", tales: ["青树枝指向一棵老松。", "松脂的香气里，藏着小路最初的名字。"] },
  { id: "shore", name: "湖岸浅滩", icon: "🌊", level: 8, finds: [ { id: "pebble", name: "圆卵石", icon: "🪨", count: 2 }, { id: "shell", name: "湖贝", icon: "🐚", count: 1, rare: true } ], story: "浅水退开时，岸边留下一圈干净的石头。", tales: ["圆卵石排成通向水面的脚印。", "湖贝张开时，里面映着旧车站的灯光。"] },
  { id: "station", name: "旧车站", icon: "🚉", level: 10, finds: [ { id: "ticket", name: "旧车票", icon: "🎫", count: 1 }, { id: "bell", name: "铜车站铃", icon: "🔔", count: 1, rare: true } ], story: "站台还留着暖意，像刚有人从这里经过。", tales: ["旧车票的日期，停在小镇迎接第一位旅客那天。", "铜车站铃再响一次，三位邻居的名字都在风里。"] },
];
export function getExplorePlace(id) { return explorePlaces.find((place) => place.id === id); }
