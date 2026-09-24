// 小镇地图
//
// 32×32 的手写布局。字符表见 TILES，建筑与交互点用格子坐标登记，
// 不单独占一层数据。所有「能走过去做的事」都挂在交互点上。

export const MAP_SIZE = 32;

// 字符 → 地面类型。water 与 wall 不能走。
const TILES = {
  '.': 'grass',
  ',': 'path',
  '~': 'water',
  '#': 'wall',
  'f': 'farm',
  'g': 'greenhouse',
  's': 'sand',
  'm': 'rock',
  't': 'forest',
};

// 行是 ty，列是 tx。中间一条十字路，北面店铺，南面农田，
// 东边湖，东北后山，西边温室。
const ROWS = [
  '################################',
  '#..m.m.m.m.m........m.m.m.m....#',
  '#.mmmmmmmmm........mmmmmmm.....#',
  '#.mmmmmmmmm..,,,,..mmmmmmm.....#',
  '#..m.m.m.m...,,,,...m.m.m......#',
  '#.............,,..............g#',
  '#..BB.........|,............ggg#',
  '#..BB.........|.............ggg#',
  '#.............|.............ggg#',
  '#..FF.........+...............g#',
  '#..FF.........|,...............#',
  '#.............|................#',
  '#..WW.........|.......tttttt...#',
  '#..WW....,,,,,+,~~~~..tttttt...#',
  '#........,,,,,|~~~~~~.tttttt...#',
  '#.............|~~~~~~.tttttt...#',
  '#.............|~~~~~~.tttttt...#',
  '#.............|...~~~~.tttttt..#',
  '#.............|........tttttt..#',
  '#......,,,,,,,,,,,,,...........#',
  '#.............|................#',
  '#..fffffffff..|................#',
  '#..fffffffff..|................#',
  '#..fffffffff..|................#',
  '#..fffffffff..|................#',
  '#.............|................#',
  '#.............|................#',
  '#.............|................#',
  '#.............|................#',
  '#.............P................#',
  '#.............|................#',
  '################################',
];

// 路标字符也是路。
const PATH_CHARS = new Set([',', '|', '+', 'P']);

function groundAt(tx, ty) {
  const row = ROWS[ty] || '';
  const ch = row[tx] || '#';
  if (PATH_CHARS.has(ch)) return 'path';
  if (ch === 'B' || ch === 'F' || ch === 'W') return 'floor';
  return TILES[ch] || 'grass';
}

/** 不能走的格子：地图外、墙、水，以及建筑占地 */
export function isBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) return true;
  const ground = groundAt(tx, ty);
  if (ground === 'wall' || ground === 'water') return true;
  return BUILDINGS.some((b) => tx >= b.tx && tx < b.tx + b.w && ty >= b.ty && ty < b.ty + b.h);
}

// 建筑占地（不能走），门口一格是交互点。
export const BUILDINGS = [
  { id: 'bakery', name: '面包店', tx: 3, ty: 6, w: 2, h: 2, color: '#c9844a', roof: '#a8503a' },
  { id: 'florist', name: '花店', tx: 3, ty: 9, w: 2, h: 2, color: '#d98ab0', roof: '#8f4d73' },
  { id: 'workshop', name: '木工坊', tx: 3, ty: 12, w: 2, h: 2, color: '#b08968', roof: '#6b4f3a' },
  { id: 'forestCabin', name: '林间小屋', tx: 25, ty: 11, w: 2, h: 2, color: '#a77b55', roof: '#5a4639' },
  { id: 'cafe', name: '咖啡馆', tx: 15, ty: 6, w: 3, h: 2, color: '#d7b899', roof: '#7a5a3a' },
  { id: 'craft', name: '加工坊', tx: 20, ty: 6, w: 3, h: 2, color: '#d9c89a', roof: '#8a7040' },
  { id: 'kitchen', name: '料理铺', tx: 24, ty: 6, w: 3, h: 2, color: '#e0b090', roof: '#a85a3a' },
];

// 交互点：走到相邻格按键触发。
export const SPOTS = [
  { id: 'stall', name: '货摊', kind: 'sell', tx: 14, ty: 29, icon: '🧺' },
  { id: 'fountain', name: '喷泉', kind: 'talk', tx: 14, ty: 9, icon: '⛲' },
  { id: 'noticeBoard', name: '公告栏', kind: 'board', tx: 17, ty: 9, icon: '📌' },
  { id: 'pier', name: '湖畔', kind: 'fish', tx: 14, ty: 15, icon: '🎣' },
  { id: 'mine', name: '后山矿洞', kind: 'mine', tx: 12, ty: 3, icon: '⛏️' },
  { id: 'lookout', name: '风车坡', kind: 'lookout', tx: 26, ty: 4, icon: '🌬️' },
  { id: 'forestEdge', name: '萤火林', kind: 'forage', tx: 28, ty: 16, icon: '🌿' },
  { id: 'cafeDoor', name: '咖啡馆', kind: 'cafe', tx: 16, ty: 8, icon: '☕' },
  { id: 'craftDoor', name: '加工坊', kind: 'craft', tx: 21, ty: 8, icon: '🥖' },
  { id: 'kitchenDoor', name: '料理铺', kind: 'cook', tx: 25, ty: 8, icon: '🍳' },
  { id: 'bakeryDoor', name: '面包店', kind: 'npc', tx: 4, ty: 8, npc: 'npc_baker', icon: '🍞' },
  { id: 'floristDoor', name: '花店', kind: 'npc', tx: 4, ty: 11, npc: 'npc_florist', icon: '🌷' },
  { id: 'workshopDoor', name: '木工坊', kind: 'npc', tx: 4, ty: 14, npc: 'npc_carpenter', icon: '🪑' },
];

// 农田 12 块、温室 6 块，按地图扫描出来，顺序稳定。
function collect(ground) {
  const plots = [];
  for (let ty = 0; ty < MAP_SIZE; ty += 1) {
    for (let tx = 0; tx < MAP_SIZE; tx += 1) {
      if (groundAt(tx, ty) === ground) plots.push({ tx, ty });
    }
  }
  return plots;
}

export const FARM_PLOTS = collect('farm').slice(0, 12);
export const GREENHOUSE_PLOTS = collect('greenhouse').slice(0, 6);

/** 整张地面，渲染时逐格取 */
export function getGround(tx, ty) {
  return groundAt(tx, ty);
}

/** 玩家出生点：广场南边的路口 */
export const SPAWN = { tx: 14, ty: 27 };

/** 与某格相邻（含自身） */
export function isAdjacent(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by) <= 1;
}
