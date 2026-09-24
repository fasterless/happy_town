// A* 寻路
//
// 地图只有几十格宽，四方向走就够。blocked(tx, ty) 由调用方给，
// 这样地图数据和寻路互不引用。

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function key(tx, ty) {
  return `${tx},${ty}`;
}

/**
 * 从起点走到终点的格子序列（含终点，不含起点）。
 * 走不通时返回空数组。
 * @param {{tx:number,ty:number}} start
 * @param {{tx:number,ty:number}} goal
 * @param {(tx:number,ty:number)=>boolean} blocked
 */
export function findPath(start, goal, blocked) {
  if (start.tx === goal.tx && start.ty === goal.ty) return [];
  if (blocked(goal.tx, goal.ty)) return [];

  const open = [{ tx: start.tx, ty: start.ty, g: 0 }];
  const cameFrom = new Map();
  const best = new Map([[key(start.tx, start.ty), 0]]);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    if (current.tx === goal.tx && current.ty === goal.ty) {
      return rebuild(cameFrom, goal);
    }
    for (const [dx, dy] of DIRS) {
      const nx = current.tx + dx;
      const ny = current.ty + dy;
      if (blocked(nx, ny)) continue;
      const g = current.g + 1;
      const id = key(nx, ny);
      if (g >= (best.get(id) ?? Infinity)) continue;
      best.set(id, g);
      cameFrom.set(id, { tx: current.tx, ty: current.ty });
      const h = Math.abs(nx - goal.tx) + Math.abs(ny - goal.ty);
      open.push({ tx: nx, ty: ny, g, f: g + h });
    }
  }
  return [];
}

function rebuild(cameFrom, goal) {
  const path = [{ tx: goal.tx, ty: goal.ty }];
  let cursor = key(goal.tx, goal.ty);
  while (cameFrom.has(cursor)) {
    const prev = cameFrom.get(cursor);
    cursor = key(prev.tx, prev.ty);
    if (!cameFrom.has(cursor)) break;
    path.push(prev);
  }
  path.reverse();
  return path;
}
