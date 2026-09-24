// 小镇地图
//
// 32×32 的俯视地图。字符只描述地面，建筑与可互动地标登记在下面，
// 这样寻路、渲染和玩法仍然可以各自复用同一份地图数据。

export const MAP_SIZE = 32;

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
  'p': 'plaza',
};

function makeMap() {
  const grid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill('.'));
  const fill = (tx0, ty0, tx1, ty1, char) => {
    for (let ty = ty0; ty <= ty1; ty += 1) {
      for (let tx = tx0; tx <= tx1; tx += 1) grid[ty][tx] = char;
    }
  };
  const line = (tx0, ty0, tx1, ty1, char) => {
    if (tx0 === tx1) {
      for (let ty = ty0; ty <= ty1; ty += 1) grid[ty][tx0] = char;
    } else {
      for (let tx = tx0; tx <= tx1; tx += 1) grid[ty0][tx] = char;
    }
  };

  // Stone boundary keeps the village silhouette clear.
  for (let i = 0; i < MAP_SIZE; i += 1) {
    grid[0][i] = '#';
    grid[MAP_SIZE - 1][i] = '#';
    grid[i][0] = '#';
    grid[i][MAP_SIZE - 1] = '#';
  }

  // Northern ridges and mine approach.
  fill(2, 2, 10, 4, 'm');
  fill(19, 2, 23, 4, 'm');
  line(1, 5, 11, 5, ',');
  line(18, 5, 24, 5, ',');

  // East lake with a sandy shore.
  fill(22, 11, 27, 18, '~');
  fill(21, 10, 28, 10, 's');
  fill(21, 19, 28, 19, 's');
  fill(21, 11, 21, 18, 's');
  fill(28, 11, 28, 18, 's');

  // Firefly grove with a few walkable clearings.
  fill(26, 2, 30, 9, 't');
  fill(28, 11, 30, 20, 't');
  grid[8][27] = '.';
  grid[9][28] = '.';
  grid[12][29] = '.';
  grid[16][28] = '.';

  // Farm and greenhouse: exactly 12 and 6 usable plots.
  fill(3, 22, 8, 23, 'f');
  fill(25, 22, 27, 23, 'g');

  // Main roads, central square and neighborhood branches.
  line(15, 1, 15, 30, ',');
  line(16, 1, 16, 30, ',');
  line(1, 15, 30, 15, ',');
  line(1, 16, 30, 16, ',');
  fill(11, 12, 20, 19, 'p');
  line(1, 9, 30, 9, ',');
  line(9, 21, 20, 21, ',');
  line(9, 24, 20, 24, ',');
  line(10, 5, 10, 9, ',');
  line(24, 5, 24, 10, ',');
  line(20, 20, 20, 24, ',');
  line(21, 20, 21, 24, ',');

  // Paved forecourts tie the shop fronts into the street grid.
  fill(2, 6, 5, 8, 'p');
  fill(2, 10, 5, 12, 'p');
  fill(2, 14, 5, 16, 'p');
  fill(11, 6, 14, 8, 'p');
  fill(17, 6, 20, 8, 'p');
  fill(23, 6, 26, 8, 'p');
  fill(27, 6, 29, 8, 'p');

  return grid.map((row) => row.join(''));
}

export const ROWS = makeMap();

const PATH_CHARS = new Set([',', 'p']);

function groundAt(tx, ty) {
  const row = ROWS[ty] || '';
  const ch = row[tx] || '#';
  if (PATH_CHARS.has(ch)) return ch === 'p' ? 'plaza' : 'path';
  return TILES[ch] || 'grass';
}

/** Unwalkable: outside the map, lake water, and building footprints. */
export function isBlocked(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_SIZE || ty >= MAP_SIZE) return true;
  const ground = groundAt(tx, ty);
  if (ground === 'wall' || ground === 'water') return true;
  return BUILDINGS.some((building) => (
    tx >= building.tx
    && tx < building.tx + building.w
    && ty >= building.ty
    && ty < building.ty + building.h
  ));
}

export const BUILDINGS = [
  { id: 'bakery', name: '面包店', tx: 2, ty: 6, w: 4, h: 3, color: '#d58a52', roof: '#b65345', trim: '#f6cf8b' },
  { id: 'florist', name: '花店', tx: 2, ty: 10, w: 4, h: 3, color: '#db8bb2', roof: '#934e80', trim: '#f5c7df' },
  { id: 'workshop', name: '木工坊', tx: 2, ty: 14, w: 4, h: 3, color: '#b98861', roof: '#654b42', trim: '#e5bd77' },
  { id: 'cafe', name: '咖啡馆', tx: 11, ty: 6, w: 4, h: 3, color: '#d7b892', roof: '#7b523c', trim: '#f4d6a3' },
  { id: 'craft', name: '加工坊', tx: 17, ty: 6, w: 4, h: 3, color: '#dbc88e', roof: '#896d3f', trim: '#f6e5b6' },
  { id: 'kitchen', name: '料理铺', tx: 23, ty: 6, w: 4, h: 3, color: '#e1a282', roof: '#a55142', trim: '#ffdbb0' },
  { id: 'forestCabin', name: '林间小屋', tx: 27, ty: 6, w: 3, h: 3, color: '#a77b55', roof: '#5a4639', trim: '#e5bb73' },
];

