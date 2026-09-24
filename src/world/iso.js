// 2D 俯视坐标
//
// 文件名暂时保留，避免改动玩法模块的导入路径；投影已经改成真正的
// 正交网格：一个地图格就是一个屏幕方格，不再使用等距菱形。

export const TILE_W = 40;
export const TILE_H = 40;

/** 地图格坐标 → 屏幕世界坐标（格子中心） */
export function tileToScreen(tx, ty) {
  return {
    x: (tx + 0.5) * TILE_W,
    y: (ty + 0.5) * TILE_H,
  };
}

/** 屏幕世界坐标 → 地图格坐标 */
export function screenToTile(sx, sy) {
  return {
    tx: Math.floor(sx / TILE_W),
    ty: Math.floor(sy / TILE_H),
  };
}

/** 2D 俯视图按屏幕 y 排序，人物会自然站在建筑前面。 */
export function depthSort(items) {
  return [...items].sort((a, b) => a.ty - b.ty || a.tx - b.tx);
}
