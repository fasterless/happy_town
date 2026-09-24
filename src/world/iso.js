// 等距投影
//
// 地图用正方形瓦片，画面上画成扁菱形：
//   屏幕 x 由瓦片的列减行决定，y 由列加行决定。
// 深度排序就是按 tx + ty 从小到大画，北侧的东西先画，
// 走到物体南边时自然盖住它，北边时被它挡住。

export const TILE_W = 64;
export const TILE_H = 32;

/** 瓦片坐标 → 屏幕坐标（菱形中心） */
export function tileToScreen(tx, ty) {
  return {
    x: (tx - ty) * (TILE_W / 2),
    y: (tx + ty) * (TILE_H / 2),
  };
}

/** 屏幕坐标 → 瓦片坐标（四舍五入到最近的格子） */
export function screenToTile(sx, sy) {
  const tx = sx / TILE_W + sy / TILE_H;
  const ty = sy / TILE_H - sx / TILE_W;
  return { tx: Math.round(tx), ty: Math.round(ty) };
}

/** 绘制顺序：离镜头远的（tx + ty 小）先画 */
export function depthSort(items) {
  return [...items].sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
}