// 交互点：走到相邻格按键触发。
export const SPOTS = [
  { id: 'stall', name: '货摊', kind: 'sell', tx: 14, ty: 28, icon: '🧺' },
  { id: 'fountain', name: '许愿喷泉', kind: 'wish', tx: 13, ty: 15, icon: '⛲' },
  { id: 'noticeBoard', name: '公告栏', kind: 'board', tx: 18, ty: 12, icon: '📌' },
  { id: 'pier', name: '湖畔', kind: 'fish', tx: 21, ty: 15, icon: '🎣' },
  { id: 'mine', name: '后山矿洞', kind: 'mine', tx: 12, ty: 4, icon: '⛏️' },
  { id: 'lookout', name: '风车坡', kind: 'lookout', tx: 25, ty: 4, icon: '🌬️' },
  { id: 'forestEdge', name: '萤火林', kind: 'forage', tx: 29, ty: 17, icon: '🌿' },
  { id: 'cafeDoor', name: '咖啡馆', kind: 'cafe', tx: 13, ty: 9, icon: '☕' },
  { id: 'craftDoor', name: '加工坊', kind: 'craft', tx: 19, ty: 9, icon: '🥖' },
  { id: 'kitchenDoor', name: '料理铺', kind: 'cook', tx: 25, ty: 9, icon: '🍳' },
  { id: 'bakeryDoor', name: '面包店', kind: 'npc', tx: 6, ty: 8, npc: 'npc_baker', icon: '🍞' },
  { id: 'floristDoor', name: '花店', kind: 'npc', tx: 6, ty: 12, npc: 'npc_florist', icon: '🌷' },
  { id: 'workshopDoor', name: '木工坊', kind: 'npc', tx: 6, ty: 16, npc: 'npc_carpenter', icon: '🪑' },
];

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

/** 整张地面，渲染时逐格取。 */
export function getGround(tx, ty) {
  return groundAt(tx, ty);
}

/** 玩家出生点：广场南边的主路上，进城就能看见店铺。 */
export const SPAWN = { tx: 15, ty: 22 };

// 地图装饰物：纯渲染、不参与寻路与阻挡，用来把小镇点缀得更有生活气息。
// type 决定外观（见 renderer.js 的 drawProp），tx/ty 是所在格；都放在草地上。
export const PROPS = [
  // 南边主路两侧的小公园：长椅、花圃、灌木、路牌
  { type: 'signpost', tx: 13, ty: 25 }, { type: 'signpost', tx: 17, ty: 25 },
  { type: 'flowerbed', tx: 10, ty: 25 }, { type: 'bench', tx: 11, ty: 26 }, { type: 'shrub', tx: 9, ty: 27 },
  { type: 'flowerbed', tx: 12, ty: 27 },
  { type: 'flowerbed', tx: 20, ty: 25 }, { type: 'bench', tx: 19, ty: 26 }, { type: 'shrub', tx: 21, ty: 27 },
  { type: 'flowerbed', tx: 18, ty: 27 },
  { type: 'shrub', tx: 8, ty: 29 }, { type: 'flowerbed', tx: 22, ty: 29 },
  { type: 'shrub', tx: 5, ty: 30 }, { type: 'shrub', tx: 25, ty: 30 },
  // 农田旁的农家小院：稻草人、木箱、木桶、花圃
  { type: 'scarecrow', tx: 8, ty: 24 }, { type: 'crate', tx: 2, ty: 22 }, { type: 'barrel', tx: 2, ty: 24 },
  { type: 'flowerbed', tx: 3, ty: 25 }, { type: 'shrub', tx: 7, ty: 25 },
  // 温室旁的花架与灌木
  { type: 'pot', tx: 23, ty: 22 }, { type: 'pot', tx: 27, ty: 24 }, { type: 'shrub', tx: 28, ty: 25 },
  // 西边店铺门口的盆栽
  { type: 'pot', tx: 8, ty: 7 }, { type: 'pot', tx: 8, ty: 11 }, { type: 'pot', tx: 8, ty: 14 },
  // 北边加工区的木桶木箱
  { type: 'barrel', tx: 10, ty: 10 }, { type: 'barrel', tx: 17, ty: 10 }, { type: 'crate', tx: 18, ty: 10 },
];

// 装饰路灯：只用于渲染，夜里会亮起暖黄的灯光，不参与寻路与阻挡。
export const LAMPS = [
  { tx: 11, ty: 12 }, { tx: 20, ty: 12 }, { tx: 11, ty: 19 }, { tx: 20, ty: 19 },
  { tx: 9, ty: 9 }, { tx: 22, ty: 9 }, { tx: 15, ty: 25 }, { tx: 16, ty: 25 },
];

/** 与某格相邻（含自身）。 */
export function isAdjacent(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by) <= 1;
}
